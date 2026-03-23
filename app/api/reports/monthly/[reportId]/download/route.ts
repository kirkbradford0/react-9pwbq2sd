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

// GET /api/reports/monthly/:reportId/download
export async function GET(
  req: NextRequest,
  { params }: { params: { reportId: string } }
) {
  const { data: { user }, error: authError } = await getSupabaseUser(req);
  if (authError || !user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { data: report, error: fetchError } = await supabaseAdmin
    .from("monthly_reports")
    .select("pdf_storage_path, status")
    .eq("id", params.reportId)
    .eq("user_id", user.id)
    .single();

  if (fetchError || !report) {
    return NextResponse.json({ error: "Report not found" }, { status: 404 });
  }

  if (!report.pdf_storage_path) {
    return NextResponse.json(
      { error: "PDF not yet rendered. Call /render-pdf first." },
      { status: 404 }
    );
  }

  // Signed URL valid for 15 minutes
  const { data, error: urlError } = await supabaseAdmin.storage
    .from("monthly-reports")
    .createSignedUrl(report.pdf_storage_path, 900);

  if (urlError) {
    return NextResponse.json({ error: urlError.message }, { status: 500 });
  }

  return NextResponse.json({ downloadUrl: data.signedUrl, expiresIn: 900 });
}
