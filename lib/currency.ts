export type Currency = 'GBP' | 'USD' | 'EUR'

const RATES: Record<Currency, number> = { GBP: 1, USD: 1.27, EUR: 1.17 }
const SYMBOLS: Record<Currency, string> = { GBP: '£', USD: '$', EUR: '€' }

export function convert(amount: number, currency: Currency): number {
  return amount * RATES[currency]
}

export function fmtShort(amount: number, currency: Currency): string {
  const v = convert(amount, currency)
  const s = SYMBOLS[currency]
  return v >= 1_000_000 ? `${s}${(v / 1_000_000).toFixed(2)}m` : `${s}${(v / 1_000).toFixed(0)}k`
}

export function fmtFull(amount: number, currency: Currency): string {
  const v = convert(amount, currency)
  const s = SYMBOLS[currency]
  return `${s}${Math.round(v).toLocaleString('en-GB')}`
}

export function fmtM(amount: number, currency: Currency): string {
  const v = convert(amount, currency)
  const s = SYMBOLS[currency]
  return `${s}${(v / 1_000_000).toFixed(2)}m`
}

export function fmtK(amount: number, currency: Currency): string {
  const v = convert(amount, currency)
  const s = SYMBOLS[currency]
  return `${s}${(v / 1_000).toFixed(0)}k`
}

export function symbol(currency: Currency): string {
  return SYMBOLS[currency]
}
