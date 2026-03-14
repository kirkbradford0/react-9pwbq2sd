import { supabaseAdmin } from "@/lib/supabase";
import type { ConfirmEvidenceRequest, EvidenceFile } from "@/types";

// ============================================================
// GENERATE SIGNED UPLOAD URL
// ============================================================
export async function generateUploadUrl(
  userId: string,
  activityId: string,
  filename: string
): Promise<{ uploadUrl: string; storagePath: string }> {
  const ext = filename.split(".").pop() ?? "bin";
  const storagePath = `${userId}/activities/${activityId}/${Date.now()}.${ext}`;

  const { data, error } = await supabaseAdmin.storage
    .from("evidence-files")
    .createSignedUploadUrl(storagePath);

  if (error) throw new Error(error.message);

  return {
    uploadUrl: data.signedUrl,
    storagePath,
  };
}

// ============================================================
// CONFIRM UPLOAD — register file after client-side PUT
// ============================================================
export async function confirmEvidenceUpload(
  userId: string,
  activityId: string,
  data: ConfirmEvidenceRequest
): Promise<EvidenceFile> {
  const { data: file, error } = await supabaseAdmin
    .from("evidence_files")
    .insert({
      user_id: userId,
      activity_entry_id: activityId,
      storage_path: data.storagePath,
      original_filename: data.originalFilename,
      mime_type: data.mimeType,
      file_size_bytes: data.fileSizeBytes,
      checksum_sha256: data.checksumSha256,
    })
    .select()
    .single();

  if (error) throw new Error(error.message);

  // Bump activity verification_status to documented if it was self_reported
  await supabaseAdmin
    .from("activity_entries")
    .update({
      verification_status: "documented",
      confidence_score: 60,
      source_type: "uploaded_document",
      updated_at: new Date().toISOString(),
    })
    .eq("id", activityId)
    .eq("user_id", userId)
    .eq("verification_status", "self_reported");

  return file as EvidenceFile;
}

// ============================================================
// GET EVIDENCE FOR ACTIVITIES
// ============================================================
export async function getEvidenceForActivities(
  activityIds: string[]
): Promise<EvidenceFile[]> {
  if (!activityIds.length) return [];

  const { data, error } = await supabaseAdmin
    .from("evidence_files")
    .select("*")
    .in("activity_entry_id", activityIds);

  if (error) throw new Error(error.message);
  return (data ?? []) as EvidenceFile[];
}

// ============================================================
// GET SIGNED DOWNLOAD URL
// ============================================================
export async function getEvidenceDownloadUrl(
  storagePath: string,
  expiresIn = 3600
): Promise<string> {
  const { data, error } = await supabaseAdmin.storage
    .from("evidence-files")
    .createSignedUrl(storagePath, expiresIn);

  if (error) throw new Error(error.message);
  return data.signedUrl;
}
