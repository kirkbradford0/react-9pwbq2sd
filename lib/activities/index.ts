import { supabaseAdmin } from "@/lib/supabase";
import type {
  ActivityEntry,
  CreateActivityRequest,
  UpdateActivityRequest,
  VerificationStatus,
} from "@/types";

// ============================================================
// CONFIDENCE SCORE — derived from verification status
// ============================================================
const VERIFICATION_WEIGHTS: Record<VerificationStatus, number> = {
  missing: 0,
  self_reported: 25,
  documented: 60,
  partially_verified: 75,
  verified: 95,
};

export function deriveConfidenceScore(status: VerificationStatus): number {
  return VERIFICATION_WEIGHTS[status];
}

// ============================================================
// CREATE
// ============================================================
export async function createActivity(
  userId: string,
  data: CreateActivityRequest
): Promise<ActivityEntry> {
  const sourceType = data.sourceType ?? "self_reported";
  const verificationStatus =
    sourceType === "uploaded_document" ? "documented" : "self_reported";

  const { data: entry, error } = await supabaseAdmin
    .from("activity_entries")
    .insert({
      user_id: userId,
      occurred_at: data.occurredAt,
      category: data.category,
      subcategory: data.subcategory,
      title: data.title,
      description: data.description,
      source_type: sourceType,
      verification_status: verificationStatus,
      confidence_score: deriveConfidenceScore(verificationStatus),
      metadata: data.metadata ?? {},
    })
    .select()
    .single();

  if (error) throw new Error(error.message);
  return entry as ActivityEntry;
}

// ============================================================
// READ — month range
// ============================================================
export async function getActivitiesForMonth(
  userId: string,
  month: string // "YYYY-MM"
): Promise<ActivityEntry[]> {
  const [year, mo] = month.split("-").map(Number);
  const monthStart = new Date(year, mo - 1, 1).toISOString();
  const monthEnd = new Date(year, mo, 1).toISOString();

  const { data, error } = await supabaseAdmin
    .from("activity_entries")
    .select("*")
    .eq("user_id", userId)
    .is("deleted_at", null)
    .gte("occurred_at", monthStart)
    .lt("occurred_at", monthEnd)
    .order("occurred_at", { ascending: true });

  if (error) throw new Error(error.message);
  return (data ?? []) as ActivityEntry[];
}

// ============================================================
// READ — date range (for report generator)
// ============================================================
export async function getActivitiesForRange(
  userId: string,
  monthStart: string,
  monthEnd: string
): Promise<ActivityEntry[]> {
  const { data, error } = await supabaseAdmin
    .from("activity_entries")
    .select("*")
    .eq("user_id", userId)
    .eq("counts_toward_report", true)
    .is("deleted_at", null)
    .gte("occurred_at", monthStart)
    .lte("occurred_at", monthEnd)
    .order("occurred_at", { ascending: true });

  if (error) throw new Error(error.message);
  return (data ?? []) as ActivityEntry[];
}

// ============================================================
// UPDATE — blocked on finalized reports
// ============================================================
export async function updateActivity(
  userId: string,
  activityId: string,
  data: UpdateActivityRequest
): Promise<ActivityEntry> {
  // Block edits if activity is locked by a finalized report
  const locked = await isActivityLocked(activityId);
  if (locked) {
    throw new Error(
      "This activity is locked by a finalized report. Create a new report version to make changes."
    );
  }

  const updates: Record<string, unknown> = { updated_at: new Date().toISOString() };
  if (data.occurredAt !== undefined) updates.occurred_at = data.occurredAt;
  if (data.category !== undefined) updates.category = data.category;
  if (data.subcategory !== undefined) updates.subcategory = data.subcategory;
  if (data.title !== undefined) updates.title = data.title;
  if (data.description !== undefined) updates.description = data.description;
  if (data.verificationStatus !== undefined) {
    updates.verification_status = data.verificationStatus;
    updates.confidence_score = deriveConfidenceScore(data.verificationStatus);
  }
  if (data.countsTowardReport !== undefined)
    updates.counts_toward_report = data.countsTowardReport;
  if (data.isSensitive !== undefined) updates.is_sensitive = data.isSensitive;
  if (data.metadata !== undefined) updates.metadata = data.metadata;

  const { data: entry, error } = await supabaseAdmin
    .from("activity_entries")
    .update(updates)
    .eq("id", activityId)
    .eq("user_id", userId)
    .is("deleted_at", null)
    .select()
    .single();

  if (error) throw new Error(error.message);
  return entry as ActivityEntry;
}

// ============================================================
// SOFT DELETE
// ============================================================
export async function deleteActivity(
  userId: string,
  activityId: string
): Promise<void> {
  const locked = await isActivityLocked(activityId);
  if (locked) {
    throw new Error("Cannot delete an activity locked by a finalized report.");
  }

  const { error } = await supabaseAdmin
    .from("activity_entries")
    .update({ deleted_at: new Date().toISOString() })
    .eq("id", activityId)
    .eq("user_id", userId);

  if (error) throw new Error(error.message);
}

// ============================================================
// LOCK CHECK
// An activity is locked when it appears in a finalized/signed/archived report
// ============================================================
async function isActivityLocked(activityId: string): Promise<boolean> {
  const { data, error } = await supabaseAdmin
    .from("monthly_reports")
    .select("id")
    .in("status", ["finalized", "signed", "archived"])
    .contains("summary_json", { appendix: { notableEntries: [{ id: activityId }] } })
    .limit(1);

  // If the query errors or finds nothing, assume not locked
  if (error || !data?.length) return false;
  return true;
}
