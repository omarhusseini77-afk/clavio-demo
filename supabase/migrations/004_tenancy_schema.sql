-- Phase 2, Step 1: the real schema. Additive only.
--
-- Every statement here is invisible to the code currently running in
-- production: the new tables are read by nothing yet, and the columns added to
-- quarters and profiles are NULLABLE, so `select *` and inserts that omit them
-- behave exactly as before. The quarters policies from Phase 3 are deliberately
-- left untouched.
--
-- This ordering matters. In Phase 3 a migration landed before the code that
-- understood it and the live dashboard served empty data until the deploy caught
-- up. The tightening half of this phase — NOT NULL plus tenancy-aware policies —
-- is in 006 and must not run until the Step 2 code is confirmed live.

-- ---------------------------------------------------------------------------
-- Core tenancy tables
-- ---------------------------------------------------------------------------
create table if not exists public.funds (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  vintage_year int,
  currency text not null default 'GBP',
  as_of_date date,
  as_of_label_en text,
  as_of_label_fr text,
  period_label text,
  total_invested numeric,
  current_gross_value numeric,
  gross_irr numeric,
  created_at timestamptz not null default now()
);

create table if not exists public.companies (
  id uuid primary key default gen_random_uuid(),
  fund_id uuid not null references public.funds(id) on delete cascade,
  slug text not null,
  name text not null,
  sector_en text, sector_fr text,
  country_en text, country_fr text,
  currency text not null default 'GBP',
  status text check (status in ('green', 'amber', 'red')),
  investment_date text,
  ownership numeric,
  cost numeric,
  moic numeric,
  irr numeric,
  ev_ebitda numeric,
  commentary_en text, commentary_fr text,
  -- Sparkline series for the portfolio list. Headline revenue only, so it sits
  -- on the LP-visible table rather than in company_internals.
  trend jsonb not null default '[]'::jsonb,
  -- Not every company in the demo is a full portfolio holding; the GP anomaly
  -- feed references two that carry no LP-facing accounts.
  in_portfolio boolean not null default true,
  created_at timestamptz not null default now(),
  unique (fund_id, slug)
);

-- Headline annual accounts. What an LP quarterly report carries.
create table if not exists public.company_years (
  id uuid primary key default gen_random_uuid(),
  company_id uuid not null references public.companies(id) on delete cascade,
  fy text not null,
  revenue numeric,
  gross_margin numeric,
  ebitda numeric,
  net_profit numeric,
  created_at timestamptz not null default now(),
  unique (company_id, fy)
);

-- ---------------------------------------------------------------------------
-- Confidential splits
-- ---------------------------------------------------------------------------
-- RLS filters rows, not columns, and Supabase gives every signed-in user the
-- same `authenticated` database role, so a column GRANT cannot separate LP from
-- GP either. Keeping the working-capital figures in their own tables is what
-- makes "LPs see headline performance, not the operating ledger" an actual
-- database boundary rather than an application convention.
create table if not exists public.company_internals (
  company_id uuid primary key references public.companies(id) on delete cascade,
  net_debt numeric
);

create table if not exists public.company_year_internals (
  company_year_id uuid primary key references public.company_years(id) on delete cascade,
  cash numeric,
  receivables numeric,
  payables numeric
);

-- ---------------------------------------------------------------------------
-- Investor side
-- ---------------------------------------------------------------------------
-- One investor's position in a fund. The old FUND constant mixed these
-- LP-specific figures in with fund-level facts; they are different things and
-- belong to different owners.
create table if not exists public.lp_positions (
  id uuid primary key default gen_random_uuid(),
  fund_id uuid not null references public.funds(id) on delete cascade,
  profile_id uuid not null references public.profiles(id) on delete cascade,
  commitment numeric,
  called numeric,
  unfunded numeric,
  distributed numeric,
  nav numeric,
  share_of_fund numeric,
  tvpi numeric,
  dpi numeric,
  rvpi numeric,
  irr numeric,
  created_at timestamptz not null default now(),
  unique (fund_id, profile_id)
);

