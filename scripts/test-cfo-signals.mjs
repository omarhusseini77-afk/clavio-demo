// Two things, against the real database.
//
// 1. THE ONE THAT MATTERS: the GP feed and the CFO surface produce identical
//    signals for the same company — same rule ids, same periods, same numbers.
//    Both now call lib/cfoSignals.ts, so this is a check that they still do,
//    and it goes red the moment either side grows its own copy of a rule.
//
//    This replaced an earlier check that asserted each rule fired where an
//    authored `anomalies` row described it. Those rows are gone (migration 010),
//    so its subject no longer exists. It is recorded here rather than quietly
//    dropped: it failed on Halcyon's collection speed, and the resolution was
//    to retire the authored claim rather than move the threshold — which is why
//    Halcyon is asserted silent on that rule below rather than simply absent.
//
// 2. Boundary behaviour: near-misses must stay silent. Rule boundaries are
//    where false positives live.
//
//   npx tsx scripts/test-cfo-signals.mjs

import { createClient } from '@supabase/supabase-js'
import fs from 'node:fs'
import path from 'node:path'

for (const line of fs.readFileSync(path.join(process.cwd(), '.env.local'), 'utf8').split('\n')) {
  const m = line.match(/^([A-Z_]+)=(.*)$/)
  if (m && !process.env[m[1]]) process.env[m[1]] = m[2].trim()
}

const { cfoSignals, THRESHOLDS } = await import('../lib/cfoSignals.ts')

const URL = process.env.NEXT_PUBLIC_SUPABASE_URL
const KEY = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY
const PASSWORD = 'ClavioDemo2026'

let failures = 0
const expect = (label, cond) => {
  if (!cond) failures++
  console.log(`  ${cond ? 'PASS' : 'FAIL'}  ${label}`)
}

const login = async (email) => {
  const db = createClient(URL, KEY)
  const { error } = await db.auth.signInWithPassword({ email, password: PASSWORD })
  if (error) throw new Error(`${email}: ${error.message}`)
  return db
}

// A signal reduced to what "identical" is defined to mean. Numbers are fixed to
// six decimals so a float representation difference between two paths is not
// mistaken for a disagreement, and not rounded further than that so a genuine
// one still shows.
const fingerprint = (s) =>
  `${s.id}@${s.period}{${Object.keys(s.detail).sort()
    .map(k => `${k}=${s.detail[k].toFixed(6)}`).join(',')}}`

console.log('\nThresholds in force (declared guesses, uncalibrated):')
console.log(' ', JSON.stringify(THRESHOLDS))

// ── The GP path ────────────────────────────────────────────────────────────
// Read the way /api/fund-data reads: every quarter the GP may see, grouped by
// company. This mirrors the route rather than calling it, so the check does not
// depend on a server running.
const gp = await login('gp@clavio.app')
const { data: gpRows } = await gp.from('quarters').select('*, companies(slug,name)')

const gpByCompany = new Map()
for (const r of gpRows ?? []) {
  const slug = r.companies.slug
  if (!gpByCompany.has(slug)) gpByCompany.set(slug, { name: r.companies.name, rows: [] })
  gpByCompany.get(slug).rows.push(r)
}

console.log('\n── Computed signals, as the GP dashboard derives them ──')
const gpSignals = new Map()
for (const [slug, { name, rows }] of gpByCompany) {
  const sigs = cfoSignals(rows)
  gpSignals.set(slug, sigs)
  console.log(`\n  ${name} (${rows.length} quarters)`)
  if (!sigs.length) console.log('    (none)')
  for (const s of sigs) {
    const d = Object.entries(s.detail).map(([k, v]) => `${k}=${v.toFixed(2)}`).join(' ')
    console.log(`    ${s.id.padEnd(28)} ${s.period}  ${d}`)
  }
}

// ── The CFO path ───────────────────────────────────────────────────────────
// Each submit account reads only its own company under RLS — the same rows the
// History tab holds. Comparing this against the GP grouping above is the whole
// point: two different sessions, two different query scopes, one module.
console.log('\n── Same signals via each company\'s own submit session ──')
const CFO_ACCOUNTS = [
  ['submit@clavio.app', 'mrj'],
  ['submit.atelier@clavio.app', 'asp'],
]

for (const [email, slug] of CFO_ACCOUNTS) {
  const db = await login(email)
  const { data: ownRows } = await db.from('quarters').select('*, companies(slug)')

  const slugs = Array.from(new Set((ownRows ?? []).map(r => r.companies.slug)))
  expect(`${email} sees exactly one company, its own (${slug})`,
    slugs.length === 1 && slugs[0] === slug)

  const cfoSide = cfoSignals(ownRows ?? []).map(fingerprint)
  const gpSide = (gpSignals.get(slug) ?? []).map(fingerprint)

  console.log(`\n  ${slug}`)
  console.log(`    GP  : ${gpSide.length ? gpSide.join('\n          ') : '(none)'}`)
  console.log(`    CFO : ${cfoSide.length ? cfoSide.join('\n          ') : '(none)'}`)
  expect(
    `${slug}: GP feed and CFO surface produce identical signals`,
    JSON.stringify(gpSide) === JSON.stringify(cfoSide),
  )
}

// ── The case the authored feed used to disagree about ──────────────────────
console.log('\n── Halcyon collection speed: silent on both sides ──')
// Debtor days 25.93 against a trailing four-quarter mean of 22.81 — +13.7%,
// under the declared 15% threshold. The authored row that described this was
// retired rather than the threshold moved, so the correct state is silence
// everywhere. Asserted rather than assumed: "absent" and "never computed" look
// the same, and the positive control below separates them.
expect(
  'Halcyon does not fire collection-speed (13.7% is under the 15% threshold)',
  !(gpSignals.get('halcyon') ?? []).some(s => s.id === 'collection-speed'),
)
expect(
  'no company fires collection-speed anywhere in the fund',
  !Array.from(gpSignals.values()).flat().some(s => s.id === 'collection-speed'),
)
// Positive control: Halcyon is not silent because the pipeline is broken.
expect(
  'Halcyon still fires ebitda-margin-outside-band (so the silence is a rule, not a breakage)',
  (gpSignals.get('halcyon') ?? []).some(s => s.id === 'ebitda-margin-outside-band'),
)

// ── The dashboard is not empty ─────────────────────────────────────────────
console.log('\n── The feed still reads as a working product ──')
const total = Array.from(gpSignals.values()).flat().length
const withSignals = Array.from(gpSignals.entries()).filter(([, v]) => v.length > 0)
console.log(`  ${total} computed signal(s) across ${withSignals.length} compan(y|ies): ${withSignals.map(([s]) => s).join(', ')}`)
expect('the GP feed is not empty', total > 0)
expect('signals span more than one company', withSignals.length > 1)

// ── Boundaries ─────────────────────────────────────────────────────────────
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
