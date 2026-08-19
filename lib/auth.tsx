'use client'
import { createContext, useContext, useEffect, useState } from 'react'
import type { User } from '@supabase/supabase-js'
import { createClient } from './supabase/client'

export type Role = 'gp' | 'lp' | 'submit'

export const ROLE_HOME: Record<Role, string> = {
  gp: '/gp',
  lp: '/lp',
  submit: '/',
}

interface Ctx {
  user: User | null
  role: Role | null
  fullName: string | null
  loading: boolean
  signOut: () => Promise<void>
}

const AuthContext = createContext<Ctx>({
  user: null,
  role: null,
  fullName: null,
  loading: true,
  signOut: async () => {},
})

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<User | null>(null)
  const [role, setRole] = useState<Role | null>(null)
  const [fullName, setFullName] = useState<string | null>(null)
  const [loading, setLoading] = useState(true)
  const supabase = createClient()

  useEffect(() => {
    let active = true

    const loadProfile = async (u: User | null) => {
      if (!u) {
        if (active) { setRole(null); setFullName(null) }
        return
      }
      const { data } = await supabase
        .from('profiles')
        .select('role, full_name')
        .eq('id', u.id)
        .single()
      if (active) {
        setRole((data?.role as Role) ?? null)
        setFullName(data?.full_name ?? null)
      }
    }

    supabase.auth.getUser().then(async ({ data }) => {
      if (!active) return
      setUser(data.user)
      await loadProfile(data.user)
      if (active) setLoading(false)
    })

    const { data: sub } = supabase.auth.onAuthStateChange(async (_event, session) => {
      if (!active) return
      setUser(session?.user ?? null)
      await loadProfile(session?.user ?? null)
    })

    return () => { active = false; sub.subscription.unsubscribe() }
  }, [])

  const signOut = async () => {
    await supabase.auth.signOut()
    window.location.href = '/login'
  }

  return (
    <AuthContext.Provider value={{ user, role, fullName, loading, signOut }}>
      {children}
    </AuthContext.Provider>
  )
}

export const useAuth = () => useContext(AuthContext)
