'use client'
import { useEffect, useMemo, useState } from 'react'
import { createClient } from './supabase/client'
import type { Quarter } from './supabase'

const sortQuarters = (data: Quarter[]) =>
  [...data].sort((a, b) => {
    const parse = (p: string) => {
      const m = p.match(/Q(\d+)\s+FY(\d+)/i)
      return m ? parseInt(m[2]) * 10 + parseInt(m[1]) : 0
    }
    return parse(a.period) - parse(b.period)
  })

export function useQuarters() {
  const [quarters, setQuarters] = useState<Quarter[]>([])
  const [loading, setLoading] = useState(true)
  // A failed fetch used to land as an empty array, which renders identically to
  // a company that has filed nothing. Distinguishing them is the whole point:
  // "no filings yet" and "we could not reach your filings" call for opposite
  // reactions from a CFO.
  const [error, setError] = useState<string | null>(null)
  // Cookie-backed client, so the realtime socket carries the user's session.
  // Realtime honours RLS: without this the subscription is anonymous and stops
  // receiving anything once policies are on.
  const supabase = useMemo(() => createClient(), [])

  const fetchQuarters = async () => {
    try {
      const res = await fetch('/api/quarters')

      // Parsed defensively rather than with a bare res.json(). An unhandled
      // server error returns an empty body, so res.json() rejects with
      // "Failed to execute 'json' on 'Response'" — and that string was ending
      // up in front of the user, which is the same internals leak the API
      // responses were just cleaned of. Caught here so the browser's wording
      // never reaches the screen.
      const text = await res.text()
      let data: unknown = null
      try { data = text ? JSON.parse(text) : null } catch { data = null }

      if (!res.ok) {
        const body = data as { error?: string; ref?: string } | null
        if (body?.error) {
          throw new Error(body.ref ? `${body.error} (ref ${body.ref})` : body.error)
        }
        throw new Error('Could not load your filings. Please try again.')
      }
      if (!Array.isArray(data)) throw new Error('Could not load your filings. Please try again.')
      setQuarters(sortQuarters(data))
      setError(null)
    } catch (e: unknown) {
      // Deliberately does NOT clear `quarters`. If a refresh fails, the figures
      // already on screen were real a moment ago; blanking them would turn a
      // transient network error into an apparent loss of data.
      setError(e instanceof Error ? e.message : 'Could not load your filings.')
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    const init = async () => {
      await fetch('/api/seed', { method: 'POST' })
      await fetchQuarters()
    }
    init()
    const channel = supabase
      .channel('quarters-changes')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'quarters' }, fetchQuarters)
      .subscribe()
    return () => { supabase.removeChannel(channel) }
  }, [supabase])

  const onSubmit = async (q: Omit<Quarter, 'id' | 'created_at'>) => {
    const res = await fetch('/api/quarters', {
      method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(q),
    })
    if (res.ok) await fetchQuarters()
    return res.ok
  }

  const onDelete = async (id: number) => {
    await fetch(`/api/quarters/${id}`, { method: 'DELETE' })
    await fetchQuarters()
  }

  const onUpdate = async (id: number, q: Omit<Quarter, 'id' | 'created_at'>) => {
    const res = await fetch(`/api/quarters/${id}`, {
      method: 'PATCH', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(q),
    })
    if (res.ok) await fetchQuarters()
    return res.ok
  }

  return { quarters, loading, error, onSubmit, onDelete, onUpdate }
}
