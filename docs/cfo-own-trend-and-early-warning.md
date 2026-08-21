# CFO surface — own trend history and early warning

Design for review. No code yet. Peer benchmarking is **not** in scope (deferred;
see `cfo-value-surface.md`).

## Why these two first

Neither needs a new RLS policy. Both read only the caller's own `quarters`,
which a `submit` user already reads under `006_tenancy_rls.sql`. That means no
aggregate function, no anonymisation surface, and nothing that could leak
another company's figures — the entire risk surface of this project sits in
benchmarking, which is deferred.

They also compound: the trend view is what makes the submission form stop
feeling like a void, and the warning rules compute from the same series.

---

## 1. Own trend history

A `History` tab in the Submit app showing what this company has filed.

**Columns**, all from `quarters`, plus three derived:

| Shown | Source |
|---|---|
| Revenue, gross margin, EBITDA margin | `turnover`, `gross`, `op + depreciation_amortisation` |
| Cash, debtors, creditors, net assets | stored directly |
| Debtor days (collection speed) | `debtors / turnover × 91` |
| Creditor days | `creditors / cos × 91` |
| Cash conversion cycle | debtor days + stock days − creditor days |

EBITDA is `op + depreciation_amortisation` — there is no EBITDA column, and every
rule below reconstructs it the same way.

**States.** First-ever submission shows the single quarter with no deltas rather
than an empty chart. Fewer than 6 quarters disables the band-based rule below
(see thresholds) and says so, rather than computing a band from two points.

---

## 2. Early warning

Four rules. Each fires on a **movement**, never on a level, and never on the
company as a whole — no overall score, no rating, nothing that ranks.

| Rule | Fires when | Needs |
|---|---|---|
| Working-capital divergence | creditors up ≥10% QoQ **and** debtors down ≥10% QoQ | 2 quarters |
| Revenue/cash divergence | turnover up ≥10% QoQ **and** cash flat (±2%) or down | 2 quarters |
| Margin outside band | gross margin outside trailing-6Q mean ±2σ | 7 quarters |
| Collection speed | debtor days up ≥15% vs trailing-4Q mean | 5 quarters |

**Thresholds are a starting point, not settled.** They should be tuned against
real submissions once the pilot has them; synthetic data cannot tell us the
false-positive rate. Until then the rules are deliberately conservative — a rule
that fires constantly trains the CFO to ignore it, which is worse than silence.

**Not included: receivables ageing.** No ageing buckets exist in the schema, only
a `debtors` total. The fourth rule is labelled **collection speed**, and the word
"ageing" is not used anywhere in this surface. Real ageing needs either a new
submission field or the QuickBooks integration.

### Where the rules live

A pure module, `lib/cfoSignals.ts`:

```ts
export function cfoSignals(quarters: Quarter[]): CfoSignal[]
```

No I/O, no session, no database. That buys three things: it is unit-testable
deterministically (the pattern already used for `contextForRole`), it needs no
new endpoint since the Submit app already holds its own quarters via
`useQuarters`, and — most importantly — **the GP feed can later compute from the
same module**, so the two sides cannot drift into disagreeing about what fired.

Today the GP's `anomalies` rows are authored content. Pointing both at one module
is the path to making them genuinely the same signals, which is what "what your
investor will see" has to mean to be honest.

### Wording

Generated from the rule that fired, not reused from `anomalies` — those rows
carry partner actions ("place on the watch-list", "suspend pending drawdown
approvals") and would read as surveillance.

Shape: *what moved* → *what the investor sees* → *an invitation, not an
instruction*.

> **Creditor days rose while debtor days fell.**
> Your investor's dashboard flags this pattern. If there's a reason — a supplier
> renegotiation, a large collection landing after quarter end — it's worth noting
> on your next submission.

Not: "Warning", "deterioration", "below average", "action required", or any
red/amber/green on the company.

French is written, not machine-translated. The tone is the feature; a stiff
translation reads as more accusatory than the English.

---

## The one schema change

Per the simultaneity decision — per-fund setting, defaulting to CFO and GP seeing
signals at the same time:

```sql
alter table public.funds
  add column cfo_signals_simultaneous boolean not null default true;
```

Additive, defaulted, and read by nothing until the code ships — the same
expand/contract shape used in Phase 2. When `false`, the CFO surface withholds a
signal until the GP has seen it; the mechanism for "has seen it" is deliberately
**not** specified here, because tracking GP views is the thing we agreed not to
build in the other direction and needs its own thought.

No new RLS policy: a `submit` user reads their own fund's row through the
existing `funds` policy... **except that policy currently restricts `funds` to
`gp` and `lp`.** A `submit` user cannot read `funds` at all today. Either the
flag moves to `companies` (which submit can read), or the `funds` policy gains
`submit` for its own company's fund. **Recommend putting it on `companies`** — it
avoids widening a policy, and per-company override is probably what a GP would
want anyway.

---

## Verification

**Deterministic, no model involved.** `cfoSignals` is pure, so it gets a fixture
suite: crafted series that must fire each rule, plus near-miss series that must
*not* fire (creditors up 9.5% must be silent where 10% fires). Rule boundaries
are where false positives live.

**Real fixtures already exist.** The quarterly data generated for the GP anomaly
feed was built so specific divergences compute exactly — Halcyon's margin break
and collection slowdown, Atelier's working-capital tightening. Running
`cfoSignals` over those series should fire the matching rules. If it does not,
either the rules or the anomaly text is wrong, and that disagreement is itself
the finding.

**Adversarial, same standard as earlier phases.** A `submit` user must see
signals for their own company and nothing else; confirm with a second company's
series present in the database that none of it appears. Positive control: the
same rule fires for the company that owns the data. Both breakpoints, per the
standing parity rule.

---

## Outstanding: the GP feed does not compute from this module

**"What your investor will see" is not literally true yet.** The CFO surface
computes its signals from `lib/cfoSignals.ts` against the company's own
quarters. The GP's anomaly feed does not — those are authored rows in the
`anomalies` table, written by hand. The two sides can therefore disagree, and
already do.

The live example: Halcyon's anomaly describes a collection slowdown, and the
rule stays silent on it. Debtor days are 25.93 against a trailing four-quarter
mean of 22.81 — a rise of 13.7%, under the declared 15% threshold. The
threshold was deliberately left alone rather than moved to make the two agree,
because tuning a rule so a synthetic company lights up is exactly what
`THRESHOLDS` warns against. `scripts/test-cfo-signals.mjs` asserts the
agreement and fails on it on purpose, so the gap stays visible.

Until the GP feed computes from the same module, the honest reading of the CFO
surface is "here is what your own figures show", not "here is what your
investor sees". The wording on the surface is a claim the architecture does not
yet support.

Closing it means deriving the GP anomaly rows from `cfoSignals` rather than
authoring them — at which point a disagreement becomes impossible by
construction rather than by discipline. The partner-authored observations are a
separate thing and should stay authored; they are already labelled as entered
by the deal team rather than computed.

## Open, still

1. **Thresholds.** Guesses until real submissions exist.
2. **Where the flag lives** — `companies` vs widening the `funds` policy.
   Recommendation above; wanted your call before building.
3. **Does a fired signal notify?** In-app only for now. Email would make this
   feel like being chased, which is the thing the project exists to avoid.
