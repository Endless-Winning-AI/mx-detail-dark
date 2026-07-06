create table if not exists public.mx_detail_form_submissions (
  id uuid primary key default gen_random_uuid(),
  received_at timestamptz not null default now(),
  form_type text not null default 'booking',
  source text not null default 'Website',
  location text,
  market_tag text,
  first_name text,
  last_name text,
  email text,
  phone text,
  payload jsonb not null,
  ghl_contact_id text,
  ghl_status text not null default 'pending',
  ghl_error text,
  sms_status text not null default 'pending',
  sms_error text,
  updated_at timestamptz not null default now()
);

create index if not exists mx_detail_form_submissions_received_at_idx
  on public.mx_detail_form_submissions (received_at desc);

create index if not exists mx_detail_form_submissions_email_idx
  on public.mx_detail_form_submissions (lower(email));

create index if not exists mx_detail_form_submissions_ghl_status_idx
  on public.mx_detail_form_submissions (ghl_status);

alter table public.mx_detail_form_submissions enable row level security;
