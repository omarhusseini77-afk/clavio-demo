-- Phase 2, Step 3: tighten quarters onto the tenancy model.
--
-- THIS IS THE STEP THAT CAN BREAK PRODUCTION. It must not run until the Step 2
-- code is confirmed live on clavio-demo.vercel.app, because:
--
--   * company_id becomes NOT NULL here, and the pre-Step-2 build inserts
--     quarters without it (/api/seed and POST /api/quarters). Running this
--     first would make every filing fail.
--   * the policies below scope by fund, which only works once profiles carry
--     fund_id/company_id — backfilled in 005.
--
-- Phase 3 broke exactly this way: a policy change landed ahead of the code that
-- understood it, and the live dashboard served empty data until the deploy
-- caught up.

-- Every row was backfilled in 005; this makes the invariant permanent so a
-- future insert cannot create an untenanted quarter.
alter table public.quarters alter column company_id set not null;

-- Replace the Phase 3 role-only policies with tenancy-aware ones. Same role
-- rules as before, now with the additional requirement that the row belongs to
-- the caller's fund (GP) or to the caller's own company (submit).
--
-- Rollback: drop these four and re-create the role-only versions from
-- 003_rls_quarters.sql. Nothing else in this migration needs reverting.
drop policy if exists "quarters readable by gp and submit"  on public.quarters;
drop policy if exists "quarters insertable by submit"       on public.quarters;
drop policy if exists "quarters updatable by gp and submit" on public.quarters;
drop policy if exists "quarters deletable by gp and submit" on public.quarters;

-- A GP sees the quarters of companies in their own fund, and no others. This is
-- the line that turns role isolation into tenant isolation: a second portfolio
-- company under a different fund is now invisible here.
create policy "quarters readable within tenant"
  on public.quarters
  for select
  to authenticated
  using (
    (
      public.current_app_role() = 'gp'
      and exists (
        select 1 from public.companies c
        where c.id = quarters.company_id
          and c.fund_id = public.current_fund_id()
      )
    )
    or (
      public.current_app_role() = 'submit'
      and company_id = public.current_company_id()
    )
  );

-- Filing stays the portfolio company's job, and only for itself.
create policy "quarters insertable by own company"
  on public.quarters
  for insert
  to authenticated
  with check (
    public.current_app_role() = 'submit'
    and company_id = public.current_company_id()
  );

-- with check mirrors using, so a row cannot be updated out of its own tenant.
create policy "quarters updatable within tenant"
  on public.quarters
  for update
  to authenticated
  using (
    (
      public.current_app_role() = 'gp'
      and exists (
        select 1 from public.companies c
        where c.id = quarters.company_id
          and c.fund_id = public.current_fund_id()
      )
    )
    or (
      public.current_app_role() = 'submit'
      and company_id = public.current_company_id()
    )
  )
  with check (
    (
      public.current_app_role() = 'gp'
      and exists (
        select 1 from public.companies c
        where c.id = quarters.company_id
          and c.fund_id = public.current_fund_id()
      )
    )
    or (
      public.current_app_role() = 'submit'
      and company_id = public.current_company_id()
    )
  );

create policy "quarters deletable within tenant"
  on public.quarters
  for delete
  to authenticated
  using (
    (
      public.current_app_role() = 'gp'
      and exists (
        select 1 from public.companies c
        where c.id = quarters.company_id
          and c.fund_id = public.current_fund_id()
      )
    )
    or (
      public.current_app_role() = 'submit'
      and company_id = public.current_company_id()
    )
  );
