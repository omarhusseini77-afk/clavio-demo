-- Phase 1: role storage for authenticated users.
--
-- Roles live here rather than in auth.users.user_metadata because metadata is
-- writable by its owner — an LP could otherwise promote themselves to GP.
-- A table is also what Phase 3's RLS policies will join against.

create table if not exists public.profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  role text not null check (role in ('gp', 'lp', 'submit')),
  full_name text,
  created_at timestamptz not null default now()
);

alter table public.profiles enable row level security;

-- Narrow by design: a user may read their own row so the app can learn its own
-- role. Nobody can read anyone else's, and nobody can write from the client.
-- This is not the Phase 3 RLS work, which covers quarters and tenant isolation.
drop policy if exists "own profile readable" on public.profiles;
create policy "own profile readable"
  on public.profiles
  for select
  using (auth.uid() = id);
