import { NextRequest, NextResponse } from "next/server";
import { checkOffender } from "@/lib/checker";
import { supabaseAdmin } from "@/lib/supabase";

export const maxDuration = 60; // Vercel function timeout (seconds)

export async function POST(req: NextRequest) {
  let offender_id: string;

  try {
    const body = await req.json();
    offender_id = (body.offender_id ?? "").trim();
  } catch {
    return NextResponse.json({ error: "Invalid JSON body" }, { status: 400 });
  }

  if (!offender_id) {
    return NextResponse.json(
      { error: "offender_id is required" },
      { status: 400 }
    );
  }

  // Run the Playwright check
  const result = await checkOffender(offender_id);

  // Persist to Supabase
  const { error: dbError } = await supabaseAdmin
    .from("offender_checks")
    .insert({
      offender_id: result.offender_id,
      found: result.found,
      status: result.status,
      checked_at: result.checked_at,
      raw_response: result.raw_response,
      duration_ms: result.duration_ms,
    });

  if (dbError) {
    console.error("Supabase insert error:", dbError);
    // Still return the result even if DB write fails
    return NextResponse.json(
      { ...result, warning: "Result not saved to database" },
      { status: 207 }
    );
  }

  return NextResponse.json(result, { status: 200 });
}
