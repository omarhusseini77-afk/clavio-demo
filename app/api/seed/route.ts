import { NextResponse } from 'next/server'
import { supabase } from '@/lib/supabase'
import seedData from '@/clavio_seed_data.json'

export async function POST() {
  const { count } = await supabase
    .from('quarters')
    .select('*', { count: 'exact', head: true })

  if ((count ?? 0) > 0) {
    return NextResponse.json({ message: 'Already seeded' })
  }

  const { error } = await supabase.from('quarters').insert(seedData)
  if (error) return NextResponse.json({ error: error.message }, { status: 500 })

  return NextResponse.json({ message: 'Seeded 12 quarters' })
}
