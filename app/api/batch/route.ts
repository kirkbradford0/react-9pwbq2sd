import { NextRequest, NextResponse } from "next/server";
import { checkOffender, delay } from "@/lib/checker";
import { supabaseAdmin } from "@/lib/supabase";

export const maxDuration = 300; // 5 min for batch runs

const DELAY_BETWEEN_CHECKS_MS = 7_000; // 7 seconds between checks

export async function POST(req: NextRequest) {
  let offender_ids: string[];

  try {
    const body = await req.json();
    offender_ids = Array.isArray(body.offender_ids) ? body.offender_ids : [];
  } catch {
    return NextResponse.json({ error: "Invalid JSON body" }, { status: 400 });
  }

  // Clean and deduplicate
  offender_ids = [
    ...new Set(
      offender_ids
        .map((id: unknown) => String(id).trim())
        .filter((id) => id.length > 0)
    ),
  ];

  if (offender_ids.length === 0) {
    return NextResponse.json(
      { error: "offender_ids must be a non-empty array of strings" },
      { status: 400 }
    );
  }

  if (offender_ids.length > 100) {
    return NextResponse.json(
      { error: "Maximum 100 IDs per batch request" },
      { status: 400 }
    );
  }

  const results = [];
  const errors = [];

  for (let i = 0; i < offender_ids.length; i++) {
    const offender_id = offender_ids[i];

    // Delay between requests (skip on first)
    if (i > 0) {
      await delay(DELAY_BETWEEN_CHECKS_MS);
    }

    const result = await checkOffender(offender_id);

    // Persist each result immediately
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
      console.error(`DB error for ${offender_id}:`, dbError);
      errors.push({ offender_id, error: dbError.message });
    }

    results.push(result);
  }

  return NextResponse.json(
    {
      total: offender_ids.length,
      results,
      errors: errors.length > 0 ? errors : undefined,
    },
    { status: 200 }
  );
}
