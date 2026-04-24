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
