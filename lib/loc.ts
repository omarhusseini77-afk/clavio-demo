// Server-safe localisation primitives (no React / 'use client').
export type Lang = 'en' | 'fr'

// A piece of content that exists in both languages.
export type Loc = { en: string; fr: string }

export function loc(v: Loc, lang: Lang): string {
  return v[lang] ?? v.en
}
