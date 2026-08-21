# Closing the GP/CFO computation gap

Design for review. No code yet.

The CFO surface computes from `lib/cfoSignals.ts`. The GP's "Anomaly Detection"
list does not — those are authored rows in `anomalies`, under a subtitle that
says *"Computed from submitted quarterly figures."* This makes the two sides
capable of disagreeing, and they already do.

The goal is that disagreement becomes **impossible by construction**: one
module, one set of thresholds, both surfaces reading its output.

---

## What is in the `anomalies` table today

Six rows, in two groups that the column name unhelpfully inverts.

| `is_signal` | Rendered as | Count | Authored? | Honest? |
|---|---|---|---|---|
| `true` | Partner Observations | 2 | yes | **yes** — labelled "Entered by the deal team · not derived from submitted figures" |
| `false` | Anomaly Detection | 4 | yes | **no** — labelled "Computed from submitted quarterly figures", and is not |

The two `is_signal = true` rows are the legitimate ones: a partner writing down
"lost a client >5% of revenue", "bank discussions", "will miss next target".
None of that is in the schema and none of it should be. They stay.

The four `is_signal = false` rows are the problem.

## Handling of each authored row: **retire, not migrate**

Migration is not available for any of them, because in every case the computed
equivalent measures something different from what the authored text claims.
Rewriting the text to match would just be authoring again.

| Row | Computed equivalent | Verdict |
|---|---|---|
| Halcyon — *EBITDA margin contracted 4.2pp* | `ebitda-margin-outside-band` fires: 7.8% against a trailing band of 11.74–12.26% | **Retire.** Real signal replaces it. The row's second sentence, "bad debt also up 14% on receivables", is not derivable from any column and dies with it. |
| Sentinel — *Reported EBITDA inconsistent with prior pattern* | `ebitda-margin-outside-band` fires: 14.0% against 14.48–15.52% | **Retire.** Real signal replaces it, with the actual numbers rather than a claim about 2σ. |
| Atelier — *Working capital tightened for second consecutive quarter* | `cash-conversion-extending` fires: 74.7 → 85.0 days, +10.3 over 2 quarters | **Retire.** The authored text says "18 days vs. the same period last year" — a different comparison against a different baseline. The computed one is the defensible measure. |
| Halcyon — *Collection speed slowed* | **nothing fires.** Debtor days 25.93 vs a trailing-4Q mean of 22.81 = +13.7%, under the 15% threshold | **Retire.** Per your instruction the threshold does not move. Retiring the row is what makes the two surfaces consistently silent instead of one describing what the other omits. |

Net effect on the demo: Halcyon, Sentinel and Atelier each show one genuinely
computed item; Halcyon loses its second. Three computed items where there were
four authored ones.

## Where the computation runs

Server-side in `/api/fund-data`, not in the browser.

It already queries under the caller's session and lets RLS decide. It gains one
query — all quarters visible to the caller — groups them by company, and runs
`cfoSignals` per group. A GP sees their own fund's companies because
`006_tenancy_rls.sql` scopes `quarters` that way. An LP sees none, because that
same policy admits only `gp` and `submit`; the computed list arrives empty for
an investor without this route deciding anything, which is the property the
route was built to have.

Note this is a wider read than the dashboard's chart, which stays scoped to one
company via `/api/quarters`. That is already true of the anomaly feed today —
it covers four companies while the chart shows one — so nothing changes there.

## The three things that have to be decided

### 1. Severity — recommend dropping it from computed items

Authored rows carry `red` / `amber`. A computed signal has no severity: the rule
fired or it did not. Deriving one from how far past the threshold a value sits
would be inventing a model and presenting it as measurement, which is the exact
failure being fixed.

**Recommendation:** computed items render in a single neutral treatment. Red and
amber survive only on the partner observations, where a human judgement is
behind them and the label already says so.

This is a visible change to the dashboard — the red and amber dots on the
anomaly list go away. Worth saying out loud, because it makes the demo look
calmer, and if you would rather keep the colour the honest way to do it is a
partner setting a severity by hand, not a formula.

### 2. Recommended actions — generated per rule, and relabelled

The Investigate modal's action lists are authored per company ("Place Halcyon
Textiles on the formal watch-list"). Those die with their rows.

**Recommendation:** generate them per rule in a GP-voiced sibling of
`cfoSignalText`, so `ebitda-margin-outside-band` always suggests the same
starting points regardless of which company tripped it. They stop being
company-specific narrative and become what they honestly are: standard next
steps for that class of movement.

They also need relabelling. "Recommended Actions" reads as a system
recommendation; these are suggestions attached to a rule. **"Suggested next
steps"**, with a line noting they follow from the rule rather than from the
company's situation.

### 3. Wording — same numbers, different voice

The GP and the CFO should not read identical prose; one is being told what their
investor sees, the other is looking at a portfolio. But both must quote the same
figures, so both take them from `signal.detail` rather than restating them.

Proposed: `lib/signalText.ts` holding both voices side by side —
`cfoSignalCopy` moves there and `gpSignalCopy` joins it — so a change to one is
made looking directly at the other.

**Identical** therefore means: same rule ids, same periods, same numbers. Not
same sentences.

## Sequencing

Expand/contract, and specifically arranged so there is never a window where the
dashboard shows duplicates or shows nothing.

1. **Code deploy.** `/api/fund-data` computes the list and stops reading
   `is_signal = false` rows entirely. The authored rows become inert the moment
   this lands — not deleted, just unread. The dashboard goes straight from four
   authored items to three computed ones with no intermediate state.
2. **Migration `010`, cleanup only.** Deletes the four inert rows. Can run any
   time after step 1, or not at all; nothing reads them either way.

Rollback is reverting the code commit, at which point the rows are read again —
which is why the delete is a separate, later step rather than part of the same
change.

## Verification

**The fixture changes, and this needs your eye.** `scripts/test-cfo-signals.mjs`
currently asserts that each rule fires where an authored row describes it, and
fails on Halcyon's collection speed. Once the authored rows are gone there is
nothing left to reconcile against — the assertion's subject is being deleted, so
keeping it is not possible and passing it is not an achievement.

It is replaced by the assertion that actually matters:

> For every company, the signals the GP feed produces are identical — same
> ids, same periods, same numbers — to the signals the CFO surface produces.

That is a stronger check than the one it replaces, because it can fail. If the
two paths ever diverge, it goes red.

Flagging it explicitly because "the failing test now passes" is exactly what a
quietly weakened test looks like, and you should be able to tell the difference
without taking my word for it.

Alongside it, the same discipline as earlier phases:

* **Identical-output check run against the live database**, per company, both
  paths — not two calls to the same function, but the GP route's output compared
  against the CFO component's input.
* **Halcyon is silent on collection speed on both surfaces.** Confirmed by
  looking at both, not inferred from one.
* **Positive control:** Halcyon, Sentinel and Atelier each still produce their
  computed item, so the silence is a rule not firing rather than the feature
  being broken.
* **LP sees no computed signals**, confirmed by logging in as one rather than
  by reasoning about the policy.
* **Partner observations still render** and stay visually separated.
* Both breakpoints, per the standing parity rule.

## What this does not close

The GP dashboard would then compute from the same module as the CFO surface.
It would still be the case that **nothing enforces that they stay pointed at
it** — a future authored row inserted with `is_signal = false` would be silently
ignored rather than rejected. A `check` constraint forbidding those rows would
make it structural. Worth doing; not in this change unless you want it.
