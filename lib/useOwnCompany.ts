'use client'
import { useEffect, useMemo, useState } from 'react'
import { createClient } from './supabase/client'

export interface OwnCompany {
  id: string
  name: string
  cfoSignalsSimultaneous: boolean
}

// The signed-in company's own row. Needs no new endpoint: the `companies`
// select policy already returns exactly one row to a `submit` caller (its own),
// and nothing at all to anyone else — so this hook is safe to mount anywhere
// without becoming a way to enumerate the fund.
export function useOwnCompany() {
  const [company, setCompany] = useState<OwnCompany | null>(null)
  const [loading, setLoading] = useState(true)
  const supabase = useMemo(() => createClient(), [])

  useEffect(() => {
    let cancelled = false
    ;(async () => {
      const { data } = await supabase
        .from('companies')
        .select('id, name, cfo_signals_simultaneous')
        .limit(1)
        .maybeSingle()
      if (cancelled) return
      setCompany(data ? {
        id: data.id,
        name: data.name,
        cfoSignalsSimultaneous: data.cfo_signals_simultaneous,
      } : null)
      setLoading(false)
    })()
    return () => { cancelled = true }
  }, [supabase])

  return { company, loading }
}
