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
  // Rows a failed extraction wrote with the label glued to the value.
  const dirty = (existing ?? []).filter(r => r.period.startsWith('Period:'))

  // This route used to wipe and re-insert whenever the row count differed from
  // the seed file's 13. That made every genuine filing temporary: submit a
  // fourteenth quarter, and the next page load deleted it and restored the
  // demo set — while the confirmation screen said the GP dashboard had been
  // updated. Invisible until the History tab started showing a company its own
  // filings back; now it would be the first thing a CFO noticed.
  //
  // Seeding is therefore bootstrap-only. An empty table gets the demo set; a
  // table with real rows in it is left alone, and only genuinely malformed
  // rows are removed.
  if (count > 0 && dirty.length === 0) {
    return NextResponse.json({ message: 'Already seeded' })
  }

  // A caller RLS has blocked from reading sees zero rows, which is
  // indistinguishable here from an empty table. Refuse rather than let that
  // ambiguity turn into a destructive re-seed.
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) {
    return NextResponse.json({ error: 'Not authenticated' }, { status: 401 })
  }

  // Remove only the malformed rows, never the sound ones beside them.
  if (dirty.length > 0) {
    for (const row of dirty) {
      await supabase.from('quarters').delete().eq('id', row.id)
    }
    if (count > dirty.length) {
      return NextResponse.json({ message: `Removed ${dirty.length} malformed quarter(s)` })
    }
  }

  // Seeded rows belong to the caller's company. company_id becomes NOT NULL in
  // 006, so this must ship before that migration runs.
  const { data: profile } = await supabase
    .from('profiles')
    .select('company_id')
    .eq('id', user.id)
    .single()

  const { error } = await supabase
    .from('quarters')
    .insert(seedData.map(row => ({ ...row, company_id: profile?.company_id ?? null })))
  if (error) return NextResponse.json({ error: error.message }, { status: 403 })
  return NextResponse.json({ message: `Seeded ${seedData.length} quarters` })
}
