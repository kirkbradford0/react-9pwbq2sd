import { NextRequest, NextResponse } from "next/server";
import { supabaseAdmin } from "@/lib/supabase";

// GET /api/offender-checks — fetch verification history
// Optional query params: ?offender_id=XXX&limit=50
export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url);
  const filterById = searchParams.get("offender_id");
  const limit = Math.min(parseInt(searchParams.get("limit") ?? "200"), 500);

  let query = supabaseAdmin
    .from("offender_checks")
    .select("id, offender_id, found, status, checked_at, duration_ms")
    .order("checked_at", { ascending: false })
    .limit(limit);

  if (filterById) {
    query = query.eq("offender_id", filterById.trim());
  }

  const { data, error } = await query;

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  // Annotate re-entry events: NOT_FOUND → FOUND transition
  const annotated = annotateReentry(data ?? []);

  return NextResponse.json({ checks: annotated }, { status: 200 });
}

interface RawCheck {
  id: string;
  offender_id: string;
  found: boolean | null;
  status: string;
  checked_at: string;
  duration_ms: number | null;
}

interface AnnotatedCheck extends RawCheck {
  reentry: boolean;
}

/**
 * Walk through results (newest first) and flag any record where the status
 * flipped from not_found → found. These are the journalism signals.
 */
function annotateReentry(checks: RawCheck[]): AnnotatedCheck[] {
  // Group by offender_id, then sort each group oldest → newest
  const byId: Record<string, RawCheck[]> = {};
  for (const c of checks) {
    if (!byId[c.offender_id]) byId[c.offender_id] = [];
    byId[c.offender_id].push(c);
  }

  // Build a lookup: offender_id → Set of ids that are re-entries
  const reentryIds = new Set<string>();

  for (const id in byId) {
    const sorted = byId[id].slice().sort(
      (a, b) =>
        new Date(a.checked_at).getTime() - new Date(b.checked_at).getTime()
    );

    let prevWasNotFound = false;
    for (const check of sorted) {
      if (check.status === "not_found") {
        prevWasNotFound = true;
      } else if (check.status === "found" && prevWasNotFound) {
        reentryIds.add(check.id);
        prevWasNotFound = false;
      } else if (check.status === "found") {
        prevWasNotFound = false;
      }
    }
  }

  return checks.map((c) => ({ ...c, reentry: reentryIds.has(c.id) }));
}
