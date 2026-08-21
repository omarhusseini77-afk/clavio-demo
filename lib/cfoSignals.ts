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
  | 'margin-outside-band'
  | 'collection-speed'

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
  /** Standard deviations from the trailing mean before a margin break fires. */
  marginSigma: 2,
  /** Quarters in the trailing window for the margin band. */
  marginWindow: 6,
  /** Debtor days above the trailing mean before collection speed fires. */
  collectionPct: 15,
  /** Quarters in the trailing window for collection speed. */
  collectionWindow: 4,
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
  (q.op ?? 0) + ((q as { depreciation_amortisation?: number }).depreciation_amortisation ?? 0)

export const grossMarginPct = (q: Quarter) =>
  q.turnover === 0 ? 0 : (q.gross / q.turnover) * 100

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

  // Margin outside its own trailing band. Needs a full window plus the latest
  // quarter — a band computed from two points is noise, so it stays silent
  // rather than guessing.
  if (qs.length >= THRESHOLDS.marginWindow + 1) {
    const window = qs.slice(-(THRESHOLDS.marginWindow + 1), -1).map(grossMarginPct)
    const m = mean(window)
    const sd = stdDev(window)
    const current = grossMarginPct(latest)
    const lower = m - THRESHOLDS.marginSigma * sd
    const upper = m + THRESHOLDS.marginSigma * sd
    if (sd > 0 && (current < lower || current > upper)) {
      out.push({
        id: 'margin-outside-band',
        period: latest.period,
        detail: { current, trailingMean: m, lower, upper },
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

  return out
}
