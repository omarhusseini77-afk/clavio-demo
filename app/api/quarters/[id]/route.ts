import { NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { refused } from '@/lib/apiError'

// Session-aware so RLS sees the caller's role. Postgres, not this handler,
// decides whether the delete or update is allowed.
export async function DELETE(_req: Request, { params }: { params: { id: string } }) {
  const supabase = createClient()

  const { error } = await supabase.from('quarters').delete().eq('id', params.id)
  if (error) return refused(`DELETE /api/quarters/${params.id}`, error, 'That quarter could not be deleted.')
  return NextResponse.json({ success: true })
}

export async function PATCH(req: Request, { params }: { params: { id: string } }) {
  const body = await req.json()
  const supabase = createClient()

  const { data, error } = await supabase
    .from('quarters')
    .update(body)
    .eq('id', params.id)
    .select()
    .single()

  if (error) return refused(`PATCH /api/quarters/${params.id}`, error, 'That quarter could not be updated.')
  return NextResponse.json(data)
}
