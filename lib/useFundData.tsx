'use client'
import { createContext, useContext, useEffect, useState } from 'react'
import type { FundDataPayload, Fund, LpPosition, Forecast } from './fundTypes'

// The investor view needs all three of these to render anything truthful, so
// they are non-null here and the page refuses to mount LPView without them.
export interface ReadyFundData extends Omit<FundDataPayload, 'fund' | 'position' | 'forecast'> {
  fund: Fund
  position: LpPosition
  forecast: Forecast
}

export function isReady(d: FundDataPayload | null): d is ReadyFundData {
  return !!d && !!d.fund && !!d.position && !!d.forecast
}

// Nine components inside LPView.tsx read this data. Prop-threading it through
// all of them would be a large, noisy diff, so this follows the pattern already
// used for translations in lib/i18n.tsx: one provider, and a hook at each call
// site.

interface Ctx {
  data: FundDataPayload | null
  loading: boolean
  error: string | null
}

const FundDataContext = createContext<Ctx>({ data: null, loading: true, error: null })

export function FundDataProvider({ children }: { children: React.ReactNode }) {
  const [data, setData] = useState<FundDataPayload | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    let active = true
    fetch('/api/fund-data')
      .then(async res => {
        const body = await res.json()
        if (!res.ok) throw new Error(body.error || `Request failed (${res.status})`)
        return body as FundDataPayload
      })
      .then(payload => { if (active) { setData(payload); setLoading(false) } })
      .catch(e => { if (active) { setError(e.message); setLoading(false) } })
    return () => { active = false }
  }, [])

  return (
    <FundDataContext.Provider value={{ data, loading, error }}>
      {children}
    </FundDataContext.Provider>
  )
}

export const useFundData = () => useContext(FundDataContext)

// Convenience accessor for the many call sites that only run once data has
// loaded. Throwing here rather than returning empty defaults is deliberate: a
// component that renders before the fetch resolves is a bug, and an investor
// shown a confident "£0" is far worse than one shown a loading state.
export function useFund(): ReadyFundData {
  const { data } = useFundData()
  if (!isReady(data)) {
    throw new Error('useFund() used before fund data resolved — gate on isReady() first')
  }
  return data
}
