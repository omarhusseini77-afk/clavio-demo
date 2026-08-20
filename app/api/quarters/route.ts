import { NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'

// Session-aware: RLS decides what this caller may see. An unauthenticated
// request returns an empty list rather than the whole table.
export async function GET() {
  const supabase = createClient()

  const { data, error } = await supabase
    .from('quarters')
    .select('*')
    .order('id', { ascending: true })

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json(data)
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
