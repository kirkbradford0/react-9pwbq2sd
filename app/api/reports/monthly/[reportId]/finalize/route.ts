import crypto from "crypto";
import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";
import { supabaseAdmin } from "@/lib/supabase";

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

// POST /api/reports/monthly/:reportId/finalize
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

  if (["finalized", "signed", "archived"].includes(report.status)) {
    return NextResponse.json(
      { error: "Report is already finalized." },
      { status: 409 }
    );
  }

  // Recompute hash on current summary_json at moment of finalization
  const reportHash = crypto
    .createHash("sha256")
    .update(JSON.stringify(report.summary_json))
    .digest("hex");

  const { data: updated, error: updateError } = await supabaseAdmin
    .from("monthly_reports")
    .update({
      status: "finalized",
      report_hash: reportHash,
      finalized_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    })
    .eq("id", params.reportId)
    .select()
    .single();

  if (updateError) {
    return NextResponse.json({ error: updateError.message }, { status: 500 });
  }

  await supabaseAdmin.from("audit_logs").insert({
    user_id: user.id,
    entity_type: "monthly_report",
    entity_id: params.reportId,
    action_type: "finalized",
    actor_type: "user",
    new_value: { report_hash: reportHash },
  });

  return NextResponse.json({ status: "finalized", reportHash });
}
