import { NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import type { Anomaly, FundDataPayload } from '@/lib/fundTypes'
import type { Quarter } from '@/lib/supabase'
import { cfoSignals } from '@/lib/cfoSignals'
import { periodSeq } from '@/lib/quartersScope'
import { gpSignalCopy } from '@/lib/signalText'

// Everything the LP and GP views render, read under the caller's own session.
//
// This route deliberately does NOT re-implement authorisation. It issues the
// same queries for everyone and lets RLS decide what comes back — an LP's
// company_internals query simply returns []. Keeping the decision in Postgres
// means this handler cannot drift into being a second, weaker gate.
export async function GET() {
  const supabase = createClient()

  const { data: { user } } = await supabase.auth.getUser()
  if (!user) {
    return NextResponse.json({ error: 'Not authenticated' }, { status: 401 })
  }

  const [
    fundsRes, companiesRes, yearsRes, yearInternalsRes, companyInternalsRes,
    positionsRes, eventsRes, forecastsRes, documentsRes, anomaliesRes,
    allQuartersRes, quartersCompanyRes,
  ] = await Promise.all([
    supabase.from('funds').select('*').limit(1),
    supabase.from('companies').select('*').order('name'),
    supabase.from('company_years').select('*').order('fy'),
    supabase.from('company_year_internals').select('*'),
    supabase.from('company_internals').select('*'),
    supabase.from('lp_positions').select('*').limit(1),
    supabase.from('capital_events').select('*').order('event_date'),
    supabase.from('forecasts').select('*').limit(1),
    supabase.from('documents').select('*').order('sort_order'),
    supabase.from('anomalies').select('*, companies(name)').order('sort_order'),
    // Every quarter the caller may read, for the computed signals below. RLS
    // decides the scope: a GP gets their own fund's companies, an LP gets none
    // (006_tenancy_rls.sql admits only gp and submit), so the computed list
    // arrives empty for an investor without this handler deciding anything.
    supabase.from('quarters').select('*, companies(name)'),
    // Which company /api/quarters will scope to, so the dashboard can name it.
    // Must use the same rule as that route — most quarters filed — or the label
    // and the figures come from different companies.
    supabase.from('quarters').select('company_id, companies(name)'),
  ])

  const symbolFor = (currency: string) =>
    currency === 'EUR' ? '€' : currency === 'USD' ? '$' : '£'

  const f = fundsRes.data?.[0]
  const pos = positionsRes.data?.[0]
  const fc = forecastsRes.data?.[0]

  // Working capital arrives as separate rows, or not at all when RLS withheld
  // the table. Absent means absent — nothing here substitutes a placeholder.
  const yearInternals = new Map(
    (yearInternalsRes.data ?? []).map(i => [i.company_year_id, i])
  )
  const companyInternals = new Map(
    (companyInternalsRes.data ?? []).map(i => [i.company_id, i])
  )

  const payload: FundDataPayload = {
    fund: f ? {
      name: f.name,
      periodLabel: f.period_label,
      date: { en: f.as_of_label_en, fr: f.as_of_label_fr },
      vintageYear: f.vintage_year,
      totalInvested: Number(f.total_invested),
      currentGrossValue: Number(f.current_gross_value),
      grossIrr: Number(f.gross_irr),
    } : null,

    position: pos ? {
      commitment: Number(pos.commitment),
      called: Number(pos.called),
      unfunded: Number(pos.unfunded),
      distributed: Number(pos.distributed),
      nav: Number(pos.nav),
      shareOfFund: Number(pos.share_of_fund),
      tvpi: Number(pos.tvpi),
      dpi: Number(pos.dpi),
      rvpi: Number(pos.rvpi),
      irr: Number(pos.irr),
    } : null,

    companies: (companiesRes.data ?? [])
      .filter(c => c.in_portfolio)
      .map(c => {
        const internal = companyInternals.get(c.id)
        const years = (yearsRes.data ?? []).filter(y => y.company_id === c.id)
        const latest = years[years.length - 1]
        return {
          revenue: latest ? Number(latest.revenue) : 0,
          id: c.slug,
          name: c.name,
          sector: { en: c.sector_en, fr: c.sector_fr },
          country: { en: c.country_en, fr: c.country_fr },
          sym: symbolFor(c.currency),
          status: c.status,
          moic: Number(c.moic),
          trend: (c.trend as number[]) ?? [],
          investmentDate: c.investment_date,
          ownership: Number(c.ownership),
          cost: Number(c.cost),
          irr: Number(c.irr),
          evEbitda: Number(c.ev_ebitda),
          commentary: { en: c.commentary_en, fr: c.commentary_fr },
          ...(internal ? { netDebt: Number(internal.net_debt) } : {}),
          data: years
            .map(y => {
              const wc = yearInternals.get(y.id)
              return {
                fy: y.fy,
                revenue: Number(y.revenue),
                grossMargin: Number(y.gross_margin),
                ebitda: Number(y.ebitda),
                netProfit: Number(y.net_profit),
                ...(wc ? {
                  cash: Number(wc.cash),
                  receivables: Number(wc.receivables),
                  payables: Number(wc.payables),
                } : {}),
              }
            }),
        }
      }),

    capitalEvents: (eventsRes.data ?? []).map(e => ({
      date: { en: e.date_label_en, fr: e.date_label_fr },
      type: e.type,
      label: { en: e.label_en, fr: e.label_fr },
      amount: Number(e.amount),
    })),

    forecast: fc ? {
      nextCall: {
        period: { en: fc.next_call_period_en, fr: fc.next_call_period_fr },
        amount: Number(fc.next_call_amount),
        note: { en: fc.next_call_note_en, fr: fc.next_call_note_fr },
      },
      nextDistribution: {
        period: { en: fc.next_distribution_period_en, fr: fc.next_distribution_period_fr },
        amount: Number(fc.next_distribution_amount),
        note: { en: fc.next_distribution_note_en, fr: fc.next_distribution_note_fr },
      },
      projectedDistributions18m: Number(fc.projected_distributions_18m),
      through: { en: fc.through_en, fr: fc.through_fr },
    } : null,

    documents: (documentsRes.data ?? []).map(d => ({
      id: d.id,
      title: { en: d.title_en, fr: d.title_fr },
      type: { en: d.type_en, fr: d.type_fr },
      typeKey: d.type_key,
      date: d.date_label,
      isNew: d.is_new,
      // Deliberately a boolean, not the path. The client asks for a signed URL
      // by id; handing it a path would invite passing someone else's.
      hasFile: Boolean(d.storage_path),
    })),

    anomalies: buildAnomalies(anomaliesRes.data ?? [], allQuartersRes.data ?? []),

    // The selector's options, derived from the all-quarters read this route
    // already performs for the computed signals — no extra query. Only
    // companies that have actually filed: a company with nothing filed cannot
    // be a dashboard scope, and offering it would be a choice that leads to an
    // empty screen.
    //
    // RLS is what makes this list safe, not the filtering here: allQuartersRes
    // came back under the caller's own session, so a company in another fund
    // was never in it to be listed.
    quartersCompanies: (() => {
      const rows = (allQuartersRes.data ?? []) as Array<Record<string, unknown>>
      const byId = new Map<string, { id: string; name: string; quartersFiled: number; latestPeriod: string | null }>()
      for (const r of rows) {
        const id = r.company_id as string | null
        if (!id) continue
        const rel = r.companies
        const name = Array.isArray(rel)
          ? (rel[0] as { name?: string } | undefined)?.name ?? ''
          : (rel as { name?: string } | null)?.name ?? ''
        const cur = byId.get(id) ?? { id, name, quartersFiled: 0, latestPeriod: null }
        cur.quartersFiled++
        const period = r.period as string
        if (!cur.latestPeriod || periodSeq(period) > periodSeq(cur.latestPeriod)) {
          cur.latestPeriod = period
        }
        byId.set(id, cur)
      }
      return Array.from(byId.values()).sort((a, b) => b.quartersFiled - a.quartersFiled || a.name.localeCompare(b.name))
    })(),

    quartersCompany: (() => {
      const rows = quartersCompanyRes.data ?? []
      const counts = new Map<string, { n: number; name: string }>()
      for (const r of rows as Array<{ company_id: string | null; companies: unknown }>) {
        if (!r.company_id) continue
        const rel = r.companies
        const name = Array.isArray(rel)
          ? (rel[0] as { name?: string } | undefined)?.name
          : (rel as { name?: string } | null)?.name
        const cur = counts.get(r.company_id) ?? { n: 0, name: name ?? '' }
        counts.set(r.company_id, { n: cur.n + 1, name: name ?? cur.name })
      }
      return Array.from(counts.values()).sort((a, b) => b.n - a.n)[0]?.name ?? null
    })(),
  }

  return NextResponse.json(payload)
}

// The anomaly feed: partner observations from the database, computed signals
// from lib/cfoSignals.ts.
//
// The dashboard used to label authored rows "Computed from submitted quarterly
// figures". They were not computed, which meant this surface and the CFO one
// could describe different things about the same company — and did. Now the
// only rows read here are the ones a partner explicitly wrote down, and
// everything presented as derived actually is.
//
// `is_signal = false` rows are deliberately NOT read. Migration 010 deletes the
// four that exist and adds a check constraint forbidding more, but this filter
// is what makes the code change safe to deploy on its own: the rows go inert
// rather than the dashboard showing duplicates while the two land.
function buildAnomalies(
  rows: Array<Record<string, unknown>>,
  quarterRows: Array<Record<string, unknown>>,
): Anomaly[] {
  const observations: Anomaly[] = rows
    .filter(a => a.is_signal === true)
    .map(a => ({
      company: (a.companies as { name: string } | null)?.name ?? '',
      level: a.level as 'red' | 'amber',
      isSignal: true,
      computed: false,
      title: { en: (a.title_en as string) ?? '', fr: (a.title_fr as string) ?? '' },
      detail: { en: (a.detail_en as string) ?? '', fr: (a.detail_fr as string) ?? '' },
      actions: (((a.actions_en as string[]) ?? []).map((en, i) => ({
        en,
        fr: ((a.actions_fr as string[]) ?? [])[i] ?? en,
      }))),
    }))

  // Group by company, then run the same function the CFO surface runs. Not a
  // reimplementation of it — the same module, so the two cannot disagree
  // without the shared code being wrong for both.
  const byCompany = new Map<string, { name: string; quarters: Quarter[] }>()
  for (const row of quarterRows) {
    const id = row.company_id as string | null
    if (!id) continue
    const rel = row.companies
    const name = Array.isArray(rel)
      ? (rel[0] as { name?: string } | undefined)?.name ?? ''
      : (rel as { name?: string } | null)?.name ?? ''
    const entry = byCompany.get(id) ?? { name, quarters: [] }
    entry.quarters.push(row as unknown as Quarter)
    byCompany.set(id, entry)
  }

  const computed: Anomaly[] = []
  for (const { name, quarters } of Array.from(byCompany.values())) {
    for (const signal of cfoSignals(quarters)) {
      const copy = gpSignalCopy(signal)
      computed.push({
        company: name,
        level: null,
        isSignal: false,
        computed: true,
        period: signal.period,
        title: copy.heading,
        detail: copy.detail,
        actions: copy.steps,
      })
    }
  }

  // Stable order so the dashboard does not reshuffle between loads.
  computed.sort((a, b) =>
    a.company.localeCompare(b.company) || a.title.en.localeCompare(b.title.en))

  return [...observations, ...computed]
}
