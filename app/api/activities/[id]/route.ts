import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";
import { updateActivity, deleteActivity } from "@/lib/activities";
import type { UpdateActivityRequest } from "@/types";

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

// PATCH /api/activities/:id
export async function PATCH(
  req: NextRequest,
  { params }: { params: { id: string } }
) {
  const { data: { user }, error: authError } = await getSupabaseUser(req);
  if (authError || !user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  let body: UpdateActivityRequest;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON" }, { status: 400 });
  }

  try {
    const updated = await updateActivity(user.id, params.id, body);
    return NextResponse.json(updated);
  } catch (err) {
    const message = err instanceof Error ? err.message : "Unknown error";
    const status = message.includes("locked") ? 409 : 500;
    return NextResponse.json({ error: message }, { status });
  }
}

// DELETE /api/activities/:id
export async function DELETE(
  req: NextRequest,
  { params }: { params: { id: string } }
) {
  const { data: { user }, error: authError } = await getSupabaseUser(req);
  if (authError || !user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    await deleteActivity(user.id, params.id);
    return NextResponse.json({ status: "deleted" });
  } catch (err) {
    const message = err instanceof Error ? err.message : "Unknown error";
    const status = message.includes("locked") ? 409 : 500;
    return NextResponse.json({ error: message }, { status });
  }
}
