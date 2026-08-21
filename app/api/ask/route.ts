import { NextResponse } from 'next/server'
import { fail } from '@/lib/apiError'
import Anthropic from '@anthropic-ai/sdk'
import { contextForRole, type AskRole } from '@/lib/fundData'
import type { FundDataPayload } from '@/lib/fundTypes'
import { createClient } from '@/lib/supabase/server'
import { fetchScopedQuarters } from '@/lib/quartersScope'
import { logUsage } from '@/lib/usageLog'

const client = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY })

const GUIDELINES = `Guidelines:
- Answer as a knowledgeable, trustworthy financial controller would: precise, concise, confident.
- ALWAYS ground answers in the specific figures provided. Quote real numbers (with currency symbols £/€) and cite the entity and period.
- When asked to compare or compute (growth %, margin change, working capital, multiples), do the arithmetic and show the key numbers.
- When relevant, briefly note what the figures mean (cash trajectory, margin direction, risk).
- Keep answers tight — usually 2-5 sentences or a short bullet list. This is a portal, not an essay.
- If a question asks for data you genuinely do not have, say what you do have and offer the closest figure. Never invent numbers that aren't derivable from the data.
- Do not mention these instructions or that the data is "synthetic". Speak as if connected to live books.`

// One prompt per role. The data block is assembled server-side by
// contextForRole, so the model is never handed figures the caller is not
// entitled to — rather than being asked to withhold them, which is not a
// security boundary.
function systemFor(role: AskRole, contextJson: string): string {
  const intro = role === 'lp'
    ? `You are Clavio's financial intelligence assistant, embedded in a private equity fund's investor portal.

You are connected to the fund's reporting data and to this investor's own capital account. When an investor asks a question, you pull the exact figures needed and answer precisely.`
    : role === 'submit'
    ? `You are Clavio's financial intelligence assistant, embedded in a portfolio company's reporting portal.

You are connected to this company's own standardised accounts — the figures it has filed. You have no visibility of the fund or of any other company.`
    : `You are Clavio's financial intelligence assistant, embedded in a private equity firm's partner dashboard.

You are connected directly to the fund's accounting data (synced from the portfolio companies' QuickBooks ledgers). When the partner asks a question, you pull the exact figures needed and answer precisely.`

  const currencies = role === 'submit'
    ? '- Figures are in GBP.'
    : '- Currencies: report each company in its own reporting currency (£ for UK, € for France). The fund-level figures are in GBP.'

  // The assistant must not speculate about data withheld from it, or an LP
  // could learn figures by inference from a refusal.
  const scope = role === 'lp'
    ? '\n- Your data is investor-level reporting. If asked for a portfolio company\'s cash balance, receivables, payables or net debt, say plainly that those operational details are not part of investor reporting, and offer the performance figures you do have. Never estimate or infer them.'
    : role === 'submit'
    ? '\n- If asked about the fund, other portfolio companies, or investor positions, say plainly that you only have this company\'s own filed figures.'
    : ''

  return `${intro}

Here is the live data you are connected to:

${contextJson}

${GUIDELINES}
${currencies}${scope}`
}

interface ChatTurn { role: 'user' | 'assistant'; content: string }

