# CFO value surface — design

Status: **design only, no code.** Open questions at the end need answers before
any build.

## Why

Clavio is currently one-directional from the portfolio company's side: the CFO
submits, the fund receives, the CFO gets nothing. Two practitioners have
independently named data collection as the unsolved problem — operators resist
being chased. The bet is that giving the CFO something they'd open on their own
changes the collection problem instead of managing it.

**Framing rule, applies to every screen below.** This is advance notice, not
scorekeeping. The CFO sees what their investor is about to see, before the
investor asks. Nothing may read as ranking, grading or surveillance: a CFO who
feels measured by this engages *less*, which inverts the entire point. Practical
consequences — no leaderboards, no percentile rank of the company itself, no
"you are below average" phrasing, no red/amber/green on the company as a whole.
Signals attach to *a number moving*, never to the company as an entity.

## What the data actually supports

This matters more than the feature list, because it decides what is buildable.

| Company | Sector | Cur | FY25 revenue | GM% | EBITDA% | Recv/rev |
|---|---|---|---|---|---|---|
| Delacourt Frères | F&B Distribution | EUR | 13,680,000 | 26 | 8.2% | 19.3% |
| Abington Technical | B2B Services | GBP | 8,240,000 | 54 | 23.3% | 18.1% |
| Atelier Saint-Pierre | Specialty Mfg | EUR | 4,210,000 | 36 | 12.1% | 21.1% |
| Marlow & Reed | Manufacturing | GBP | 3,980,000 | 43 | 26.1% | 17.4% |
| Halcyon Textiles | Textiles | GBP | — | — | — | — |
| Sentinel Security NW | B2B Services | GBP | — | — | — | — |

Five facts that constrain everything:

1. **Only four companies have financials at all.** For any given CFO the peer
   set is **three**.
2. **Gross margin bands do not overlap and are sector-determined**: 26 / 36 / 43
   / 54. Margin is effectively a company identifier in this fund.
3. **Mixed currency** (GBP/EUR). Ratios are comparable; absolute figures are not
   without an FX policy.
4. **Only one company submits quarterly.** The other three exist as annual
   figures only. Self-data is quarterly, peer data is annual.
5. **There is no receivables ageing data.** `quarters` carries a single
   `debtors` total — no 30/60/90 buckets. The GP anomaly text mentioning "18% in
   the 30+ day bucket" is authored narrative, not a derived figure.

---

## 1. Own trend history — build first

Quarter-over-quarter view of the CFO's own submitted figures: revenue, gross
margin, EBITDA margin, cash, debtors, creditors, net assets, plus derived DSO and
DPO.

**Access:** none new. The CFO already reads their own `quarters` rows under the
Phase 3 policy. Zero new policies, zero new aggregates, no anonymisation
surface.

**Why first:** it is the only one of the three with no privacy question at all,
it is immediately useful ("what did we file last time?"), and it is the
foundation the early-warning rules compute from. It also makes the submission
form less of a void — the CFO sees their history accumulate.

---

## 2. Early warning on their own numbers — build second

The same divergence classes the GP dashboard shows, computed from the CFO's own
data and shown to them, captioned as *what your investor will see*.

All computable from `quarters` the CFO already owns:

| Signal | Rule (from own data) |
|---|---|
| Working-capital divergence | `creditors` up ≥10% QoQ while `debtors` down ≥10% |
| Revenue/cash divergence | `turnover` up ≥10% QoQ while `cash` flat (±2%) or down |
| Margin outside band | `gross/turnover` outside trailing-6Q mean ±2σ |
| Collection slowdown | DSO (`debtors/turnover × 91`) up ≥15% vs trailing-4Q mean |

**Not buildable as specified: receivables ageing.** There are no ageing buckets
in the schema. DSO is the honest substitute and is a proxy, not the same thing.
Real ageing requires either a new submission field (an ageing summary the CFO
enters) or the QuickBooks integration, which reports it natively. Recommend
labelling it "collection speed", not "ageing", until the data exists.

**Access:** none new. Computed server-side from the caller's own rows.

