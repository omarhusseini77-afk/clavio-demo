import { NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import type { FundDataPayload } from '@/lib/fundTypes'

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

    anomalies: (anomaliesRes.data ?? []).map(a => ({
      company: (a.companies as { name: string } | null)?.name ?? '',
      level: a.level,
      isSignal: a.is_signal,
      title: { en: a.title_en ?? '', fr: a.title_fr ?? '' },
      detail: { en: a.detail_en ?? '', fr: a.detail_fr ?? '' },
      actions: ((a.actions_en as string[]) ?? []).map((en, i) => ({
        en,
        fr: ((a.actions_fr as string[]) ?? [])[i] ?? en,
      })),
    })),
  }

  return NextResponse.json(payload)
}
