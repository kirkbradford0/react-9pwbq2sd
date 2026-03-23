-- Utah Offender Verification Engine: offender_checks table
-- Run this in your Supabase SQL editor

create table if not exists offender_checks (
  id uuid primary key default gen_random_uuid(),
  offender_id text not null,
  found boolean,                -- true = FOUND, false = NOT FOUND, null = UNKNOWN (timeout/error)
  status text not null default 'unknown'
    check (status in ('found', 'not_found', 'unknown')),
  checked_at timestamptz not null default now(),
  raw_response text,            -- page text or error message for debugging
  duration_ms integer           -- how long the check took
);

-- Index for lookups by offender_id (to detect re-entry across runs)
create index idx_offender_checks_offender_id
  on offender_checks(offender_id, checked_at desc);

-- Index for time-based queries
create index idx_offender_checks_checked_at
  on offender_checks(checked_at desc);

-- No RLS on this table — it's a server-side journalism tool, not user-owned data
-- If you want to lock it down later, enable RLS and add a service-role policy