**Deliberately not reused:** the `anomalies` table. Those rows are GP-authored
narrative with recommended partner actions ("place on the watch-list", "suspend
drawdown approvals") — reading as surveillance is exactly the failure mode, and
the policy is GP-only for good reason. The CFO surface gets its own neutral
wording generated from the rule that fired.

**Tone:** "Your creditor days rose while debtor days fell — your investor's
dashboard flags this pattern. If there's a reason, it's worth noting on your next
submission." Not: "Warning: working capital deterioration."

---

## 3. Anonymised peer benchmarking — **do not build yet**

This is the part that cannot ship for this fund as currently constituted, and the
reason is arithmetic rather than caution.

### The minimum-N question, answered directly

**Recommended threshold: k ≥ 5 peers excluding the requesting company** (so a
fund of ≥6 companies with financials), plus a dominance rule: no single peer may
exceed 40% of the cohort's revenue, or the aggregate largely describes that one
company.

**This fund has 3 peers.** It is below threshold and the gap is not marginal.

### Why 3 peers is not merely "small" but actively disclosive

The anonymisation here is weaker than it first appears, for reasons specific to
this product:

- **Company identity is already public to LPs.** The LP portfolio tab names all
  four companies with sector and country. A CFO who has seen any investor
  material knows exactly who the other three are. Anonymisation is therefore only
  hiding *which figure belongs to whom* — a much weaker claim than hiding who is
  in the set.
- **Sector separates the values completely.** Gross margins 26 / 36 / 43 / 54,
  one per sector. Told "peer median gross margin is 36%", the Marlow & Reed CFO —
  who knows the fund holds a distributor, a services business and another
  manufacturer — can map values to companies with near-certainty.
- **Self-exclusion arithmetic.** With a 4-company fund, publishing any
  all-company statistic lets each CFO subtract their own known value and solve
  for the rest. Mean over 4 with one known value leaves 3 unknowns and one
  equation — but combined with sector priors, it collapses.
- **Min/max are individual disclosures.** With 3 peers, "highest peer margin" is
  one identifiable company's actual number. Range, min and max must never ship at
  any N this small.
- **Differencing across time.** If the cohort changes — a company is acquired or
  exits — the change in the aggregate between two periods reveals the departing
  company's figures. This bites at any N but is fatal at small N.

### What would make it viable

1. **Wait for fund size.** Gate the feature: it appears only when the fund has
   ≥6 companies with comparable data. Honest, costs nothing, and the UI can say
   so plainly.
2. **Pool across funds** (the real answer). Benchmark against all companies on
   Clavio in the same sector band, across every fund. N grows with the customer
   base and sector-matching becomes possible. **This breaks the current tenancy
   model deliberately and needs its own consent basis** — see below.
3. **External benchmark data.** Licensed sector datasets sidestep anonymisation
   entirely. Costs money; no inference risk; arguably more credible to a CFO than
   "three other companies your investor happens to own".

**Recommendation:** ship 1 and 2 above (own trend, early warning) now; gate peer
benchmarking behind the k-threshold; treat cross-fund pooling as its own project
with a consent and legal review, not a feature toggle.

### If it is built later, the required safeguards

- Median and interquartile range only. **Never** min, max, count-by-value, or
  the company's own percentile rank.
- k ≥ 5 peers enforced *inside* the aggregation, returning a suppressed state,
  never a smaller cohort silently.
- No sector-filtered sub-cohort unless that sub-cohort independently meets k.
- Ratios only (margins, DSO, growth %). No absolute currency values — this also
  sidesteps FX.
- Banded output ("peers sit between 30% and 40%") rather than point values.
- Frozen cohort membership per published period, with suppression when
  membership changes, to defeat differencing.
- Compare like periods: peers are annual today, self is quarterly. Use LTM on
  both sides or do not compare.

---

## Architecture and RLS impact

**Features 1 and 2 require no schema or policy changes at all.** Everything is
derived from the caller's own `quarters` rows, already readable under
`006_tenancy_rls.sql`. This is the main reason to build them first.

**Feature 3, whenever it happens, cannot be done with RLS alone.** A `submit`
user must never gain row access to another company. The only safe shape is a
`SECURITY DEFINER` aggregate function that returns pre-aggregated, k-checked
values and no rows:

```
public.peer_benchmark(metric text, period text)
  returns table (median numeric, q1 numeric, q3 numeric, cohort_size int, suppressed bool)
  security definer
  set search_path = public, pg_temp
```

That function becomes the security boundary, exactly like
`current_app_role()` today, and needs the same discipline: pinned `search_path`,
`execute` granted to `authenticated` only, caller's fund derived from
`current_fund_id()` rather than any argument, requesting company excluded from
its own cohort, and the k-check enforced before any value is returned. It must
also never accept a company id or fund id as a parameter — same rule as the
signed-URL route: identity comes from the session, never the caller.

A materialised aggregate table is the alternative if the function proves slow,
but it inherits a staleness problem and a second place for the k-check to be
forgotten. Prefer the function until measurements say otherwise.

## Bilingual

Same pattern as the rest of the product: `_en`/`_fr` pairs where content is
stored, `t()` keys where it is UI chrome. Signal explanations are generated text
and need real French, not machine translation — they carry the tone the framing
rule depends on, and a stiff translation will read as more accusatory than the
English.

---

## Open questions

1. **Does the CFO see the same signals the GP sees, always?** Simultaneous
   visibility is the honest reading of "advance notice", but it removes the GP's
   ability to raise something privately first. Some GPs will object. Is
   simultaneity a product principle or a per-fund setting?
2. **Is peer benchmarking core to the value proposition, or a nice-to-have?** If
   a CFO would only open this for benchmarking, deferring it means deferring the
   whole bet, and cross-fund pooling becomes urgent rather than a later project.
3. **Who is this for at the portfolio company?** A CFO with a finance team and an
   owner-operator doing their own books want very different surfaces. The pilot
   company is SME manufacturing — likely the latter.
4. **Cross-fund pooling: is that a promise you can make?** It needs each fund's
   agreement to contribute anonymised data, and probably sits in the LPA or the
   platform terms rather than a settings toggle.
5. **Does the GP see that the CFO saw it?** Useful to the GP, but it converts
   advance notice into monitoring and would poison the framing if the CFO learns
   of it. Recommend not building it; flagging because it will be requested.
6. **Ageing data: new submission field, or wait for QuickBooks?** Adding a field
   increases submission burden — the exact friction this project exists to
   reduce.
