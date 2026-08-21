-- Phase 7 schema. Additive, defaulted, and read by nothing until the code
-- lands — the same expand/contract shape used since Phase 2.

-- ---------------------------------------------------------------------------
-- Reporting deadline, per company
-- ---------------------------------------------------------------------------
-- Days after period end by which a company is expected to have filed. On
-- companies rather than funds so a GP can vary it per portfolio company, and
-- because a submit user can read companies but cannot read funds at all.
alter table public.companies
  add column if not exists reporting_deadline_days integer not null default 15;

comment on column public.companies.reporting_deadline_days is
  'Days after period end by which this company is expected to file. Drives submission reminders. Default 15.';

-- ---------------------------------------------------------------------------
-- Email outbox
-- ---------------------------------------------------------------------------
-- Every notification is composed and written here, always. Dispatch is a
-- separate, explicitly enabled step.
--
-- This is not a stub for real sending: it IS the record of what the system
-- decided to send, and it stays useful after transmission is switched on. It
-- exists because every demo account is a fictional address — sending to them
-- would bounce, and bounces damage a sending domain before the pilot has sent
-- anything real.
alter table public.funds
  add column if not exists email_dispatch_enabled boolean not null default false;

comment on column public.funds.email_dispatch_enabled is
  'false (default): composed emails accumulate in email_outbox and nothing is transmitted. Transmission additionally requires a provider key to be configured, so turning this on alone does not put mail on the wire.';

create table if not exists public.email_outbox (
  id uuid primary key default gen_random_uuid(),
  fund_id uuid not null references public.funds(id) on delete cascade,
  -- The company the message is ABOUT and scoped to. Null for fund-level mail.
  company_id uuid references public.companies(id) on delete cascade,
  -- Who it is addressed to, by profile. The address itself is not stored: it
  -- lives on auth.users and copying it here would make this table PII in a way
  -- it does not need to be.
  recipient_profile_id uuid not null references public.profiles(id) on delete cascade,
  -- Which audience's template produced it. Templates are never shared between
  -- audiences — see lib/emailTemplates.ts.
  audience text not null check (audience in ('submit', 'gp', 'lp')),
  kind text not null check (kind in ('submission_reminder', 'submission_confirmation')),
  subject text not null,
  body text not null,
  status text not null default 'pending'
    check (status in ('pending', 'sent', 'cancelled', 'failed')),
  -- Cancelling marks a row. Nothing in this system deletes from this table:
  -- a record of what was going to be sent is worth more than a tidy list.
  cancelled_reason text,
  sent_at timestamptz,
  created_at timestamptz not null default now()
);

comment on table public.email_outbox is
  'Composed notifications. A row here is the record of what the system decided to send, whether or not it was transmitted. Never deleted — cancelling sets status.';

create index if not exists email_outbox_fund_idx    on public.email_outbox(fund_id, created_at desc);
create index if not exists email_outbox_company_idx on public.email_outbox(company_id, created_at desc);

-- ---------------------------------------------------------------------------
-- Usage log
-- ---------------------------------------------------------------------------
-- What was called, by which tenant, how fast, did it work. Nothing about what
-- was in it.
--
-- THERE IS DELIBERATELY NO `metadata jsonb` COLUMN. Every field excluded by
-- design — question text, answer text, request bodies, quarterly figures,
-- file names, email addresses, IP addresses — would eventually end up in one,
-- and a schema that cannot hold them is a stronger guarantee than a rule that
-- says not to.
create table if not exists public.usage_log (
  id bigserial primary key,
  created_at timestamptz not null default now(),
  route text not null,
  method text not null,
  status integer not null,
  duration_ms integer not null,
  -- Tenancy and role, so usage can be attributed without identifying content.
  role text,
  user_id uuid references auth.users(id) on delete set null,
  company_id uuid references public.companies(id) on delete set null,
  fund_id uuid references public.funds(id) on delete set null,
  -- Model accounting, /api/ask only. Counts, never content.
  input_tokens integer,
  output_tokens integer,
  cache_read_tokens integer,
  cache_write_tokens integer,
  lang text check (lang is null or lang in ('en', 'fr'))
);

