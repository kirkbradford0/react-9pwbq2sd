-- Felon's Melon Pro: Initial Schema Migration
-- Run this against your Supabase project via the SQL editor or CLI

-- ============================================================
-- PROFILES
-- Extends Supabase auth.users
-- ============================================================
create table profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  full_name text not null,
  preferred_name text,
  date_of_birth date,
  timezone text default 'America/Denver',
  subscription_plan text not null default 'free'
    check (subscription_plan in ('free', 'pro', 'partner')),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

-- ============================================================
-- MONTHLY REPORTING PROFILES
-- Per-user preferences for letter generation
-- ============================================================
create table monthly_reporting_profiles (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references profiles(id) on delete cascade,
  default_recipient_name text,
  default_recipient_agency text,
  report_tone text not null default 'neutral'
    check (report_tone in ('neutral', 'supportive', 'strict')),
  include_missed_items boolean not null default false,
  include_self_reported_items boolean not null default true,
  include_appendix boolean not null default true,
  signature_mode text not null default 'user_platform'
    check (signature_mode in ('user_only', 'platform_only', 'user_platform')),
  auto_generate_monthly boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique(user_id)
);

-- ============================================================
-- ACTIVITY ENTRIES
-- Raw life ledger — one entry per documented activity
-- ============================================================
create table activity_entries (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references profiles(id) on delete cascade,

  occurred_at timestamptz not null,
  category text not null check (
    category in (
      'housing', 'employment', 'treatment', 'recovery',
      'legal', 'financial', 'health', 'education',
      'community', 'family', 'transportation', 'other'
    )
  ),

  subcategory text not null,
  title text not null,
  description text,

  source_type text not null default 'self_reported' check (
    source_type in (
      'self_reported', 'uploaded_document', 'imported',
      'verified_contact', 'system_generated'
    )
  ),

  verification_status text not null default 'self_reported' check (
    verification_status in (
      'missing', 'self_reported', 'documented',
      'partially_verified', 'verified'
    )
  ),

  confidence_score integer not null default 25
    check (confidence_score >= 0 and confidence_score <= 100),

  counts_toward_report boolean not null default true,
  is_sensitive boolean not null default false,

  -- Flexible metadata: amounts, providers, locations, etc.
  metadata jsonb not null default '{}'::jsonb,

  deleted_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

-- ============================================================
-- EVIDENCE FILES
-- Uploaded proof linked to activity entries
-- ============================================================
create table evidence_files (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references profiles(id) on delete cascade,
  activity_entry_id uuid references activity_entries(id) on delete cascade,

  storage_path text not null,
  original_filename text,
  mime_type text,
  file_size_bytes bigint,

  -- Populated after OCR / text extraction
  extracted_text text,
  checksum_sha256 text not null,

  uploaded_at timestamptz not null default now(),
  created_at timestamptz not null default now()
);

-- ============================================================
-- MONTHLY REPORTS
-- One record per month per user per version
-- ============================================================
create table monthly_reports (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references profiles(id) on delete cascade,

  month_start date not null,
  month_end date not null,

  status text not null default 'draft' check (
    status in ('draft', 'generated', 'finalized', 'signed', 'archived')
  ),

  report_version integer not null default 1,
  recipient_name text,
  recipient_agency text,

  -- Full structured summary stored as JSON
  summary_json jsonb not null default '{}'::jsonb,

  -- SHA-256 of summary_json at finalization
  report_hash text,
  pdf_storage_path text,

  generated_at timestamptz,
  finalized_at timestamptz,
  archived_at timestamptz,

  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),

  unique(user_id, month_start, month_end, report_version)
);

-- ============================================================
-- MONTHLY REPORT SECTIONS
-- Allows per-section editing and regeneration
-- ============================================================
create table monthly_report_sections (
  id uuid primary key default gen_random_uuid(),
  monthly_report_id uuid not null references monthly_reports(id) on delete cascade,
  section_key text not null,
  section_title text not null,
  section_text text not null,
  evidence_count integer not null default 0,
  confidence_score integer not null default 0
    check (confidence_score >= 0 and confidence_score <= 100),
  section_order integer not null default 0,
  created_at timestamptz not null default now()
);

-- ============================================================
-- REPORT SIGNATURES
-- Tracks user, platform, and case manager attestations
-- ============================================================
create table report_signatures (
  id uuid primary key default gen_random_uuid(),
  monthly_report_id uuid not null references monthly_reports(id) on delete cascade,

  signer_type text not null check (
    signer_type in ('user', 'platform', 'case_manager', 'counselor')
  ),

  signer_name text not null,
  signature_hash text not null,
  signed_at timestamptz not null default now(),
  metadata jsonb not null default '{}'::jsonb
);

-- ============================================================
-- AUDIT LOGS
-- Append-only log for legal defensibility
-- ============================================================
create table audit_logs (
  id uuid primary key default gen_random_uuid(),
  user_id uuid references profiles(id) on delete cascade,
  entity_type text not null,
  entity_id uuid not null,
  action_type text not null,
  actor_type text not null check (actor_type in ('user', 'system', 'admin')),
  old_value jsonb,
  new_value jsonb,
  created_at timestamptz not null default now()
);

-- ============================================================
-- INDEXES
-- ============================================================
create index idx_activity_entries_user_occurred_at
  on activity_entries(user_id, occurred_at desc);

create index idx_activity_entries_user_category
  on activity_entries(user_id, category);

create index idx_activity_entries_not_deleted
  on activity_entries(user_id, deleted_at)
  where deleted_at is null;

create index idx_evidence_files_activity
  on evidence_files(activity_entry_id);

create index idx_monthly_reports_user_month
  on monthly_reports(user_id, month_start desc);

create index idx_audit_logs_entity
  on audit_logs(entity_type, entity_id);

-- ============================================================
-- ROW LEVEL SECURITY
-- Users can only access their own data
-- ============================================================
alter table profiles enable row level security;
alter table monthly_reporting_profiles enable row level security;
alter table activity_entries enable row level security;
alter table evidence_files enable row level security;
alter table monthly_reports enable row level security;
alter table monthly_report_sections enable row level security;
alter table report_signatures enable row level security;
alter table audit_logs enable row level security;

create policy "Users own their profile"
  on profiles for all using (auth.uid() = id);

create policy "Users own their reporting profile"
  on monthly_reporting_profiles for all using (auth.uid() = user_id);

create policy "Users own their activity entries"
  on activity_entries for all using (auth.uid() = user_id);

create policy "Users own their evidence files"
  on evidence_files for all using (auth.uid() = user_id);

create policy "Users own their monthly reports"
  on monthly_reports for all using (auth.uid() = user_id);

create policy "Users own their report sections"
  on monthly_report_sections for all
  using (
    monthly_report_id in (
      select id from monthly_reports where user_id = auth.uid()
    )
  );

create policy "Users own their signatures"
  on report_signatures for all
  using (
    monthly_report_id in (
      select id from monthly_reports where user_id = auth.uid()
    )
  );

create policy "Users own their audit logs"
  on audit_logs for select using (auth.uid() = user_id);

-- ============================================================
-- STORAGE BUCKETS
-- Run these in the Supabase dashboard or via CLI
-- ============================================================
-- insert into storage.buckets (id, name, public) values ('evidence-files', 'evidence-files', false);
-- insert into storage.buckets (id, name, public) values ('monthly-reports', 'monthly-reports', false);
--
-- Storage path conventions:
--   evidence-files: {userId}/activities/{activityId}/{fileName}
--   monthly-reports: {userId}/{year}/{month}/report-{reportId}.pdf
