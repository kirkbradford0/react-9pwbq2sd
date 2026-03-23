import crypto from "crypto";
import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";
import { supabaseAdmin } from "@/lib/supabase";
import type { SignReportRequest } from "@/types";

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

// POST /api/reports/monthly/:reportId/sign
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
    .select("id, status, report_hash, summary_json")
    .eq("id", params.reportId)
    .eq("user_id", user.id)
    .single();

  if (fetchError || !report) {
    return NextResponse.json({ error: "Report not found" }, { status: 404 });
  }

  if (report.status === "archived") {
    return NextResponse.json({ error: "Archived reports cannot be signed." }, { status: 409 });
  }

  if (!["finalized", "generated", "draft"].includes(report.status)) {
    return NextResponse.json({ error: "Report cannot be signed in its current state." }, { status: 409 });
  }

  let body: SignReportRequest;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON" }, { status: 400 });
  }

  if (!body.signerType || !body.signerName) {
    return NextResponse.json(
      { error: "signerType and signerName are required" },
      { status: 400 }
    );
  }

  // Signature hash = SHA-256 of reportHash + signerName + timestamp
  const signedAt = new Date().toISOString();
  const signatureHash = crypto
    .createHash("sha256")
    .update(`${report.report_hash}:${body.signerName}:${signedAt}`)
    .digest("hex");

  const { error: sigError } = await supabaseAdmin
    .from("report_signatures")
    .insert({
      monthly_report_id: params.reportId,
      signer_type: body.signerType,
      signer_name: body.signerName,
      signature_hash: signatureHash,
      signed_at: signedAt,
    });

  if (sigError) {
    return NextResponse.json({ error: sigError.message }, { status: 500 });
  }

  // Advance status to signed if user is signing
  if (body.signerType === "user") {
    await supabaseAdmin
      .from("monthly_reports")
      .update({ status: "signed", updated_at: new Date().toISOString() })
      .eq("id", params.reportId);
  }

  await supabaseAdmin.from("audit_logs").insert({
    user_id: user.id,
    entity_type: "monthly_report",
    entity_id: params.reportId,
    action_type: "signed",
    actor_type: "user",
    new_value: { signer_type: body.signerType, signer_name: body.signerName },
  });

  return NextResponse.json({ status: "signed", signatureHash });
}
