import crypto from "crypto";
import { supabaseAdmin } from "@/lib/supabase";
import { getActivitiesForRange } from "@/lib/activities";
import { getEvidenceForActivities } from "@/lib/evidence";
import {
  groupActivitiesBySection,
  sortedSectionKeys,
  buildSectionNarrative,
  REPORT_SECTION_MAP,
  SECTION_KEY_MAP,
} from "@/lib/reports/sections";
import { computeSectionConfidence } from "@/lib/reports/confidence";
import type {
  ActivityEntry,
  EvidenceFile,
  MonthlyReport,
  MonthlyReportSummaryJson,
  VerificationStatus,
} from "@/types";

// ============================================================
// HELPERS
// ============================================================
function formatMonthLabel(monthStart: string): string {
  const date = new Date(monthStart + "T00:00:00Z");
  return date.toLocaleDateString("en-US", {
    month: "long",
    year: "numeric",
    timeZone: "UTC",
  });
}

function getPreviousMonthRange(timezone: string): {
  monthStart: string;
  monthEnd: string;
} {
  const now = new Date(
    new Date().toLocaleString("en-US", { timeZone: timezone })
  );
  const firstOfThisMonth = new Date(now.getFullYear(), now.getMonth(), 1);
  const firstOfLastMonth = new Date(
    firstOfThisMonth.getFullYear(),
    firstOfThisMonth.getMonth() - 1,
    1
  );
  const lastOfLastMonth = new Date(
    firstOfThisMonth.getFullYear(),
    firstOfThisMonth.getMonth(),
    0
  );

  return {
    monthStart: firstOfLastMonth.toISOString().split("T")[0],
    monthEnd: lastOfLastMonth.toISOString().split("T")[0],
  };
}

export { getPreviousMonthRange };

function buildMetrics(
  activities: ActivityEntry[],
  evidenceFiles: EvidenceFile[]
) {
  return {
    totalEntries: activities.length,
    verifiedEntries: activities.filter((a) =>
      ["partially_verified", "verified"].includes(a.verification_status)
    ).length,
    documentedEntries: activities.filter(
      (a) => a.verification_status === "documented"
    ).length,
    selfReportedEntries: activities.filter(
      (a) => a.verification_status === "self_reported"
    ).length,
    evidenceFiles: evidenceFiles.length,
  };
}

