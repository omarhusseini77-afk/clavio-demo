'use client'
import { createContext, useContext, useEffect, useState } from 'react'
import { TRANSLATIONS } from './translations'
import type { Lang } from './loc'

export type { Lang, Loc } from './loc'
export { loc } from './loc'

interface Ctx {
  lang: Lang
  setLang: (l: Lang) => void
  t: (key: string, vars?: Record<string, string | number>) => string
}

const LanguageContext = createContext<Ctx>({
  lang: 'en',
  setLang: () => {},
  t: (k) => k,
})

export function LanguageProvider({ children }: { children: React.ReactNode }) {
  const [lang, setLangState] = useState<Lang>('en')

  useEffect(() => {
    const saved = localStorage.getItem('clavio-lang')
    if (saved === 'fr' || saved === 'en') setLangState(saved)
  }, [])

  const setLang = (l: Lang) => {
    setLangState(l)
    try { localStorage.setItem('clavio-lang', l) } catch {}
    if (typeof document !== 'undefined') document.documentElement.lang = l
  }

  const t = (key: string, vars?: Record<string, string | number>) => {
    const table = TRANSLATIONS[lang] ?? TRANSLATIONS.en
    let str = table[key] ?? TRANSLATIONS.en[key] ?? key
    if (vars) {
      for (const [k, v] of Object.entries(vars)) {
        str = str.replace(new RegExp(`\\{${k}\\}`, 'g'), String(v))
      }
    }
    return str
  }

  return (
    <LanguageContext.Provider value={{ lang, setLang, t }}>
      {children}
    </LanguageContext.Provider>
  )
}

export const useLang = () => useContext(LanguageContext)