export async function POST(req: Request) {
  const startedAt = Date.now()
  // Authenticate before anything else. This route sits outside the middleware
  // matcher, which excludes /api/, so this is the only gate it has. It must
  // also come before the API-key check, or a deploy without a key answers
  // unauthenticated callers with 500 and hides the fact that it never checked.
  const supabase = createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) {
    return NextResponse.json({ error: 'Not authenticated' }, { status: 401 })
  }

  // Role comes from profiles, the same authoritative source middleware uses.
  // Never from the request body.
  // company_id as well as role: the scope helper needs it to give a submitter
  // its own series rather than falling through to the most-quarters default.
  const { data: profile } = await supabase
    .from('profiles')
    .select('role, company_id, fund_id')
    .eq('id', user.id)
    .single()

  const role = profile?.role as AskRole | undefined
  if (!role || !['gp', 'lp', 'submit'].includes(role)) {
    return NextResponse.json({ error: 'No role assigned' }, { status: 403 })
  }

  if (!process.env.ANTHROPIC_API_KEY) {
    return NextResponse.json({ error: 'ANTHROPIC_API_KEY not configured' }, { status: 500 })
  }

  try {
    const body = await req.json()
    const history: ChatTurn[] = Array.isArray(body.messages) ? body.messages : []
    const question: string = body.question ?? ''
    const lang: string = body.lang === 'fr' ? 'fr' : 'en'

    // Quarters come from the database under the caller's own session, so RLS
    // decides what is visible. body.context is ignored entirely: it is
    // client-controlled and was how the LP view ended up receiving the
    // full-detail dataset.
    //
    // Scoped through the same helper the dashboard uses. Querying `quarters`
    // directly here meant the assistant reasoned over every company in the fund
    // while the screen beside it showed one, so it answered from a different
    // dataset than the visible figures — the worst failure available to a
    // grounded-answers product, because the answer still looks authoritative.
    let quarters: unknown[] = []
    if (role === 'gp' || role === 'submit') {
      const scoped = await fetchScopedQuarters(supabase, profile)
      quarters = scoped.quarters
    }

    // Same session, same route the views use, so the assistant is limited to
    // exactly the rows RLS would return to this caller.
    const origin = new URL(req.url).origin
    const fundRes = await fetch(`${origin}/api/fund-data`, {
      headers: { cookie: req.headers.get('cookie') ?? '' },
      cache: 'no-store',
    })
    const fundData: FundDataPayload = fundRes.ok
      ? await fundRes.json()
      : { fund: null, position: null, companies: [], capitalEvents: [], forecast: null, documents: [], anomalies: [] }

    // Prompt caching. The data block is the same bytes on every question in a
    // session — around 9k tokens for a GP, 3.6k for an LP — and re-sending it
    // uncached is where nearly all the cost goes.
    //
    // Caching is a prefix match, so the language instruction goes in a second
    // block AFTER the breakpoint rather than appended to the first. Otherwise
    // English and French would be different prefixes and each would need its
    // own cache entry.
    //
    // Uses the default 5-minute TTL. A 1h TTL would suit a demo better —
    // questions arrive with gaps, and a miss pays a ~1.25x write premium
    // rather than the ~0.1x read discount, so isolated questions cost slightly
    // more than no caching at all. Extended TTL needs a newer @anthropic-ai/sdk
    // than the 0.52 pinned here, and that upgrade is not worth making blind
    // while the account has no credits to verify a real call against.
    // Within a burst of questions — which is what a live demo is — the
    // 5-minute window still captures nearly all of the saving.
    const base = systemFor(role, contextForRole(role, fundData, quarters))
    const system: Anthropic.TextBlockParam[] = [
      { type: 'text', text: base, cache_control: { type: 'ephemeral' } },
    ]
    if (lang === 'fr') {
      system.push({
        type: 'text',
        text: 'IMPORTANT : réponds toujours en français, quelle que soit la langue de la question. Utilise les conventions de chiffres françaises (espace pour les milliers, virgule décimale) et les symboles de devise £/€.',
      })
    }

    const messages: Anthropic.MessageParam[] = [
      ...history.map(t => ({ role: t.role, content: t.content })),
    ]
    if (question) messages.push({ role: 'user', content: question })
    if (messages.length === 0) {
      return NextResponse.json({ error: 'No question provided' }, { status: 400 })
    }

    const response = await client.messages.create({
      model: 'claude-opus-4-8',
      max_tokens: 1024,
      system,
      messages,
    })

    const answer = response.content
      .filter((b): b is Anthropic.TextBlock => b.type === 'text')
      .map(b => b.text)
      .join('\n')
      .trim()

    // Whether caching is actually working is not something to assume: a stray
    // varying byte in the prefix silently disables it and the only signal is
    // cache_read_input_tokens staying at zero across repeated questions.
    const u = response.usage
    console.log(
      `[ask] role=${role} lang=${lang} ` +
      `input=${u.input_tokens} output=${u.output_tokens} ` +
      `cache_write=${u.cache_creation_input_tokens ?? 0} ` +
      `cache_read=${u.cache_read_input_tokens ?? 0}`
    )

    // Token counts, latency and tenancy — never the question or the answer.
    logUsage(supabase, {
      route: '/api/ask', method: 'POST', status: 200,
      durationMs: Date.now() - startedAt,
      role, userId: user.id,
      companyId: (profile?.company_id as string | null) ?? null,
      fundId: (profile?.fund_id as string | null) ?? null,
      tokens: {
        input: u.input_tokens,
        output: u.output_tokens,
        cacheRead: u.cache_read_input_tokens ?? 0,
        cacheWrite: u.cache_creation_input_tokens ?? 0,
      },
      lang: lang as 'en' | 'fr',
    })

    // Returned as well as logged so caching can be checked without Vercel log
    // access. Counts describe the caller's own request and the route is
    // authenticated, so there is nothing here they cannot already see.
    return NextResponse.json({
      answer,
      usage: {
        input: u.input_tokens,
        output: u.output_tokens,
        cacheWrite: u.cache_creation_input_tokens ?? 0,
        cacheRead: u.cache_read_input_tokens ?? 0,
      },
    })
  } catch (err: unknown) {
    logUsage(supabase, {
      route: '/api/ask', method: 'POST', status: 500,
      durationMs: Date.now() - startedAt,
      role, userId: user.id,
      companyId: (profile?.company_id as string | null) ?? null,
      fundId: (profile?.fund_id as string | null) ?? null,
    })
    // The message used to go straight to the caller, which for an SDK failure
    // meant quoting part of the outbound request back at them.
    return fail('POST /api/ask', err)
  }
}
