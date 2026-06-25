import { NextResponse } from 'next/server'
import { supabase } from '@/lib/supabase'
import seedData from '@/clavio_seed_data.json'

export async function POST() {
  const { data: existing } = await supabase.from('quarters').select('id, period')
  const count = existing?.length ?? 0

  // Skip if already seeded with clean data (no "Period:" prefix in any row)
  const hasDirty = existing?.some(r => r.period.startsWith('Period:')) ?? false
  if (count === seedData.length && !hasDirty) {
    return NextResponse.json({ message: 'Already seeded' })
  }

  // Delete all and re-insert
  if (existing && existing.length > 0) {
    for (const row of existing) {
      await supabase.from('quarters').delete().eq('id', row.id)
    }
  }
  const { error } = await supabase.from('quarters').insert(seedData)
  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json({ message: `Seeded ${seedData.length} quarters` })
}