create table if not exists public.capital_events (
  id uuid primary key default gen_random_uuid(),
  lp_position_id uuid not null references public.lp_positions(id) on delete cascade,
  event_date date not null,
  date_label_en text, date_label_fr text,
  type text not null check (type in ('call', 'distribution')),
  label_en text, label_fr text,
  amount numeric not null,
  created_at timestamptz not null default now()
);

create table if not exists public.forecasts (
  lp_position_id uuid primary key references public.lp_positions(id) on delete cascade,
  next_call_period_en text, next_call_period_fr text,
  next_call_amount numeric,
  next_call_note_en text, next_call_note_fr text,
  next_distribution_period_en text, next_distribution_period_fr text,
  next_distribution_amount numeric,
  next_distribution_note_en text, next_distribution_note_fr text,
  projected_distributions_18m numeric,
  through_en text, through_fr text
);

create table if not exists public.documents (
  id uuid primary key default gen_random_uuid(),
  fund_id uuid not null references public.funds(id) on delete cascade,
  title_en text not null, title_fr text,
  type_en text, type_fr text,
  type_key text check (type_key in ('Report', 'Notice', 'Tax')),
  doc_date date,
  date_label text,
  is_new boolean not null default false,
  sort_order int not null default 0,
  created_at timestamptz not null default now()
);

-- GP-facing anomaly and signal feed. is_signal marks the short "objective
-- signals" summary rows; the rest are full anomalies with recommended actions.
create table if not exists public.anomalies (
  id uuid primary key default gen_random_uuid(),
  company_id uuid not null references public.companies(id) on delete cascade,
  level text not null check (level in ('red', 'amber')),
  is_signal boolean not null default false,
  title_en text, title_fr text,
  detail_en text, detail_fr text,
  actions_en jsonb not null default '[]'::jsonb,
  actions_fr jsonb not null default '[]'::jsonb,
  sort_order int not null default 0,
  created_at timestamptz not null default now()
);

-- ---------------------------------------------------------------------------
-- Tenancy columns on existing tables — NULLABLE on purpose (see header)
-- ---------------------------------------------------------------------------
alter table public.quarters add column if not exists company_id uuid references public.companies(id);
alter table public.profiles add column if not exists fund_id    uuid references public.funds(id);
alter table public.profiles add column if not exists company_id uuid references public.companies(id);

create index if not exists quarters_company_id_idx on public.quarters(company_id);
create index if not exists companies_fund_id_idx   on public.companies(fund_id);
create index if not exists company_years_company_idx on public.company_years(company_id);

-- ---------------------------------------------------------------------------
-- Tenancy helpers
-- ---------------------------------------------------------------------------
-- Defined after the columns above exist: Postgres parses a SQL function body at
-- creation time, so declaring these earlier fails with "fund_id does not exist".
--
-- Same shape as public.current_app_role() in 003: stable, security definer so
-- the lookup is not subject to profiles' own RLS, and a pinned search_path so a
-- shadowing schema cannot hijack it.
create or replace function public.current_fund_id()
returns uuid
language sql
stable
security definer
set search_path = public, pg_temp
as $$
  select fund_id from public.profiles where id = auth.uid()
$$;

create or replace function public.current_company_id()
returns uuid
language sql
stable
security definer
set search_path = public, pg_temp
as $$
  select company_id from public.profiles where id = auth.uid()
$$;

revoke all on function public.current_fund_id() from public, anon;
revoke all on function public.current_company_id() from public, anon;
grant execute on function public.current_fund_id() to authenticated;
grant execute on function public.current_company_id() to authenticated;

-- ---------------------------------------------------------------------------
-- RLS — enabled at creation, so these tables are never readable unscoped
-- ---------------------------------------------------------------------------
alter table public.funds                  enable row level security;
alter table public.companies              enable row level security;
alter table public.company_years          enable row level security;
alter table public.company_internals      enable row level security;
alter table public.company_year_internals enable row level security;
alter table public.lp_positions           enable row level security;
alter table public.capital_events         enable row level security;
alter table public.forecasts              enable row level security;
alter table public.documents              enable row level security;
alter table public.anomalies              enable row level security;

