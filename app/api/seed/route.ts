import { NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import seedData from '@/clavio_seed_data.json'

// This route wipes and re-inserts every quarter, and the client calls it on
// mount. Before Phase 3 that made it an unauthenticated reset button for the
// whole table. It is now session-aware, so RLS refuses the writes for anyone
// without a gp or submit role — and for anon entirely.
export async function POST() {
  const supabase = createClient()

  const { data: existing } = await supabase.from('quarters').select('id, period')
  const count = existing?.length ?? 0

  // Skip if already seeded with clean data (no "Period:" prefix in any row)
  const hasDirty = existing?.some(r => r.period.startsWith('Period:')) ?? false
  if (count === seedData.length && !hasDirty) {
    return NextResponse.json({ message: 'Already seeded' })
  }

  // A caller RLS has blocked from reading sees zero rows, which is
  // indistinguishable here from an empty table. Refuse rather than let that
  // ambiguity turn into a destructive re-seed.
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) {
    return NextResponse.json({ error: 'Not authenticated' }, { status: 401 })
  }

  // Delete all and re-insert
  if (existing && existing.length > 0) {
    for (const row of existing) {
      await supabase.from('quarters').delete().eq('id', row.id)
    }
  }
  const { error } = await supabase.from('quarters').insert(seedData)
  if (error) return NextResponse.json({ error: error.message }, { status: 403 })
  return NextResponse.json({ message: `Seeded ${seedData.length} quarters` })
}
