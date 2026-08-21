-- Cleanup. Deletes the four authored rows the dashboard presented as computed,
-- and makes it structurally impossible to add more.
--
-- Safe to run at any time AFTER the code that stops reading them is live: the
-- rows are already inert by then, so this changes nothing a user sees. Running
-- it BEFORE that deploy would also be harmless, but the ordering is deliberate
-- — rollback of the code change is what restores the old behaviour, and it can
-- only do that while the rows still exist.
--
-- Why retire rather than migrate: in every case the computed equivalent
-- measures something different from what the authored text claimed.
--
--   Halcyon "EBITDA margin contracted 4.2pp"      -> the rule fires; the row's
--     second sentence ("bad debt up 14% on receivables") is not derivable from
--     any column in the schema and dies with it.
--   Sentinel "EBITDA inconsistent with prior pattern" -> the rule fires, with
--     the actual band rather than an assertion about 2σ.
--   Atelier "working capital tightened"           -> the rule fires, measuring
--     the cycle across two consecutive quarters. The authored text compared
--     against the same period last year: a different baseline.
--   Halcyon "collection speed slowed"             -> NOTHING fires. Debtor days
--     are 13.7% above the trailing four-quarter mean, under the declared 15%
--     threshold. The threshold was deliberately not moved to make the two
--     agree. Deleting this row is what makes both surfaces consistently
--     silent instead of one describing what the other omits.
--
-- Rewriting any of them to match the computed output would just be authoring
-- again, one step further from the data.

delete from public.anomalies where is_signal = false;

-- Structure over discipline.
--
-- Nothing enforced that the feed stayed derived — a future authored row with
-- is_signal = false would have been silently ignored by the route rather than
-- rejected, and the disagreement would have been invisible until someone
-- noticed the dashboard was wrong. The constraint makes the invariant a
-- property of the table:
--
--   this table holds partner observations only; anything presented as computed
--   is computed at read time by lib/cfoSignals.ts.
--
-- Rollback: drop the constraint, then re-insert from 005_seed_fund_data.sql.
alter table public.anomalies
  drop constraint if exists anomalies_observations_only;

alter table public.anomalies
  add constraint anomalies_observations_only check (is_signal);

comment on table public.anomalies is
  'Partner observations only — things a human wrote down that are not in the schema (a lost client, bank discussions). Computed signals are NOT stored here: they are derived at read time from the company''s own quarters by lib/cfoSignals.ts, the same module the portfolio company''s own surface runs. The check constraint enforces that an authored row cannot pose as a computed one.';