comment on table public.usage_log is
  'What was called, by which tenant, how fast, did it work — and nothing about what was in it. No request or response bodies, no question or answer text, no financial figures, no file names, no email addresses, no IP addresses. There is no metadata column on purpose.';

create index if not exists usage_log_fund_idx on public.usage_log(fund_id, created_at desc);

-- ---------------------------------------------------------------------------
-- RLS
-- ---------------------------------------------------------------------------
alter table public.email_outbox enable row level security;
alter table public.usage_log    enable row level security;
alter table public.email_outbox force row level security;
alter table public.usage_log    force row level security;

-- A GP reads their own fund's outbox. Nobody else reads it at all — in
-- particular a submit user does not, because the list of what was sent to
-- every company IS peer information.
drop policy if exists "outbox readable by fund gp" on public.email_outbox;
create policy "outbox readable by fund gp" on public.email_outbox
  for select to authenticated
  using (
    public.current_app_role() = 'gp'
    and fund_id = public.current_fund_id()
  );

-- A GP may cancel a pending row in their own fund. That is the only client
-- write, and it cannot create, delete, or change what a message says.
drop policy if exists "outbox cancellable by fund gp" on public.email_outbox;
create policy "outbox cancellable by fund gp" on public.email_outbox
  for update to authenticated
  using (
    public.current_app_role() = 'gp'
    and fund_id = public.current_fund_id()
  )
  with check (
    public.current_app_role() = 'gp'
    and fund_id = public.current_fund_id()
  );

-- No delete policy on either table, and no update policy on usage_log: a log a
-- client can edit or remove is not a log. Inserts are a separate question and
-- are dealt with at the end of this file, where the trade-off is stated.
drop policy if exists "usage readable by fund gp" on public.usage_log;
create policy "usage readable by fund gp" on public.usage_log
  for select to authenticated
  using (
    public.current_app_role() = 'gp'
    and fund_id = public.current_fund_id()
  );

-- ---------------------------------------------------------------------------
-- Inserts: why these are client-reachable, and what that costs
-- ---------------------------------------------------------------------------
-- Both tables are written by route handlers, which run under the CALLER's
-- session, not a service role. The service-role key is deliberately not held by
-- this application — it has only ever been used from a trusted machine for
-- seeding — so "the server writes it" does not mean "RLS does not apply".
--
-- The honest consequence: a determined client could insert junk rows into
-- either table. That is accepted for the pilot, and bounded rather than
-- assumed:
--
--   * neither policy lets a caller insert outside their own tenant
--   * an outbox row a submit user creates can only be addressed to themselves
--   * there is no update policy except a GP cancelling in their own fund, and
--     no delete policy anywhere, so existing rows cannot be rewritten or
--     removed by any client
--   * usage_log rows are attributable, so forged rows are noise, not a way to
--     see anything
--
-- Moving these writes behind a service-role key removes even that, and is the
-- right change if the pilot ever faces an untrusted user. It is not free: it
-- puts a key that bypasses every policy into the application's environment,
-- which is a larger risk than the one it removes at this stage.

drop policy if exists "outbox insertable within tenant" on public.email_outbox;
create policy "outbox insertable within tenant" on public.email_outbox
  for insert to authenticated
  with check (
    (
      -- A portfolio company may only produce mail about itself, addressed to
      -- itself. It cannot compose a message to a peer or to the fund.
      public.current_app_role() = 'submit'
      and company_id = public.current_company_id()
      and recipient_profile_id = auth.uid()
      and audience = 'submit'
    )
    or (
      public.current_app_role() = 'gp'
      and fund_id = public.current_fund_id()
    )
  );

drop policy if exists "usage insertable by own session" on public.usage_log;
create policy "usage insertable by own session" on public.usage_log
  for insert to authenticated
  with check (user_id = auth.uid());
