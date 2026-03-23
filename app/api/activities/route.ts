import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";
import {
  createActivity,
  getActivitiesForMonth,
} from "@/lib/activities";
import type { CreateActivityRequest } from "@/types";

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

// POST /api/activities
export async function POST(req: NextRequest) {
  const { data: { user }, error: authError } = await getSupabaseUser(req);
  if (authError || !user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  let body: CreateActivityRequest;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON" }, { status: 400 });
  }

  if (!body.occurredAt || !body.category || !body.subcategory || !body.title) {
    return NextResponse.json(
      { error: "occurredAt, category, subcategory, and title are required" },
      { status: 400 }
    );
  }

  try {
    const entry = await createActivity(user.id, body);
    return NextResponse.json({ id: entry.id, status: "created" }, { status: 201 });
  } catch (err) {
    const message = err instanceof Error ? err.message : "Unknown error";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}

// GET /api/activities?month=YYYY-MM
export async function GET(req: NextRequest) {
  const { data: { user }, error: authError } = await getSupabaseUser(req);
  if (authError || !user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const month = req.nextUrl.searchParams.get("month");
  if (!month || !/^\d{4}-\d{2}$/.test(month)) {
    return NextResponse.json(
      { error: "month query param required in YYYY-MM format" },
      { status: 400 }
    );
  }

  try {
    const activities = await getActivitiesForMonth(user.id, month);
    return NextResponse.json(activities);
  } catch (err) {
    const message = err instanceof Error ? err.message : "Unknown error";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
