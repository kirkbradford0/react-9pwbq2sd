import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";
import { generateUploadUrl } from "@/lib/evidence";

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

// POST /api/activities/:id/evidence/upload-url
export async function POST(
  req: NextRequest,
  { params }: { params: { id: string } }
) {
  const { data: { user }, error: authError } = await getSupabaseUser(req);
  if (authError || !user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const body = await req.json().catch(() => ({}));
  const filename: string = body.filename ?? "upload.bin";

  try {
    const result = await generateUploadUrl(user.id, params.id, filename);
    return NextResponse.json(result);
  } catch (err) {
    const message = err instanceof Error ? err.message : "Unknown error";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
