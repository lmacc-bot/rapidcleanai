create table if not exists public.profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  full_name text,
  email text not null,
  created_at timestamptz not null default timezone('utc'::text, now()),
  updated_at timestamptz not null default timezone('utc'::text, now())
);

alter table public.profiles enable row level security;

create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  insert into public.profiles (id, full_name, email)
  values (
    new.id,
    coalesce(new.raw_user_meta_data->>'full_name', ''),
    new.email
  )
  on conflict (id) do update
    set full_name = excluded.full_name,
        email = excluded.email,
        updated_at = timezone('utc'::text, now());

  return new;
end;
$$;

drop trigger if exists on_auth_user_created on auth.users;

create trigger on_auth_user_created
after insert on auth.users
for each row execute procedure public.handle_new_user();

create policy "Users can view own profile"
on public.profiles
for select
using (auth.uid() = id);

create policy "Users can insert own profile"
on public.profiles
for insert
with check (auth.uid() = id);

create policy "Users can update own profile"
on public.profiles
for update
using (auth.uid() = id)
with check (auth.uid() = id);

create table if not exists public.billing_access (
  user_id uuid primary key references auth.users(id) on delete cascade,
  email text not null unique,
  has_access boolean not null default false,
  plan text not null default 'pro',
  payment_status text not null default 'pending',
  created_at timestamptz not null default timezone('utc'::text, now()),
  updated_at timestamptz not null default timezone('utc'::text, now())
);

alter table public.billing_access enable row level security;

create policy "Users can view own billing access"
on public.billing_access
for select
using (auth.uid() = user_id);

create table if not exists public.quote_usage_windows (
  user_id uuid primary key references auth.users(id) on delete cascade,
  quotes_used integer not null default 0,
  window_started_at timestamptz not null default timezone('utc'::text, now()),
  created_at timestamptz not null default timezone('utc'::text, now()),
  updated_at timestamptz not null default timezone('utc'::text, now())
);

alter table public.quote_usage_windows enable row level security;

create policy "Users can view own quote usage windows"
on public.quote_usage_windows
for select
using (auth.uid() = user_id);

create table if not exists public.saved_quotes (
  id bigint generated always as identity primary key,
  user_id uuid not null references auth.users(id) on delete cascade,
  prompt text not null,
  quote_payload jsonb not null,
  plan_at_generation text not null default 'pro',
  created_at timestamptz not null default timezone('utc'::text, now())
);

create index if not exists saved_quotes_user_created_at_idx
on public.saved_quotes (user_id, created_at desc);

alter table public.saved_quotes enable row level security;

create policy "Users can view own saved quotes"
on public.saved_quotes
for select
using (auth.uid() = user_id);

create extension if not exists pgcrypto;

create table if not exists public.clients (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  name text,
  phone text,
  email text,
  address text,
  notes text,
  created_at timestamptz default now(),
  updated_at timestamptz default now()
);

create index if not exists clients_user_created_at_idx
on public.clients (user_id, created_at desc);

alter table public.clients enable row level security;

drop policy if exists "Users can view own clients" on public.clients;
create policy "Users can view own clients"
on public.clients
for select
using (auth.uid() = user_id);

drop policy if exists "Users can insert own clients" on public.clients;
create policy "Users can insert own clients"
on public.clients
for insert
with check (auth.uid() = user_id);

drop policy if exists "Users can update own clients" on public.clients;
create policy "Users can update own clients"
on public.clients
for update
using (auth.uid() = user_id)
with check (auth.uid() = user_id);

create table if not exists public.proposals (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  saved_quote_id bigint references public.saved_quotes(id) on delete set null,
  client_id uuid references public.clients(id) on delete set null,
  payload jsonb not null,
  created_at timestamptz default now()
);

alter table public.proposals
add column if not exists client_id uuid references public.clients(id) on delete set null;

create index if not exists proposals_user_created_at_idx
on public.proposals (user_id, created_at desc);

create index if not exists proposals_client_id_idx
on public.proposals (client_id);

alter table public.proposals enable row level security;

drop policy if exists "Users can view own proposals" on public.proposals;
create policy "Users can view own proposals"
on public.proposals
for select
using (auth.uid() = user_id);

drop policy if exists "Users can insert own proposals" on public.proposals;
create policy "Users can insert own proposals"
on public.proposals
for insert
with check (auth.uid() = user_id);

drop policy if exists "Users can update own proposals" on public.proposals;
create policy "Users can update own proposals"
on public.proposals
for update
using (auth.uid() = user_id)
with check (auth.uid() = user_id);

create table if not exists public.follow_ups (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  client_id uuid references public.clients(id) on delete set null,
  proposal_id uuid references public.proposals(id) on delete cascade,
  status text not null default 'pending',
  due_at timestamptz not null,
  note text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists follow_ups_user_status_due_at_idx
on public.follow_ups (user_id, status, due_at asc);

create index if not exists follow_ups_client_id_idx
on public.follow_ups (client_id);

create index if not exists follow_ups_proposal_id_idx
on public.follow_ups (proposal_id);

alter table public.follow_ups enable row level security;

drop policy if exists "Users can view own follow ups" on public.follow_ups;
create policy "Users can view own follow ups"
on public.follow_ups
for select
using (auth.uid() = user_id);

drop policy if exists "Users can insert own follow ups" on public.follow_ups;
create policy "Users can insert own follow ups"
on public.follow_ups
for insert
with check (auth.uid() = user_id);

drop policy if exists "Users can update own follow ups" on public.follow_ups;
create policy "Users can update own follow ups"
on public.follow_ups
for update
using (auth.uid() = user_id)
with check (auth.uid() = user_id);

create table if not exists public.trial_tracking (
  id bigint generated always as identity primary key,
  email text not null,
  ip_address text not null,
  user_agent text,
  created_at timestamptz not null default timezone('utc'::text, now())
);

create index if not exists trial_tracking_ip_created_at_idx
on public.trial_tracking (ip_address, created_at desc);

alter table public.trial_tracking enable row level security;

create extension if not exists pgcrypto;

create table if not exists public.trial_claims (
  id uuid primary key default gen_random_uuid(),
  user_id uuid references auth.users(id) on delete cascade,
  email text not null,
  normalized_email text not null,
  ip_hash text,
  user_agent_hash text,
  stripe_customer_id text,
  created_at timestamptz default now()
);

create unique index if not exists trial_claims_normalized_email_key
on public.trial_claims (normalized_email);

create index if not exists trial_claims_user_id_idx
on public.trial_claims (user_id);

create index if not exists trial_claims_stripe_customer_id_idx
on public.trial_claims (stripe_customer_id);

alter table public.trial_claims enable row level security;
