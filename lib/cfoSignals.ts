import type { Quarter } from './supabase'
import { periodSeq } from './quartersScope'

// Divergence rules computed from a company's own submitted quarters.
//
// Pure on purpose: no I/O, no session, no database. That makes it
// deterministically testable, needs no new endpoint (the Submit app already
// holds its own quarters), and — the real reason — means the GP feed can
// eventually compute from this same module. "Here is what your investor will
// see" is only honest if it is literally the same computation.
//
// Every rule fires on a MOVEMENT, never on a level, and never on the company as
// a whole. No score, no rating, nothing that ranks. A CFO who feels measured
// disengages, which inverts the point of the feature.

const DAYS_IN_QUARTER = 91

export type CfoSignalId =
  | 'working-capital-divergence'
  | 'revenue-cash-divergence'
  | 'gross-margin-outside-band'
  | 'ebitda-margin-outside-band'
  | 'collection-speed'
  | 'cash-conversion-extending'

export interface CfoSignal {
  id: CfoSignalId
  /** Period the signal fired on. */
  period: string
  /** Numbers behind it, so the UI can show the working rather than assert. */
  detail: Record<string, number>
}

// ---------------------------------------------------------------------------
// THRESHOLDS — DECLARED GUESSES.
//
// These have never been calibrated against real submissions. They were chosen
// to be conservative, because a rule that fires constantly trains the CFO to
// ignore it, which is worse than silence.
//
// They are deliberately NOT tuned to look good against the synthetic dataset.
// Whether they are right is an empirical question that needs real quarters from
// the pilot company; until then, treat any firing rate as meaningless.
// ---------------------------------------------------------------------------
export const THRESHOLDS = {
  /** Creditors up this much QoQ while debtors fall by the same. */
  workingCapitalPct: 10,
  /** Revenue up this much QoQ while cash fails to follow. */
  revenueGrowthPct: 10,
  /** Cash counts as "flat" inside this band, either direction. */
  cashFlatPct: 2,
  /** Standard deviations from the trailing mean before a margin break fires.
   *  Applied to gross and EBITDA margin separately — they mean different
   *  things, so collapsing them into one rule loses the distinction. */
  marginSigma: 2,
  /** Quarters in the trailing window for the margin band. */
  marginWindow: 6,
  /** Debtor days above the trailing mean before collection speed fires. */
  collectionPct: 15,
  /** Quarters in the trailing window for collection speed. */
  collectionWindow: 4,
  /** Consecutive quarters the cash conversion cycle must lengthen. */
  cccConsecutiveQuarters: 2,
  /** Days the cycle must extend across those quarters before firing. */
  cccExtensionDays: 5,
} as const

const pctChange = (now: number, then: number) =>
  then === 0 ? 0 : ((now - then) / Math.abs(then)) * 100

const mean = (xs: number[]) => xs.reduce((s, x) => s + x, 0) / xs.length
const stdDev = (xs: number[]) => {
  const m = mean(xs)
  return Math.sqrt(mean(xs.map(x => (x - m) ** 2)))
}

/** EBITDA is not a stored column. */
export const ebitda = (q: Quarter) =>
  (q.op ?? 0) + (q.depreciation_amortisation ?? 0)

export const grossMarginPct = (q: Quarter) =>
  q.turnover === 0 ? 0 : (q.gross / q.turnover) * 100

export const ebitdaMarginPct = (q: Quarter) =>
  q.turnover === 0 ? 0 : (ebitda(q) / q.turnover) * 100

/** Stock days. Part of the cash conversion cycle. */
export const stockDays = (q: Quarter) =>
  q.cos === 0 ? 0 : (q.stock / q.cos) * DAYS_IN_QUARTER

/** Debtor days + stock days - creditor days. How long cash is tied up between
 *  paying for inputs and being paid for output. */
export const cashConversionCycle = (q: Quarter) =>
  debtorDays(q) + stockDays(q) - creditorDays(q)

/** Debtor days. Labelled "collection speed" in the UI — never "ageing", which
 *  would imply 30/60/90 buckets the schema does not hold. */
export const debtorDays = (q: Quarter) =>
  q.turnover === 0 ? 0 : (q.debtors / q.turnover) * DAYS_IN_QUARTER

export const creditorDays = (q: Quarter) =>
  q.cos === 0 ? 0 : (q.creditors / q.cos) * DAYS_IN_QUARTER