// ============================================================
// MAIN GENERATOR
// ============================================================
export async function generateMonthlyReport(params: {
  userId: string;
  monthStart: string;
  monthEnd: string;
  recipientName?: string;
  recipientAgency?: string;
}): Promise<MonthlyReport> {
  const { userId, monthStart, monthEnd, recipientName, recipientAgency } =
    params;

  // 1. Verify user is Pro
  const { data: profile, error: profileError } = await supabaseAdmin
    .from("profiles")
    .select("full_name, subscription_plan")
    .eq("id", userId)
    .single();

  if (profileError) throw new Error(profileError.message);
  if (profile.subscription_plan === "free") {
    throw new Error(
      "Monthly report generation requires a Pro or Partner subscription."
    );
  }

  // 2. Fetch activities and evidence
  const activities = await getActivitiesForRange(
    userId,
    monthStart + "T00:00:00Z",
    monthEnd + "T23:59:59Z"
  );
  const evidenceFiles = await getEvidenceForActivities(
    activities.map((a) => a.id)
  );

  // 3. Group and build sections
  const grouped = groupActivitiesBySection(activities);
  const evidenceByActivity = new Map<string, number>();
  for (const ef of evidenceFiles) {
    if (ef.activity_entry_id) {
      evidenceByActivity.set(
        ef.activity_entry_id,
        (evidenceByActivity.get(ef.activity_entry_id) ?? 0) + 1
      );
    }
  }

  const orderedKeys = sortedSectionKeys(Object.keys(grouped));

  const sections = orderedKeys.map((key, index) => {
    const entries = grouped[key];
    const evidenceCount = entries.reduce(
      (sum, e) => sum + (evidenceByActivity.get(e.id) ?? 0),
      0
    );
    const confidenceScore = computeSectionConfidence(entries);
    const sectionKey =
      SECTION_KEY_MAP[entries[0]?.category] ?? key;

    return {
      key: sectionKey,
      title:
        REPORT_SECTION_MAP[entries[0]?.category] ??
        "Additional Notes",
      sectionText: buildSectionNarrative(key, entries),
      evidenceCount,
      confidenceScore,
      sectionOrder: index + 1,
      entryCount: entries.length,
    };
  });

  // 4. Get reporting preferences
  const { data: reportingProfile } = await supabaseAdmin
    .from("monthly_reporting_profiles")
    .select("*")
    .eq("user_id", userId)
    .single();

  const includeAppendix =
    reportingProfile?.include_appendix !== false;

  // 5. Compose summary JSON
  const reportId = crypto.randomUUID();
  const summaryJson: MonthlyReportSummaryJson = {
    reportMeta: {
      reportId,
      reportVersion: 1,
      monthLabel: formatMonthLabel(monthStart),
      monthStart,
      monthEnd,
      generatedAt: new Date().toISOString(),
      status: "generated",
    },
    recipient: {
      name:
        recipientName ??
        reportingProfile?.default_recipient_name ??
        undefined,
      agency:
        recipientAgency ??
        reportingProfile?.default_recipient_agency ??
        undefined,
    },
    user: {
      fullName: profile.full_name,
      userId,
    },
    metrics: buildMetrics(activities, evidenceFiles),
    sections: sections.map((s) => ({
      key: s.key,
      title: s.title,
      confidenceScore: s.confidenceScore,
      evidenceCount: s.evidenceCount,
      entryCount: s.entryCount,
      summary: s.sectionText,
    })),
    appendix: includeAppendix
      ? {
          includeAppendix: true,
          evidenceLegend: {
            verified: "Externally supported or confirmed",
            documented: "Supported by uploaded documentation",
            partially_verified:
              "Partially supported by documentation or other evidence",
            self_reported: "Entered by the participant",
            missing: "No documentation on file",
          },
          notableEntries: activities.slice(0, 20).map((a) => ({
            date: a.occurred_at.split("T")[0],
            category: a.category,
            title: a.title,
            verificationStatus: a.verification_status as VerificationStatus,
          })),
        }
      : undefined,
    attestation: {
      platformStatement:
        "This report was generated from records stored in Felon's Melon during the reporting period.",
      userStatement:
        "I affirm this report is true to the best of my knowledge.",
    },
  };

  // 6. Compute report hash
  const reportHash = crypto
    .createHash("sha256")
    .update(JSON.stringify(summaryJson))
    .digest("hex");

  // 7. Determine next version number
  const { data: existingReports } = await supabaseAdmin
    .from("monthly_reports")
    .select("report_version")
    .eq("user_id", userId)
    .eq("month_start", monthStart)
    .eq("month_end", monthEnd)
    .order("report_version", { ascending: false })
    .limit(1);

  const nextVersion =
    existingReports?.length ? existingReports[0].report_version + 1 : 1;

  // 8. Save report record
  const { data: report, error: reportError } = await supabaseAdmin
    .from("monthly_reports")
    .insert({
      user_id: userId,
      month_start: monthStart,
      month_end: monthEnd,
      status: "generated",
      report_version: nextVersion,
      recipient_name: recipientName,
      recipient_agency: recipientAgency,
      summary_json: summaryJson,
      report_hash: reportHash,
      generated_at: new Date().toISOString(),
    })
    .select()
    .single();

  if (reportError) throw new Error(reportError.message);

  // 9. Save section rows
  if (sections.length) {
    const { error: sectionsError } = await supabaseAdmin
      .from("monthly_report_sections")
      .insert(
        sections.map((s) => ({
          monthly_report_id: report.id,
          section_key: s.key,
          section_title: s.title,
          section_text: s.sectionText,
          evidence_count: s.evidenceCount,
          confidence_score: s.confidenceScore,
          section_order: s.sectionOrder,
        }))
      );

    if (sectionsError) throw new Error(sectionsError.message);
  }

  // 10. Audit log
  await supabaseAdmin.from("audit_logs").insert({
    user_id: userId,
    entity_type: "monthly_report",
    entity_id: report.id,
    action_type: "generated",
    actor_type: "system",
    new_value: { report_version: nextVersion, month_start: monthStart },
  });

  return report as MonthlyReport;
}

// ============================================================
// AUTO-GENERATE FOR PRO USERS (cron job)
// ============================================================
export async function autoGenerateMonthlyReports(): Promise<void> {
  const { data: users, error } = await supabaseAdmin
    .from("profiles")
    .select("id, timezone")
    .in("subscription_plan", ["pro", "partner"]);

  if (error) throw new Error(error.message);

  const { data: reportingProfiles } = await supabaseAdmin
    .from("monthly_reporting_profiles")
    .select("user_id")
    .eq("auto_generate_monthly", true);

  const autoUserIds = new Set(
    (reportingProfiles ?? []).map((p) => p.user_id)
  );

  for (const user of users ?? []) {
    if (!autoUserIds.has(user.id)) continue;

    const { monthStart, monthEnd } = getPreviousMonthRange(
      user.timezone ?? "America/Denver"
    );

    try {
      await generateMonthlyReport({
        userId: user.id,
        monthStart,
        monthEnd,
      });
    } catch (err) {
      // Log and continue — don't let one failure block others
      console.error(`Auto-generate failed for user ${user.id}:`, err);
    }
  }
}
