
create table if not exists catalog_import_jobs (
  id text primary key,
  target text not null check (target in ('hardware','appliance')),
  format text not null,
  parsed_count integer not null default 0,
  rejected_count integer not null default 0,
  issues_json jsonb not null default '[]'::jsonb,
  status text not null default 'review',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists catalog_import_candidates (
  id text primary key,
  import_id text not null references catalog_import_jobs(id) on delete cascade,
  target text not null check (target in ('hardware','appliance')),
  status text not null check (status in ('pending_review','promoted','rejected')),
  candidate_json jsonb not null,
  confidence numeric not null default 0,
  production_eligible boolean not null default false,
  reviewed_by text,
  reviewed_at timestamptz,
  review_note text,
  created_at timestamptz not null default now()
);
create index if not exists catalog_import_candidates_status_idx on catalog_import_candidates(status,created_at);

create table if not exists catalog_master_records (
  id text primary key,
  target text not null check (target in ('hardware','appliance')),
  manufacturer text not null,
  trust text not null,
  source text not null,
  record_json jsonb not null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create index if not exists catalog_master_records_target_idx on catalog_master_records(target,manufacturer);

alter table catalog_import_jobs enable row level security;
alter table catalog_import_candidates enable row level security;
alter table catalog_master_records enable row level security;

-- Server-side catalog registry uses the service/secret key. No public policies are created.
