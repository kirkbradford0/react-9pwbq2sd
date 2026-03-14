import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";
import { supabaseAdmin } from "@/lib/supabase";
import type { MonthlyReportSummaryJson } from "@/types";

function getSupabaseUser(req: NextRequest) {
  const supabase = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      global: {
        headers: { Authorization: req.headers.get("Authorization") ?? "" },
      },
    }
  );
  return supabase.auth.getUser();
}

// POST /api/reports/monthly/:reportId/render-pdf
// Renders HTML → PDF via Puppeteer/Playwright and uploads to storage
export async function POST(
  req: NextRequest,
  { params }: { params: { reportId: string } }
) {
  const { data: { user }, error: authError } = await getSupabaseUser(req);
  if (authError || !user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { data: report, error: fetchError } = await supabaseAdmin
    .from("monthly_reports")
    .select("*")
    .eq("id", params.reportId)
    .eq("user_id", user.id)
    .single();

  if (fetchError || !report) {
    return NextResponse.json({ error: "Report not found" }, { status: 404 });
  }

  const summary = report.summary_json as MonthlyReportSummaryJson;
  const html = buildReportHtml(summary, report.report_hash);

  // PDF rendering via Puppeteer (install: npm i puppeteer)
  // For Playwright: npm i playwright-chromium
  let pdfBuffer: Buffer;
  try {
    const puppeteer = await import("puppeteer");
    const browser = await puppeteer.default.launch({ args: ["--no-sandbox"] });
    const page = await browser.newPage();
    await page.setContent(html, { waitUntil: "networkidle0" });
    pdfBuffer = await page.pdf({ format: "Letter", printBackground: true });
    await browser.close();
  } catch {
    return NextResponse.json(
      { error: "PDF renderer not available. Install puppeteer: npm i puppeteer" },
      { status: 501 }
    );
  }

  // Upload PDF to storage
  const [year, month] = summary.reportMeta.monthStart.split("-");
  const storagePath = `${user.id}/${year}/${month}/report-${params.reportId}.pdf`;

  const { error: uploadError } = await supabaseAdmin.storage
    .from("monthly-reports")
    .upload(storagePath, pdfBuffer, {
      contentType: "application/pdf",
      upsert: true,
    });

  if (uploadError) {
    return NextResponse.json({ error: uploadError.message }, { status: 500 });
  }

  await supabaseAdmin
    .from("monthly_reports")
    .update({
      pdf_storage_path: storagePath,
      updated_at: new Date().toISOString(),
    })
    .eq("id", params.reportId);

  return NextResponse.json({ status: "rendered", storagePath });
}

// ============================================================
// HTML TEMPLATE
// Clean, agency-readable. No fonts to load — system safe.
// ============================================================
function buildReportHtml(
  summary: MonthlyReportSummaryJson,
  reportHash?: string
): string {
  const recipient = summary.recipient.name
    ? `${summary.recipient.name}${summary.recipient.agency ? `, ${summary.recipient.agency}` : ""}`
    : "To Whom It May Concern";

  const sectionsHtml = summary.sections
    .map(
      (s) => `
    <section class="report-section">
      <h2>${s.title}</h2>
      <p class="confidence">Confidence: ${s.confidenceScore}% &nbsp;|&nbsp; Entries: ${s.entryCount} &nbsp;|&nbsp; Documents: ${s.evidenceCount}</p>
      <p>${s.summary}</p>
    </section>`
    )
    .join("\n");

  const appendixHtml =
    summary.appendix?.includeAppendix && summary.appendix.notableEntries.length
      ? `
    <section class="appendix">
      <h2>Appendix — Notable Entries</h2>
      <table>
        <thead>
          <tr><th>Date</th><th>Category</th><th>Title</th><th>Verification</th></tr>
        </thead>
        <tbody>
          ${summary.appendix.notableEntries
            .map(
              (e) =>
                `<tr>
              <td>${e.date}</td>
              <td>${e.category}</td>
              <td>${e.title}</td>
              <td>${e.verificationStatus.replace("_", " ")}</td>
            </tr>`
            )
            .join("\n")}
        </tbody>
      </table>
    </section>`
      : "";

  return `<!DOCTYPE html>
<html lang="en">
<head>
<meta charset="UTF-8">
<style>
  body { font-family: Georgia, serif; font-size: 12pt; color: #111; margin: 2cm; }
  h1 { font-size: 16pt; margin-bottom: 4px; }
  h2 { font-size: 13pt; border-bottom: 1px solid #ccc; padding-bottom: 4px; margin-top: 24px; }
  .meta { color: #555; font-size: 10pt; margin-bottom: 16px; }
  .confidence { font-size: 10pt; color: #666; margin: 4px 0; }
  .attestation { margin-top: 32px; font-size: 10pt; border-top: 1px solid #ccc; padding-top: 12px; }
  .hash-footer { margin-top: 24px; font-size: 8pt; color: #999; font-family: monospace; }
  table { width: 100%; border-collapse: collapse; font-size: 10pt; }
  th, td { border: 1px solid #ccc; padding: 6px 8px; text-align: left; }
  th { background: #f4f4f4; }
  .report-section { margin-bottom: 20px; }
  .appendix { margin-top: 32px; }
</style>
</head>
<body>

<h1>Monthly Accountability Letter</h1>
<p class="meta">
  <strong>${summary.reportMeta.monthLabel}</strong><br>
  Prepared for: ${recipient}<br>
  Participant: ${summary.user.fullName}<br>
  Generated: ${new Date(summary.reportMeta.generatedAt).toLocaleDateString("en-US")}
</p>

<p>This letter summarizes activity records entered during <strong>${summary.reportMeta.monthLabel}</strong>.
A total of <strong>${summary.metrics.totalEntries}</strong> entries were recorded,
of which <strong>${summary.metrics.documentedEntries + summary.metrics.verifiedEntries}</strong> are supported by uploaded documentation or external verification.</p>

${sectionsHtml}

${appendixHtml}

<div class="attestation">
  <p><strong>Platform Statement:</strong> ${summary.attestation.platformStatement}</p>
  <p><strong>Participant Attestation:</strong> ${summary.attestation.userStatement}</p>
</div>

${reportHash ? `<p class="hash-footer">Report integrity hash (SHA-256): ${reportHash}</p>` : ""}

</body>
</html>`;
}
