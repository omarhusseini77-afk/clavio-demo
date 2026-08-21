import { NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { fetchScopedQuarters } from '@/lib/quartersScope'

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

  // Shared with /api/ask so the assistant and the dashboard can never answer
  // from different companies.
  const { quarters } = await fetchScopedQuarters(supabase, profile, requested)

  return NextResponse.json(quarters)
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
