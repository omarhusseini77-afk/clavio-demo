'use client'
import { useEffect, useState } from 'react'
import { supabase } from './supabase'
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

  const fetchQuarters = async () => {
    const res = await fetch('/api/quarters')
    const data = await res.json()
    setQuarters(Array.isArray(data) ? sortQuarters(data) : [])
    setLoading(false)
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
  }, [])

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

  return { quarters, loading, onSubmit, onDelete, onUpdate }
}
