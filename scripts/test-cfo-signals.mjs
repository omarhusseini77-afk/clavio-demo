// Runs cfoSignals against the real quarterly series in the database.
//
// Those series were generated so that the GP anomaly text derives exactly, so
// they double as fixtures: the rules should fire on the same companies the
// anomaly feed describes. If they do not, either the rules or the anomaly text
// is wrong, and the disagreement is the finding — do not tune thresholds to
// make this pass.
//
//   node scripts/test-cfo-signals.mjs

import { createClient } from '@supabase/supabase-js'
import fs from 'node:fs'
import path from 'node:path'

for (const line of fs.readFileSync(path.join(process.cwd(), '.env.local'), 'utf8').split('\n')) {
  const m = line.match(/^([A-Z_]+)=(.*)$/)
  if (m && !process.env[m[1]]) process.env[m[1]] = m[2].trim()
}

const { cfoSignals, THRESHOLDS } = await import('../lib/cfoSignals.ts')

const db = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL, process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY)
const { data: auth } = await db.auth.signInWithPassword({
  email: 'gp@clavio.app', password: 'ClavioDemo2026',
})
if (!auth?.session) { console.error('login failed'); process.exit(1) }

const { data: rows } = await db
  .from('quarters')
  .select('*, companies(slug,name)')

const by = new Map()
for (const r of rows ?? []) {
  const slug = r.companies.slug
  if (!by.has(slug)) by.set(slug, { name: r.companies.name, rows: [] })
  by.get(slug).rows.push(r)
}

console.log('\nThresholds in force (declared guesses, uncalibrated):')
console.log(' ', JSON.stringify(THRESHOLDS))

let failures = 0
const expect = (label, cond) => {
  if (!cond) failures++
  console.log(`  ${cond ? 'PASS' : 'FAIL'}  ${label}`)
}

console.log('\n── Signals fired, by company ──')
const fired = new Map()
for (const [slug, { name, rows }] of by) {
  const sigs = cfoSignals(rows)
  fired.set(slug, sigs.map(s => s.id))
  console.log(`\n  ${name} (${rows.length} quarters)`)
  if (!sigs.length) console.log('    (none)')
  for (const s of sigs) {
    const d = Object.entries(s.detail).map(([k, v]) => `${k}=${v.toFixed(2)}`).join(' ')
    console.log(`    ${s.id.padEnd(28)} ${s.period}  ${d}`)
  }
}

console.log('\n── Reconciliation with the GP anomaly feed ──')
// Halcyon's anomaly claims a 4.2pp margin break in the latest quarter.
expect(
  'Halcyon fires margin-outside-band (anomaly claims a 4.2pp EBITDA break)',
  (fired.get('halcyon') ?? []).includes('margin-outside-band'),
)
expect(
  'Halcyon fires collection-speed (anomaly claims debtor days 22.8 -> 25.9)',
  (fired.get('halcyon') ?? []).includes('collection-speed'),
)
// Atelier's anomaly claims working capital tightened two consecutive quarters.
expect(
  'Atelier fires at least one signal (anomaly claims WC tightening)',
  (fired.get('asp') ?? []).length > 0,
)
// Marlow & Reed has no anomaly against it.
expect(
  'Marlow & Reed fires nothing (no anomaly claims anything about it)',
  (fired.get('mrj') ?? []).length === 0,
)

console.log('\n── Boundary behaviour (near-misses must stay silent) ──')
const base = (over) => Array.from({ length: 8 }, (_, i) => ({
  period: `Q${(i % 4) + 1} FY2${4 + Math.floor(i / 4)}`,
  turnover: 1_000_000, cos: 600_000, gross: 400_000, op: 100_000,
  depreciation_amortisation: 20_000,
  debtors: 200_000, creditors: 150_000, cash: 500_000, stock: 100_000,
  net_assets: 0, funds: 0, admin: 0, interest: 0, pbt: 0, tax: 0, retained: 0, fixed: 0,
  ...(i === 7 ? over : {}),
}))
expect('creditors +9.5% / debtors -9.5% stays silent',
  !cfoSignals(base({ creditors: 164_250, debtors: 181_000 })).some(s => s.id === 'working-capital-divergence'))
expect('creditors +10% / debtors -10% fires',
  cfoSignals(base({ creditors: 165_000, debtors: 180_000 })).some(s => s.id === 'working-capital-divergence'))
expect('revenue +9% with flat cash stays silent',
  !cfoSignals(base({ turnover: 1_090_000 })).some(s => s.id === 'revenue-cash-divergence'))
expect('revenue +10% with flat cash fires',
  cfoSignals(base({ turnover: 1_100_000 })).some(s => s.id === 'revenue-cash-divergence'))
expect('revenue +10% WITH cash following stays silent',
  !cfoSignals(base({ turnover: 1_100_000, cash: 560_000 })).some(s => s.id === 'revenue-cash-divergence'))
expect('a flat series fires nothing at all', cfoSignals(base({})).length === 0)
expect('a single quarter returns no signals', cfoSignals([base({})[0]]).length === 0)

console.log(`\n${failures === 0 ? 'ALL CHECKS PASS' : failures + ' CHECK(S) FAILED'}\n`)
process.exit(failures === 0 ? 0 : 1)
