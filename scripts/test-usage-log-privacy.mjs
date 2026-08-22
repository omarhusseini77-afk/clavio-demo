// Does the usage log contain anything it must not?
//
// A clean scan is worthless unless the scan can detect a leak, so this runs the
// SAME scan against a deliberately poisoned row FIRST. If the poisoned row does
// not trip it, the scan is broken and the real result means nothing — that is
// the LC_ALL=C bundle-scan lesson from docs/verification-notes.md, applied here
// before it can bite.
//
//   npx tsx scripts/test-usage-log-privacy.mjs

import { createClient } from '@supabase/supabase-js'
import fs from 'node:fs'
import path from 'node:path'

for (const line of fs.readFileSync(path.join(process.cwd(), '.env.local'), 'utf8').split('\n')) {
  const m = line.match(/^([A-Z_]+)=(.*)$/)
  if (m && !process.env[m[1]]) process.env[m[1]] = m[2].trim()
}
const URL_ = process.env.NEXT_PUBLIC_SUPABASE_URL
const KEY = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY

let failures = 0
const expect = (label, cond) => { if (!cond) failures++; console.log(`  ${cond ? 'PASS' : 'FAIL'}  ${label}`) }

const db = createClient(URL_, KEY)
const { data: auth, error: authErr } = await db.auth.signInWithPassword({
  email: 'gp@clavio.app', password: 'ClavioDemo2026',
})
if (authErr) { console.error(authErr.message); process.exit(1) }

// Everything that must never appear, gathered from the live data rather than
// hardcoded — so the scan stays correct as the demo data changes.
const { data: quarters } = await db.from('quarters').select('*')
const figures = new Set()
for (const q of quarters ?? []) {
  for (const [k, v] of Object.entries(q)) {
    if (typeof v === 'number' && Math.abs(v) >= 1000) figures.add(String(v))
  }
}
const { data: docs } = await db.from('documents').select('title_en, storage_path')
const filenames = (docs ?? []).flatMap(d => [d.storage_path].filter(Boolean))
const emails = ['gp@clavio.app', 'lp@clavio.app', 'submit@clavio.app', 'submit.atelier@clavio.app']
const questionish = ['why did', 'cash fall', 'What is my total return', 'gross margin']

// `id` and `created_at` are excluded from the FIGURE scan, and only from that.
// A bigserial and a microsecond timestamp are structurally incapable of
// carrying a leaked figure, but their digit runs collide with one constantly —
// "...984173+00:00" contains 4173, which is also an interest value in a
// quarter row. Left in, the scan reports a leak that is not one, and a test
// that cries wolf gets ignored, which is worse than not having it.
//
// They remain in the text scan below: if a filename, address or question
// fragment ever appeared in either, that WOULD be real.
const NUMERIC_NOISE = new Set(['id', 'created_at'])

function scan(rows) {
  const hits = []
  const textBlob = rows.map(r => Object.entries(r)
    .filter(([k]) => !NUMERIC_NOISE.has(k))
    .map(([, v]) => (v === null ? '' : String(v))).join(' ')).join('\n')
  const blob = rows.map(r => Object.values(r).map(v => (v === null ? '' : String(v))).join(' ')).join('\n')
  // Figures matched as whole numbers, not substrings: 4173 inside 984173 is a
  // coincidence, 4173 standing alone would not be.
  for (const f of figures) {
    if (new RegExp(`(^|[^0-9])${f}([^0-9]|$)`).test(textBlob)) hits.push(`figure ${f}`)
  }
  for (const f of filenames) if (blob.includes(f)) hits.push(`filename ${f}`)
  for (const e of emails)    if (blob.includes(e)) hits.push(`email ${e}`)
  for (const q of questionish) if (blob.toLowerCase().includes(q.toLowerCase())) hits.push(`question text "${q}"`)
  return hits
}

console.log('\n── Control: can the scan detect a leak at all? ──')
const someFigure = Array.from(figures)[0]
const poisoned = [{
  route: '/api/ask', method: 'POST', status: 200, duration_ms: 12,
  // Everything the design forbids, in one row.
  role: `gp asked: why did cash fall from ${someFigure}`,
  lang: 'en', user_id: emails[0],
}]
const controlHits = scan(poisoned)
console.log(`  poisoned row tripped ${controlHits.length} detector(s): ${controlHits.slice(0, 4).join(', ')}`)
expect('the scan detects a planted figure', controlHits.some(h => h.startsWith('figure')))
expect('the scan detects a planted email', controlHits.some(h => h.startsWith('email')))
expect('the scan detects planted question text', controlHits.some(h => h.startsWith('question')))

console.log('\n── The real table ──')
const { data: rows, error } = await db.from('usage_log').select('*').limit(1000)
if (error) { console.error('could not read usage_log:', error.message); process.exit(1) }
console.log(`  ${rows.length} row(s) scanned against ${figures.size} figures, ${filenames.length} filenames, ${emails.length} addresses`)
const hits = scan(rows)
if (hits.length) console.log('  HITS:', hits.slice(0, 10).join(', '))
expect('no financial figure, filename, address or question text appears in usage_log', hits.length === 0)

console.log('\n── The schema itself ──')
// The strongest guarantee is structural: a column that could hold free-form
// content does not exist.
const columns = rows.length ? Object.keys(rows[0]) : []
console.log(`  columns: ${columns.join(', ')}`)
expect('there is no metadata/jsonb catch-all column',
  !columns.some(c => /metadata|payload|detail|context|body|extra/i.test(c)))

const ALLOWED = new Set([
  'id', 'created_at', 'route', 'method', 'status', 'duration_ms', 'role',
  'user_id', 'company_id', 'fund_id',
  'input_tokens', 'output_tokens', 'cache_read_tokens', 'cache_write_tokens', 'lang',
])
const unexpected = columns.filter(c => !ALLOWED.has(c))
expect(`every column is on the allow-list${unexpected.length ? ` (unexpected: ${unexpected.join(', ')})` : ''}`,
  unexpected.length === 0)

console.log(`\n${failures === 0 ? 'ALL CHECKS PASS' : failures + ' CHECK(S) FAILED'}\n`)
process.exit(failures === 0 ? 0 : 1)
