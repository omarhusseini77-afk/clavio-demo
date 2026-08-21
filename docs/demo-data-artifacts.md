# Known demo-data artifacts

Things about the synthetic dataset that are internally odd but are **not false
claims**. Recorded so they are not rediscovered as bugs, and so nobody "fixes"
one at a cost out of proportion to the problem.

The distinction that matters: an *artifact* is data that is strange. A *false
claim* is text asserting something the data does not support. False claims were
removed (see `git log` around "Make the anomaly feed derivable"). Artifacts are
listed here and left alone.

---

## Marlow & Reed: quarterly and annual data cover different periods

**What.** The 13 quarterly rows run `Q1 FY19 → Q1 FY22`. The annual accounts are
`FY23, FY24, FY25`. They do not overlap, and the quarterly figures do not roll
up into any annual row.

**Why it is left as-is.** Relabelling the quarters to FY23–FY25 was considered
and rejected. The periods would line up but the figures would then contradict
each other in a way a reader could check by subtraction:

| | Quarters sum | Annual | Diff |
|---|---|---|---|
| FY23 | 3,293,984 | 3,280,000 | +0.4% |
| FY24 | 3,006,188 | 3,610,000 | **−16.7%** |
| FY25 | 3,801,446 | 3,980,000 | −4.5% |

Year-end balances differ too (debtors 811,814 vs 692,000; creditors 609,016 vs
412,000). Relabelling would convert "different periods" into "same periods,
contradictory figures" — strictly worse.

Making them tie would mean restating all 13 quarters, which changes the demo's
headline numbers (£1.02m turnover, £3.55m net assets, the performance-trend
chart). That is a large blast radius for an inconsistency that misstates
nothing.

**When it resolves.** On its own, when real pilot data replaces the synthetic
set: one company, one source, one set of periods.

**Do not** relabel the quarters without also restating them, and do not restate
the annual accounts — the LP commentary is computed against those figures and
currently checks out.

---

## Two companies are supervised but not LP-facing

Halcyon Textiles and Sentinel Security NW carry `in_portfolio = false`. They have
quarterly submissions and appear in the GP anomaly feed, but `/api/fund-data`
filters them out of the LP portfolio.

Not a bug. It models a company under monitoring that is not presented to
investors. Worth knowing before wondering why the GP sees six companies and the
LP sees four.

---

## Currencies are mixed

GBP for Marlow & Reed, Abington, Halcyon and Sentinel; EUR for Delacourt and
Atelier Saint-Pierre. Ratios (margins, DSO, growth) compare across the fund
safely. Absolute figures do not, and there is no FX policy in the schema. Any
future feature that sums or ranks absolute values across companies has to solve
this first.

---

## The value bridge is illustrative, and says so

Only the endpoints (£16.9M invested, £23.5M current) come from the database. The
attribution between them is not derivable — the schema holds no entry/exit
multiples, debt paydown history or FX rates. It carries an `ILLUSTRATIVE` badge
and a note, in the same visible way the forecast carries `PROJECTED`.

## Marlow & Reed's depreciation was zeroed and reconstructed (21 Aug 2026)

While verifying the CFO History tab, `POST /api/seed` wiped Marlow & Reed's 13
quarters and re-inserted them from `clavio_seed_data.json`, which carried no
`depreciation_amortisation` column. The company's D&A went to 0, and with it
every EBITDA figure the History tab and the margin rules compute.

The values were reconstructed, not invented. Seven of the thirteen quarters had
been rendered on screen before the wipe, and in all seven D&A was exactly
**12.00% of fixed assets**. That rule was applied to all thirteen rows and then
checked back against those seven EBITDA totals, which reconcile exactly.

`clavio_seed_data.json` now carries the column, so a future re-seed reproduces
the same figures instead of dropping them.

**The cause is fixed too.** `/api/seed` used to wipe and re-insert whenever the
row count differed from the seed file's 13 — which meant every genuine filing
was deleted on the next page load, while the confirmation screen said the GP
dashboard had been updated. It is now bootstrap-only: it seeds an empty table
and removes malformed `Period:`-prefixed rows, and otherwise leaves the data
alone.
