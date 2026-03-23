// Felon's Melon Pro — Core TypeScript Types

// ============================================================
// ENUMS / UNIONS
// ============================================================

export type SubscriptionPlan = "free" | "pro" | "partner";

export type ActivityCategory =
  | "housing"
  | "employment"
  | "treatment"
  | "recovery"
  | "legal"
  | "financial"
  | "health"
  | "education"
  | "community"
  | "family"
  | "transportation"
  | "other";

export type SourceType =
  | "self_reported"
  | "uploaded_document"
  | "imported"
  | "verified_contact"
  | "system_generated";

export type VerificationStatus =
  | "missing"
  | "self_reported"
  | "documented"
  | "partially_verified"
  | "verified";

export type MonthlyReportStatus =
  | "draft"
  | "generated"
  | "finalized"
  | "signed"
  | "archived";

export type ReportTone = "neutral" | "supportive" | "strict";

export type SignatureMode = "user_only" | "platform_only" | "user_platform";

export type SignerType = "user" | "platform" | "case_manager" | "counselor";

export type ActorType = "user" | "system" | "admin";

// ============================================================
// DATABASE MODELS
// ============================================================

export interface Profile {
  id: string;
  full_name: string;
  preferred_name?: string;
  date_of_birth?: string;
  timezone: string;
  subscription_plan: SubscriptionPlan;
  created_at: string;
  updated_at: string;
}

export interface MonthlyReportingProfile {
  id: string;
  user_id: string;
  default_recipient_name?: string;
  default_recipient_agency?: string;
  report_tone: ReportTone;
  include_missed_items: boolean;
  include_self_reported_items: boolean;
  include_appendix: boolean;
  signature_mode: SignatureMode;
  auto_generate_monthly: boolean;
  created_at: string;
  updated_at: string;
}

export interface ActivityEntry {
  id: string;
  user_id: string;
  occurred_at: string;
  category: ActivityCategory;
  subcategory: string;
  title: string;
  description?: string;
  source_type: SourceType;
  verification_status: VerificationStatus;
  confidence_score: number;
  counts_toward_report: boolean;
  is_sensitive: boolean;
  metadata: Record<string, unknown>;
  deleted_at?: string;
  created_at: string;
  updated_at: string;
}

export interface EvidenceFile {
  id: string;
  user_id: string;
  activity_entry_id: string;
  storage_path: string;
  original_filename?: string;
  mime_type?: string;
  file_size_bytes?: number;
  extracted_text?: string;
  checksum_sha256: string;
  uploaded_at: string;
  created_at: string;
}

export interface MonthlyReport {
  id: string;
  user_id: string;
  month_start: string;
  month_end: string;
  status: MonthlyReportStatus;
  report_version: number;
  recipient_name?: string;
  recipient_agency?: string;
  summary_json: MonthlyReportSummaryJson;
  report_hash?: string;
  pdf_storage_path?: string;
  generated_at?: string;
  finalized_at?: string;
  archived_at?: string;
  created_at: string;
  updated_at: string;
}

export interface MonthlyReportSection {
  id: string;
  monthly_report_id: string;
  section_key: string;
  section_title: string;
  section_text: string;
  evidence_count: number;
  confidence_score: number;
  section_order: number;
  created_at: string;
}

export interface ReportSignature {
  id: string;
  monthly_report_id: string;
  signer_type: SignerType;
  signer_name: string;
  signature_hash: string;
  signed_at: string;
  metadata: Record<string, unknown>;
}

export interface AuditLog {
  id: string;
  user_id?: string;
  entity_type: string;
  entity_id: string;
  action_type: string;
  actor_type: ActorType;
  old_value?: Record<string, unknown>;
  new_value?: Record<string, unknown>;
  created_at: string;
}

// ============================================================
// REPORT JSON SHAPE
// Stored in monthly_reports.summary_json
// ============================================================

export interface MonthlyReportSummaryJson {
  reportMeta: {
    reportId: string;
    reportVersion: number;
    monthLabel: string;
    monthStart: string;
    monthEnd: string;
    generatedAt: string;
    status: MonthlyReportStatus;
  };
  recipient: {
    name?: string;
    agency?: string;
  };
  user: {
    fullName: string;
    userId: string;
  };
  metrics: {
    totalEntries: number;
    verifiedEntries: number;
    documentedEntries: number;
    selfReportedEntries: number;
    evidenceFiles: number;
  };
  sections: Array<{
    key: string;
    title: string;
    confidenceScore: number;
    evidenceCount: number;
    entryCount: number;
    summary: string;
  }>;
  appendix?: {
    includeAppendix: boolean;
    evidenceLegend: Record<string, string>;
    notableEntries: Array<{
      date: string;
      category: string;
      title: string;
      verificationStatus: VerificationStatus;
    }>;
  };
  attestation: {
    platformStatement: string;
    userStatement: string;
  };
}

// ============================================================
// API REQUEST / RESPONSE TYPES
// ============================================================

export interface CreateActivityRequest {
  occurredAt: string;
  category: ActivityCategory;
  subcategory: string;
  title: string;
  description?: string;
  sourceType?: SourceType;
  metadata?: Record<string, unknown>;
}

export interface UpdateActivityRequest {
  occurredAt?: string;
  category?: ActivityCategory;
  subcategory?: string;
  title?: string;
  description?: string;
  verificationStatus?: VerificationStatus;
  countsTowardReport?: boolean;
  isSensitive?: boolean;
  metadata?: Record<string, unknown>;
}

export interface ConfirmEvidenceRequest {
  storagePath: string;
  originalFilename?: string;
  mimeType?: string;
  fileSizeBytes?: number;
  checksumSha256: string;
}

export interface GenerateReportRequest {
  month: string; // "YYYY-MM"
  recipientName?: string;
  recipientAgency?: string;
}

export interface SignReportRequest {
  signerType: SignerType;
  signerName: string;
}

export interface UpdateSectionRequest {
  sectionText: string;
}
