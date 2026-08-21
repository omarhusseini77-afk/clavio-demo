-- Simultaneity flag for the CFO early-warning surface.
--
-- The decision was: a per-fund setting, defaulting to the CFO and the GP seeing
-- a signal at the same time. It lands on `companies` rather than `funds` for
-- two reasons — a `submit` user cannot read `funds` at all under
-- 004_tenancy_schema.sql, so putting it there would mean widening a policy to
-- expose a fund row to a portfolio company; and per-company override is the
-- likelier thing a GP actually wants. A fund-wide default can be applied by
-- updating every company in the fund.
--
-- Additive and defaulted, so this is safe to run ahead of the code: nothing
-- reads it until the CFO surface deploys, and the default reproduces the
-- behaviour that surface ships with.
alter table public.companies
  add column if not exists cfo_signals_simultaneous boolean not null default true;

comment on column public.companies.cfo_signals_simultaneous is
  'true: the company sees its own early-warning signals as soon as they compute, at the same time as the GP. false: the CFO surface withholds them (the GP feed is unaffected). Defaults to true — showing a company what its investor is about to see is the point of the feature.';