export function cfoSignals(input: Quarter[]): CfoSignal[] {
  const qs = [...input].sort((a, b) => periodSeq(a.period) - periodSeq(b.period))
  if (qs.length < 2) return []

  const latest = qs[qs.length - 1]
  const prev = qs[qs.length - 2]
  const out: CfoSignal[] = []

  // Paying suppliers later while collecting sooner — or the reverse. Either way
  // the two sides of working capital moved against each other.
  const creditorsChange = pctChange(latest.creditors, prev.creditors)
  const debtorsChange = pctChange(latest.debtors, prev.debtors)
  if (creditorsChange >= THRESHOLDS.workingCapitalPct && debtorsChange <= -THRESHOLDS.workingCapitalPct) {
    out.push({
      id: 'working-capital-divergence',
      period: latest.period,
      detail: { creditorsChange, debtorsChange },
    })
  }

  // Revenue growing without cash following it.
  const revenueChange = pctChange(latest.turnover, prev.turnover)
  const cashChange = pctChange(latest.cash, prev.cash)
  if (revenueChange >= THRESHOLDS.revenueGrowthPct && cashChange <= THRESHOLDS.cashFlatPct) {
    out.push({
      id: 'revenue-cash-divergence',
      period: latest.period,
      detail: { revenueChange, cashChange },
    })
  }

  // Margin outside its own trailing band, checked on BOTH margins because they
  // say different things: gross moving points at pricing or input costs, while
  // EBITDA moving with gross flat points at overhead or a one-off. Collapsing
  // them into one rule would hide which of the two happened.
  //
  // Needs a full window plus the latest quarter — a band from two points is
  // noise, so it stays silent rather than guessing.
  if (qs.length >= THRESHOLDS.marginWindow + 1) {
    const window = qs.slice(-(THRESHOLDS.marginWindow + 1), -1)

    const bandBreak = (metric: (q: Quarter) => number) => {
      const series = window.map(metric)
      const m = mean(series)
      const sd = stdDev(series)
      const current = metric(latest)
      if (sd <= 0) return null
      const lower = m - THRESHOLDS.marginSigma * sd
      const upper = m + THRESHOLDS.marginSigma * sd
      if (current >= lower && current <= upper) return null
      return { current, trailingMean: m, lower, upper }
    }

    const gross = bandBreak(grossMarginPct)
    const ebit = bandBreak(ebitdaMarginPct)

    if (gross) {
      out.push({ id: 'gross-margin-outside-band', period: latest.period, detail: gross })
    }
    if (ebit) {
      out.push({
        id: 'ebitda-margin-outside-band',
        period: latest.period,
        // Whether gross held steady is the whole diagnostic value here, so it
        // travels with the signal rather than being re-derived by the UI.
        detail: { ...ebit, grossHeldSteady: gross ? 0 : 1 },
      })
    }
  }

  // Taking longer to get paid than this company usually does.
  if (qs.length >= THRESHOLDS.collectionWindow + 1) {
    const window = qs.slice(-(THRESHOLDS.collectionWindow + 1), -1).map(debtorDays)
    const trailingMean = mean(window)
    const current = debtorDays(latest)
    const change = pctChange(current, trailingMean)
    if (change >= THRESHOLDS.collectionPct) {
      out.push({
        id: 'collection-speed',
        period: latest.period,
        detail: { current, trailingMean, change },
      })
    }
  }

  // Cash tied up for longer, quarter after quarter. Distinct from the
  // working-capital divergence rule, which needs debtors to fall: a company can
  // stretch payables AND collect more slowly at the same time, and that pattern
  // was invisible until this rule existed.
  const needed = THRESHOLDS.cccConsecutiveQuarters
  if (qs.length >= needed + 1) {
    const window = qs.slice(-(needed + 1))
    const cycle = window.map(cashConversionCycle)
    let rising = true
    for (let i = 1; i < cycle.length; i++) if (cycle[i] <= cycle[i - 1]) rising = false
    const extension = cycle[cycle.length - 1] - cycle[0]
    if (rising && extension >= THRESHOLDS.cccExtensionDays) {
      out.push({
        id: 'cash-conversion-extending',
        period: latest.period,
        detail: {
          current: cycle[cycle.length - 1],
          from: cycle[0],
          extensionDays: extension,
          quarters: needed,
        },
      })
    }
  }

  return out
}
