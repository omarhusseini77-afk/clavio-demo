// The company selector: scoping, and what it refuses.
//
// The parameter narrows WITHIN what RLS already permits — it is not an access
// decision. These checks confirm that, and every denial is paired with the same
// request by someone entitled to it, so an empty result proves refusal rather
// than a wrong id.
//
// The cross-FUND denial is not here: it needs a second tenant, and with one
// fund in the database a clean result would be vacuous. See
// test-company-selector-crossfund.mjs, run separately with a temporary tenant.
//
//   npx tsx scripts/test-company-selector.mjs      (needs the dev server)

import { createClient } from '@supabase/supabase-js'
import fs from 'node:fs'
import path from 'node:path'

for (const line of fs.readFileSync(path.join(process.cwd(), '.env.local'), 'utf8').split('\n')) {
  const m = line.match(/^([A-Z_]+)=(.*)$/)
  if (m && !process.env[m[1]]) process.env[m[1]] = m[2].trim()
}
const BASE = process.env.TEST_BASE_URL ?? 'http://localhost:3000'
const URL_ = process.env.NEXT_PUBLIC_SUPABASE_URL
const KEY = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY
const ref = new URL(URL_).hostname.split('.')[0]

let failures = 0
const expect = (label, cond) => { if (!cond) failures++; console.log(`  ${cond ? 'PASS' : 'FAIL'}  ${label}`) }

async function cookieFor(email) {
  const db = createClient(URL_, KEY)
  const { data, error } = await db.auth.signInWithPassword({ email, password: 'ClavioDemo2026' })
  if (error) throw new Error(`${email}: ${error.message}`)
  return `sb-${ref}-auth-token=base64-${Buffer.from(JSON.stringify(data.session)).toString('base64')}`
}

const get = async (cookie, qs = '') => {
  const res = await fetch(`${BASE}/api/quarters${qs}`, { headers: cookie ? { cookie } : {} })
  let body = null
  try { body = await res.json() } catch { /* empty */ }
  return { status: res.status, body }
}

const gp = await cookieFor('gp@clavio.app')
const mrj = await cookieFor('submit@clavio.app')
const asp = await cookieFor('submit.atelier@clavio.app')

// The selector's options come from /api/fund-data.
const fd = await (await fetch(`${BASE}/api/fund-data`, { headers: { cookie: gp } })).json()
const options = fd.quartersCompanies ?? []
const idOf = (name) => options.find(o => o.name.includes(name))?.id

console.log('\n── The selector list ──')
console.log('  ' + options.map(o => `${o.name} (${o.quartersFiled}, latest ${o.latestPeriod})`).join('\n  '))
expect('lists exactly the four companies that have filed', options.length === 4)
expect('excludes companies with nothing filed (Abington, Delacourt)',
  !options.some(o => /Abington|Delacourt/.test(o.name)))
expect('every option reports a real quarter count',
  options.every(o => o.quartersFiled > 0 && typeof o.latestPeriod === 'string'))

console.log('\n── Default is unchanged ──')
const def = await get(gp)
expect('no parameter still returns 13 rows (Marlow & Reed, most quarters filed)',
  def.status === 200 && def.body.length === 13)

console.log('\n── A GP can select each of its own companies (positive controls) ──')
for (const [name, n] of [['Marlow', 13], ['Halcyon', 8], ['Sentinel', 8], ['Atelier', 8]]) {
  const id = idOf(name)
  const r = await get(gp, `?company=${id}`)
  expect(`${name}: ${n} rows, all for that company`,
    r.status === 200 && r.body.length === n && r.body.every(q => q.company_id === id))
}

console.log('\n── Denials ──')
// A well-formed id that belongs to nothing. Proves an unknown id is empty, not
// an error — an error would tell a caller whether an id exists.
const nowhere = '00000000-0000-0000-0000-0000000000ff'
const r1 = await get(gp, `?company=${nowhere}`)
expect('an id belonging to no company returns an empty series, not an error',
  r1.status === 200 && Array.isArray(r1.body) && r1.body.length === 0)

// The real in-fund denial available without a second tenant: a portfolio
// company asking for a PEER's id. The id exists and is valid; the caller is
// simply not entitled to it.
const halcyonId = idOf('Halcyon')
const aspId = idOf('Atelier')
const peer = await get(mrj, `?company=${halcyonId}`)
expect('a portfolio company asking for a PEER\'s company id gets nothing',
  peer.status === 200 && peer.body.length === 0)
const peer2 = await get(asp, `?company=${halcyonId}`)
expect('the second portfolio company cannot reach that peer either',
  peer2.status === 200 && peer2.body.length === 0)

// Positive controls for those two. Without these, the zeros above could mean
// the parameter is simply broken.
const own = await get(mrj, `?company=${idOf('Marlow')}`)
expect('...but it CAN ask for its own id and gets its 13 rows (control)',
  own.status === 200 && own.body.length === 13)
const own2 = await get(asp, `?company=${aspId}`)
expect('...and Atelier gets its own 8 rows (control)',
  own2.status === 200 && own2.body.length === 8)
// And the GP CAN read Halcyon, so the denial above is about the caller, not
// about that company being unreadable to everyone.
const gpHalcyon = await get(gp, `?company=${halcyonId}`)
expect('the GP can read the same Halcyon id the companies were refused (control)',
  gpHalcyon.status === 200 && gpHalcyon.body.length === 8)

expect('anon gets 401 with or without a company parameter',
  (await get(null, `?company=${halcyonId}`)).status === 401)

console.log('\n── The assistant follows the same selection ──')
// /api/ask cannot be exercised end to end without an Anthropic key, so this
// asserts the plumbing rather than a grounded answer: the route must resolve
// the requested company through the SAME function the dashboard uses.
const askSrc = fs.readFileSync('app/api/ask/route.ts', 'utf8')
expect('the ask route reads a company from the body',
  /body\.company/.test(askSrc))
expect('and passes it to fetchScopedQuarters, not a query of its own',
  /fetchScopedQuarters\(supabase, profile, requestedCompany\)/.test(askSrc))
expect('and relabels the series with the SELECTED company name',
  /quartersCompanies.*find\(c => c\.id === quartersCompanyId\)/s.test(askSrc))
expect('body.context is still ignored', /body\.context is ignored|ignores/.test(askSrc) || !/const .*= body\.context/.test(askSrc))

console.log(`\n${failures === 0 ? 'ALL CHECKS PASS' : failures + ' CHECK(S) FAILED'}\n`)
process.exit(failures === 0 ? 0 : 1)
