import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";
import { generateMonthlyReport } from "@/lib/reports/generator";
import type { GenerateReportRequest } from "@/types";

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

// POST /api/reports/monthly/generate
export async function POST(req: NextRequest) {
  const { data: { user }, error: authError } = await getSupabaseUser(req);
  if (authError || !user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  let body: GenerateReportRequest;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON" }, { status: 400 });
  }

  if (!body.month || !/^\d{4}-\d{2}$/.test(body.month)) {
    return NextResponse.json(
      { error: "month is required in YYYY-MM format" },
      { status: 400 }
    );
  }

  const [year, mo] = body.month.split("-").map(Number);
  const monthStart = `${year}-${String(mo).padStart(2, "0")}-01`;
  const lastDay = new Date(year, mo, 0).getDate();
  const monthEnd = `${year}-${String(mo).padStart(2, "0")}-${String(lastDay).padStart(2, "0")}`;

  try {
    const report = await generateMonthlyReport({
      userId: user.id,
      monthStart,
      monthEnd,
      recipientName: body.recipientName,
      recipientAgency: body.recipientAgency,
    });

    return NextResponse.json(
      { reportId: report.id, status: report.status },
      { status: 201 }
    );
  } catch (err) {
    const message = err instanceof Error ? err.message : "Unknown error";
    const status = message.includes("subscription") ? 403 : 500;
    return NextResponse.json({ error: message }, { status });
  }
}
