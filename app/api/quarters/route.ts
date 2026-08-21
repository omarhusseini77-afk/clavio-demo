import { NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'

// Session-aware: RLS decides what this caller may see. An unauthenticated
// request returns an empty list rather than the whole table.
//
// Scoped to ONE company. The dashboard treats the result as a single series —
// `quarters[length-1]` is "latest", the chart maps every row — so returning a
// whole fund's quarters would silently splice several companies into one set of
// headline figures. RLS bounds this to the caller's fund; the scoping below is
// about coherence, not access.
//
// Default preserves existing behaviour: a submitter gets its own company, and a
// GP gets whichever company submitted most recently.
export async function GET(request: Request) {
  const supabase = createClient()

  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json([])

  const { data: profile } = await supabase
    .from('profiles')
    .select('role, company_id')
    .eq('id', user.id)
    .single()

  const requested = new URL(request.url).searchParams.get('company')
  let companyId: string | null = requested

  if (!companyId) {
    if (profile?.role === 'submit') {
      companyId = profile.company_id
    } else {
      // Whichever company has filed the most quarters. `id` order is not usable
      // here: it reflects insertion, so a bulk backfill for another company
      // would silently reassign the whole dashboard to it.
      const { data: all } = await supabase.from('quarters').select('company_id')
      const counts = new Map<string, number>()
      for (const row of all ?? []) {
        if (row.company_id) counts.set(row.company_id, (counts.get(row.company_id) ?? 0) + 1)
      }
      companyId = Array.from(counts.entries()).sort((a, b) => b[1] - a[1])[0]?.[0] ?? null
    }
  }

  if (!companyId) return NextResponse.json([])

  // Still goes through the session client, so asking for another tenant's
  // company id simply returns nothing rather than being trusted.
  const { data, error } = await supabase
    .from('quarters')
    .select('*')
    .eq('company_id', companyId)

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })

  // Chronological, parsed from the period label. Sorting by `id` gave insertion
  // order, and sorting the label as text puts "Q4 FY24" after "Q1 FY25".
  const seq = (p: string) => {
    const m = /Q(\d)\s*FY(\d+)/i.exec(p ?? '')
    return m ? Number(m[2]) * 10 + Number(m[1]) : 0
  }
  const sorted = [...(data ?? [])].sort((a, b) => seq(a.period) - seq(b.period))

  return NextResponse.json(sorted)
}

export async function POST(request: Request) {
  const body = await request.json()
  const supabase = createClient()

  // Stamp the filing with the submitter's own company rather than trusting the
  // body. company_id becomes NOT NULL in 006, so this has to ship first.
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Not authenticated' }, { status: 401 })

  const { data: profile } = await supabase
    .from('profiles')
    .select('company_id')
    .eq('id', user.id)
    .single()

  const { data, error } = await supabase
    .from('quarters')
    .insert([{ ...body, company_id: profile?.company_id ?? null }])
    .select()
    .single()

  // An RLS refusal surfaces here as an error rather than a silent no-op.
  if (error) return NextResponse.json({ error: error.message }, { status: 403 })
  return NextResponse.json(data, { status: 201 })
}
