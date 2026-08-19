-- Phase 3: Row-Level Security on quarters.
--
-- Closes the hole found in Phase 1 testing: quarters was readable with the
-- anon key and no login at all. Routing alone never protected this — the anon
-- key ships in the browser bundle by design, so anyone could query PostgREST
-- directly. Enforcement now lives in Postgres.
--
-- Scope note: these policies key off role, not tenant. The schema has no
-- company_id on quarters and no companies/funds tables, so per-fund isolation
-- is not expressible yet. While the pilot is one company and one fund this is
-- functionally equivalent; when Phase 2 adds tenancy, each policy below gains a
-- company_id predicate alongside the role check. Do not describe this phase as
-- multi-tenant isolation.

-- ---------------------------------------------------------------------------
-- Role lookup
-- ---------------------------------------------------------------------------
-- security definer so the lookup reads profiles without being subject to that
-- table's own RLS — otherwise a future policy change there could silently
-- starve every policy here. search_path is pinned because a security definer
-- function with a mutable search_path can be hijacked via a shadowing schema.
--
-- For anon, auth.uid() is null, so this returns null and every policy below
-- evaluates false. That is the default-deny that closes the reported hole.
create or replace function public.current_app_role()
returns text
language sql
stable
security definer
set search_path = public, pg_temp
as $$
  select role from public.profiles where id = auth.uid()
$$;

revoke all on function public.current_app_role() from public, anon;
grant execute on function public.current_app_role() to authenticated;

-- ---------------------------------------------------------------------------
-- quarters
-- ---------------------------------------------------------------------------
alter table public.quarters enable row level security;

-- Force RLS for the table owner too, so a future owner-context connection
-- cannot quietly bypass these rules.
alter table public.quarters force row level security;

drop policy if exists "quarters readable by gp and submit" on public.quarters;
drop policy if exists "quarters insertable by submit"      on public.quarters;
drop policy if exists "quarters updatable by gp and submit" on public.quarters;
drop policy if exists "quarters deletable by gp and submit" on public.quarters;

-- Every policy is scoped `to authenticated`. anon matches no policy, and a
-- table with RLS enabled denies anything no policy allows.

-- LP is deliberately absent from this one. Raw portfolio-company internals are
-- not investor-appropriate, and the LP view never queries this table.
create policy "quarters readable by gp and submit"
  on public.quarters
  for select
  to authenticated
  using (public.current_app_role() in ('gp', 'submit'));

-- Filing figures is the portfolio company's job, so GP is not granted insert.
create policy "quarters insertable by submit"
  on public.quarters
  for insert
  to authenticated
  with check (public.current_app_role() = 'submit');

-- GP included: the partner dashboard has an edit path (useQuarters.onUpdate).
-- with check mirrors using so a row cannot be updated out of visibility.
create policy "quarters updatable by gp and submit"
  on public.quarters
  for update
  to authenticated
  using (public.current_app_role() in ('gp', 'submit'))
  with check (public.current_app_role() in ('gp', 'submit'));

-- GP included: the dashboard has a delete path (useQuarters.onDelete).
create policy "quarters deletable by gp and submit"
  on public.quarters
  for delete
  to authenticated
  using (public.current_app_role() in ('gp', 'submit'));
