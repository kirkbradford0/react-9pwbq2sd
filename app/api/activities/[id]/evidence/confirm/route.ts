import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";
import { confirmEvidenceUpload } from "@/lib/evidence";
import type { ConfirmEvidenceRequest } from "@/types";

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

// POST /api/activities/:id/evidence/confirm
export async function POST(
  req: NextRequest,
  { params }: { params: { id: string } }
) {
  const { data: { user }, error: authError } = await getSupabaseUser(req);
  if (authError || !user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  let body: ConfirmEvidenceRequest;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON" }, { status: 400 });
  }

  if (!body.storagePath || !body.checksumSha256) {
    return NextResponse.json(
      { error: "storagePath and checksumSha256 are required" },
      { status: 400 }
    );
  }

  try {
    const file = await confirmEvidenceUpload(user.id, params.id, body);
    return NextResponse.json({ id: file.id, status: "confirmed" }, { status: 201 });
  } catch (err) {
    const message = err instanceof Error ? err.message : "Unknown error";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