alter table public.funds                  force row level security;
alter table public.companies              force row level security;
alter table public.company_years          force row level security;
alter table public.company_internals      force row level security;
alter table public.company_year_internals force row level security;
alter table public.lp_positions           force row level security;
alter table public.capital_events         force row level security;
alter table public.forecasts              force row level security;
alter table public.documents              force row level security;
alter table public.anomalies              force row level security;

-- Read-only from the client throughout: no insert/update/delete policies, so
-- writes are denied for every role. Seeding happens through migrations.

-- funds: your own fund. GP and LP only; a portfolio company sees no fund.
create policy "funds readable within tenant" on public.funds
  for select to authenticated
  using (
    id = public.current_fund_id()
    and public.current_app_role() in ('gp', 'lp')
  );

-- companies: GP and LP see the whole fund; submit sees only itself.
create policy "companies readable within tenant" on public.companies
  for select to authenticated
  using (
    (public.current_app_role() in ('gp', 'lp') and fund_id = public.current_fund_id())
    or (public.current_app_role() = 'submit' and id = public.current_company_id())
  );

create policy "company_years readable within tenant" on public.company_years
  for select to authenticated
  using (
    exists (
      select 1 from public.companies c
      where c.id = company_years.company_id
        and (
          (public.current_app_role() in ('gp', 'lp') and c.fund_id = public.current_fund_id())
          or (public.current_app_role() = 'submit' and c.id = public.current_company_id())
        )
    )
  );

-- The two confidential tables: identical to the above minus 'lp'.
create policy "company_internals readable by gp and own company" on public.company_internals
  for select to authenticated
  using (
    exists (
      select 1 from public.companies c
      where c.id = company_internals.company_id
        and (
          (public.current_app_role() = 'gp' and c.fund_id = public.current_fund_id())
          or (public.current_app_role() = 'submit' and c.id = public.current_company_id())
        )
    )
  );

create policy "company_year_internals readable by gp and own company" on public.company_year_internals
  for select to authenticated
  using (
    exists (
      select 1
      from public.company_years cy
      join public.companies c on c.id = cy.company_id
      where cy.id = company_year_internals.company_year_id
        and (
          (public.current_app_role() = 'gp' and c.fund_id = public.current_fund_id())
          or (public.current_app_role() = 'submit' and c.id = public.current_company_id())
        )
    )
  );

-- lp_positions: an LP sees only its own. A GP sees positions in its own fund.
-- Without the profile_id check one investor could read another's capital
-- account, which is the same class of leak this phase exists to close.
create policy "lp_positions readable by owner and fund gp" on public.lp_positions
  for select to authenticated
  using (
    (public.current_app_role() = 'lp' and profile_id = auth.uid())
    or (public.current_app_role() = 'gp' and fund_id = public.current_fund_id())
  );

create policy "capital_events follow their position" on public.capital_events
  for select to authenticated
  using (
    exists (
      select 1 from public.lp_positions p
      where p.id = capital_events.lp_position_id
        and (
          (public.current_app_role() = 'lp' and p.profile_id = auth.uid())
          or (public.current_app_role() = 'gp' and p.fund_id = public.current_fund_id())
        )
    )
  );

create policy "forecasts follow their position" on public.forecasts
  for select to authenticated
  using (
    exists (
      select 1 from public.lp_positions p
      where p.id = forecasts.lp_position_id
        and (
          (public.current_app_role() = 'lp' and p.profile_id = auth.uid())
          or (public.current_app_role() = 'gp' and p.fund_id = public.current_fund_id())
        )
    )
  );

create policy "documents readable within tenant" on public.documents
  for select to authenticated
  using (
    fund_id = public.current_fund_id()
    and public.current_app_role() in ('gp', 'lp')
  );

-- Anomalies are partner-facing supervision of the portfolio companies. Neither
-- investors nor the companies themselves see them.
create policy "anomalies readable by fund gp" on public.anomalies
  for select to authenticated
  using (
    public.current_app_role() = 'gp'
    and exists (
      select 1 from public.companies c
      where c.id = anomalies.company_id
        and c.fund_id = public.current_fund_id()
    )
  );
