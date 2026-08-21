// Shaping of fund data for the AI assistant.
//
// This file used to hold the fund, four portfolio companies with three years of
// accounts each, the capital account and the documents as hardcoded constants.
// They were imported by LPView and so shipped inside the browser bundle, which
// meant every investor downloaded every company's cash, receivables, payables
// and net debt regardless of what the API served. That data now lives in
// Postgres and reaches the app through /api/fund-data under the caller's own
// session — see supabase/migrations/004 and 005.
//
// What remains is the decision about what the assistant is told.
import type { FundDataPayload } from './fundTypes'

export type AskRole = 'gp' | 'lp' | 'submit'

const statusLabel = (s: string) => (s === 'green' ? 'on plan' : 'on watch')
const currencyOf = (sym: string) => (sym === '£' ? 'GBP' : sym === '€' ? 'EUR' : 'USD')

// The single place that decides what the assistant is allowed to know about the
// caller. Built server-side from the session's role — never from the request
// body, which the client controls.
//
// The working-capital fields are already absent from `data` for an investor,
// because RLS withheld company_year_internals. Naming each field explicitly
// here rather than spreading the record means anything added to the schema
// later is excluded by default rather than leaking.

// The quarterly rows carry a company_id UUID and no name. Passed through raw,
// the assistant answers with "company ID 0569c146…" — accurate and useless to a
// partner. Names the series and drops the identifier, which the model has no
// use for anyway.
function labelledQuarters(data: FundDataPayload, quarters: unknown[]) {
  const rows = (quarters as Array<Record<string, unknown>>).map(q => {
    const { company_id: _ignored, ...rest } = q
    return rest
  })
  return { company: data.quartersCompany ?? 'the portfolio company', quarters: rows }
}

export function contextForRole(
  role: AskRole,
  data: FundDataPayload,
  quarters: unknown[] = [],
): string {
  if (role === 'submit') {
    // The portfolio company sees only what it has filed. No fund, no siblings.
    return JSON.stringify({ standardisedQuarters: labelledQuarters(data, quarters) }, null, 2)
  }

  const fund = data.fund
    ? { ...data.fund, date: data.fund.date.en }
    : null

  if (role === 'lp') {
    return JSON.stringify({
      fund,
      yourPosition: data.position,
      portfolioCompanies: data.companies.map(c => ({
        name: c.name, sector: c.sector.en, country: c.country.en,
        currency: currencyOf(c.sym),
        moic: c.moic, status: statusLabel(c.status),
        investmentDate: c.investmentDate, ownership: c.ownership, cost: c.cost,
        irr: c.irr, evEbitda: c.evEbitda,
        annualAccounts: c.data.map(y => ({
          fy: y.fy, revenue: y.revenue, grossMargin: y.grossMargin,
          ebitda: y.ebitda, netProfit: y.netProfit,
        })),
        note: c.commentary.en,
      })),
      yourCapitalAccount: {
        events: data.capitalEvents.map(e => ({
          date: e.date.en, type: e.type, label: e.label.en, amount: e.amount,
        })),
        forecast: data.forecast && {
          nextCall: {
            period: data.forecast.nextCall.period.en,
            amount: data.forecast.nextCall.amount,
            note: data.forecast.nextCall.note.en,
          },
          nextDistribution: {
            period: data.forecast.nextDistribution.period.en,
            amount: data.forecast.nextDistribution.amount,
            note: data.forecast.nextDistribution.note.en,
          },
          projectedDistributions18m: data.forecast.projectedDistributions18m,
        },
      },
    }, null, 2)
  }

  return JSON.stringify({
    fund,
    portfolioCompanies: data.companies.map(c => ({
      name: c.name, sector: c.sector.en, country: c.country.en,
      currency: currencyOf(c.sym),
      moic: c.moic, status: statusLabel(c.status),
      investmentDate: c.investmentDate, ownership: c.ownership, cost: c.cost,
      irr: c.irr, evEbitda: c.evEbitda, netDebt: c.netDebt,
      annualAccounts: c.data,
      note: c.commentary.en,
    })),
    standardisedQuarters: labelledQuarters(data, quarters),
  }, null, 2)
}
