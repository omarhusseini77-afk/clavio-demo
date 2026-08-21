import type { Loc, Lang } from './loc'
import { loc } from './loc'
import type { FundDataPayload, Anomaly, CapitalEvent, DocItem } from './fundTypes'
import type { Quarter } from './supabase'
import { periodSeq } from './quartersScope'

// The in-app notification bells, derived from real events.
//
// These were two hardcoded arrays in app/gp/page.tsx and app/lp/page.tsx —
// authored text presented as if the system had noticed something, the same
// pattern removed from the anomaly feed. Every item below now comes from a row
// that exists, with the date that row actually carries.
//
// RETIRED, NOT REWRITTEN: the GP "watch-list flag" bell. There is no watch-list
// in the schema and no event behind it, so there was nothing to derive it from
// and no timestamp to give it. Rewriting the sentence would have been authoring
// again, one step further from the data. It is simply gone.

export type NotificationType = 'call' | 'distribution' | 'document' | 'anomaly' | 'submission'

export interface DerivedNotification {
  id: string
  type: NotificationType
  title: string
  body: string
  /** Real date from the underlying row, formatted for display. */
  time: string
  read: boolean
  /** Sorting key — the actual event date, not the display string. */
  at: number
}

const fmtDate = (d: Date, lang: Lang) =>
  d.toLocaleDateString(lang === 'fr' ? 'fr-FR' : 'en-GB', { day: 'numeric', month: 'short', year: 'numeric' })

// Anything filed or dated within this window reads as new. Not a judgement
// about importance — just recency, which is all a bell can honestly claim.
const UNREAD_DAYS = 14
const isRecent = (d: Date) => Date.now() - d.getTime() < UNREAD_DAYS * 86_400_000

/**
 * GP bells: what a portfolio company actually filed, and what the shared rule
 * module actually computed. Both are real events with real timestamps.
 */
export function gpNotifications(
  quarters: Quarter[],
  anomalies: Anomaly[],
  lang: Lang,
  companyName: string | null,
): DerivedNotification[] {
  const out: DerivedNotification[] = []

  // Most recent filing. created_at is the moment it was received, which is what
  // a "new submission" notice is actually about — but a bulk insert gives every
  // row the same timestamp to the millisecond, and the first row of the file
  // then wins. Ties break on the period instead, so the notice names the latest
  // quarter rather than the oldest one that happened to be inserted first.
  const filed = [...quarters]
    .filter(q => q.created_at)
    .sort((a, b) =>
      Date.parse(b.created_at!) - Date.parse(a.created_at!) ||
      periodSeq(b.period) - periodSeq(a.period))[0]
  if (filed?.created_at) {
    const at = new Date(filed.created_at)
    const name = companyName ?? (lang === 'fr' ? 'Une société du portefeuille' : 'A portfolio company')
    out.push({
      id: `sub-${filed.id}`,
      type: 'submission',
      title: lang === 'fr' ? `Nouvelle transmission — ${name}` : `New submission — ${name}`,
      body: lang === 'fr'
        ? `${name} a transmis ses chiffres pour ${filed.period}.`
        : `${name} filed its ${filed.period} figures.`,
      time: fmtDate(at, lang),
      read: !isRecent(at),
      at: at.getTime(),
    })
  }

  // Computed signals only. Partner observations are authored by design and
  // carry no event or timestamp, so they do not become bells — they are
  // already on the dashboard, labelled as entered by the deal team.
  for (const a of anomalies.filter(x => x.computed)) {
    out.push({
      id: `sig-${a.company}-${a.title.en}`.slice(0, 80),
      type: 'anomaly',
      title: lang === 'fr' ? `Signal calculé — ${a.company}` : `Computed signal — ${a.company}`,
      body: loc(a.title as Loc, lang),
      // The period the rule fired on IS the event's date, to the extent one
      // exists. Shown as the period rather than invented as a timestamp.
      time: a.period ?? '',
      read: false,
      at: a.period ? periodSeq(a.period) : 0,
    })
  }

  return out.sort((a, b) => b.at - a.at)
}

/**
 * LP bells: capital events and documents. Both are rows with real dates.
 */
export function lpNotifications(
  events: CapitalEvent[],
  documents: DocItem[],
  lang: Lang,
): DerivedNotification[] {
  const out: DerivedNotification[] = []

  for (const e of events) {
    const label = loc(e.date, lang)
    const parsed = Date.parse(label)
    out.push({
      id: `evt-${e.type}-${label}-${e.amount}`,
      type: e.type,
      title: loc(e.label, lang),
      body: e.type === 'call'
        ? (lang === 'fr' ? `Appel de capital de ${e.amount.toLocaleString('fr-FR')}.` : `Capital call of ${e.amount.toLocaleString('en-GB')}.`)
        : (lang === 'fr' ? `Distribution de ${e.amount.toLocaleString('fr-FR')}.` : `Distribution of ${e.amount.toLocaleString('en-GB')}.`),
      time: label,
      // Read state follows the row's own date, not an authored flag.
      read: Number.isNaN(parsed) ? true : !isRecent(new Date(parsed)),
      at: Number.isNaN(parsed) ? 0 : parsed,
    })
  }

  for (const d of documents) {
    const parsed = Date.parse(d.date)
    out.push({
      id: `doc-${d.id}`,
      type: 'document',
      title: loc(d.title, lang),
      body: lang === 'fr'
        ? `${loc(d.type, lang)} disponible dans votre portail.`
        : `${loc(d.type, lang)} available in your portal.`,
      time: d.date,
      // is_new is a real column on the row, so it is used where it exists.
      read: !d.isNew,
      at: Number.isNaN(parsed) ? 0 : parsed,
    })
  }

  return out.sort((a, b) => b.at - a.at)
}

/** Convenience for the GP page, which holds the whole payload. */
export function gpNotificationsFrom(
  quarters: Quarter[],
  data: FundDataPayload | null,
  lang: Lang,
): DerivedNotification[] {
  return gpNotifications(quarters, data?.anomalies ?? [], lang, data?.quartersCompany ?? null)
}
