import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";
import { supabaseAdmin } from "@/lib/supabase";
import type { UpdateSectionRequest } from "@/types";

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

// PATCH /api/reports/monthly/:reportId/sections/:sectionId
export async function PATCH(
  req: NextRequest,
  { params }: { params: { reportId: string; sectionId: string } }
) {
  const { data: { user }, error: authError } = await getSupabaseUser(req);
  if (authError || !user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  // Confirm report belongs to user and is still editable
  const { data: report, error: reportError } = await supabaseAdmin
    .from("monthly_reports")
    .select("id, status")
    .eq("id", params.reportId)
    .eq("user_id", user.id)
    .single();

  if (reportError || !report) {
    return NextResponse.json({ error: "Report not found" }, { status: 404 });
  }

  if (["finalized", "signed", "archived"].includes(report.status)) {
    return NextResponse.json(
      { error: "Report is locked and cannot be edited." },
      { status: 409 }
    );
  }

  let body: UpdateSectionRequest;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON" }, { status: 400 });
  }

  if (!body.sectionText) {
    return NextResponse.json({ error: "sectionText is required" }, { status: 400 });
  }

  const { data: section, error: sectionError } = await supabaseAdmin
    .from("monthly_report_sections")
    .update({ section_text: body.sectionText })
    .eq("id", params.sectionId)
    .eq("monthly_report_id", params.reportId)
    .select()
    .single();

  if (sectionError || !section) {
    return NextResponse.json({ error: "Section not found" }, { status: 404 });
  }

  return NextResponse.json(section);
}
