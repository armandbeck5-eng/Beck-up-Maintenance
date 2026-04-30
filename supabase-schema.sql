-- Beck-Up Maintenance — Supabase Schema
-- Run this in your Supabase project: SQL Editor → New Query → paste & run

create table if not exists maintenance_requests (
  id               bigserial primary key,
  created_at       timestamptz default now() not null,
  category         text        not null,
  issue            text        not null,
  description      text        not null,
  reporter_name    text        not null,
  reporter_email   text        not null,
  reporter_phone   text,
  property_address text        not null,
  unit_number      text,
  status           text        not null default 'pending'
    check (status in ('pending','in_progress','resolved','cancelled'))
);

-- Enable Row Level Security (keeps data safe)
alter table maintenance_requests enable row level security;

-- Allow anonymous inserts (form submissions from the public)
create policy "Allow public insert"
  on maintenance_requests for insert
  to anon
  with check (true);

-- Allow anonymous reads (admin dashboard — tighten this with auth later)
create policy "Allow public read"
  on maintenance_requests for select
  to anon
  using (true);

-- Allow anonymous updates (status changes in admin)
create policy "Allow public update"
  on maintenance_requests for update
  to anon
  using (true)
  with check (true);
