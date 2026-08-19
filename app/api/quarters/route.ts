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

  const { data, error } = await supabase
    .from('quarters')
    .insert([body])
    .select()
    .single()

  // An RLS refusal surfaces here as an error rather than a silent no-op.
  if (error) return NextResponse.json({ error: error.message }, { status: 403 })
  return NextResponse.json(data, { status: 201 })
}
