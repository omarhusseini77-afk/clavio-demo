// Cross-fund denial for the GP company selector.
//
// Requires the temporary second tenant (ZZTEST Fund B / ZZTEST Company B).
// Without it these checks are vacuous: with one fund in the database there is
// nothing to be denied FROM, and an empty result would prove nothing.
//
//   npx tsx scripts/test-crossfund.mjs      (needs the dev server running)

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
const B_COMPANY = '7b21cbdf-6738-47d6-9ff5-19768f7eae60'

let failures = 0
const expect = (label, cond) => { if (!cond) failures++; console.log(`  ${cond ? 'PASS' : 'FAIL'}  ${label}`) }

async function cookieFor(email) {
  const db = createClient(URL_, KEY)
  const { data, error } = await db.auth.signInWithPassword({ email, password: 'ClavioDemo2026' })
  if (error) throw new Error(`${email}: ${error.message}`)
  return `sb-${ref}-auth-token=base64-${Buffer.from(JSON.stringify(data.session)).toString('base64')}`
}
const quarters = async (cookie, qs = '') => {
  const res = await fetch(`${BASE}/api/quarters${qs}`, { headers: cookie ? { cookie } : {} })
  let body = null; try { body = await res.json() } catch { /* empty */ }
  return { status: res.status, body }
}
const fundData = async (cookie) =>
  (await fetch(`${BASE}/api/fund-data`, { headers: { cookie } })).json()

// PRECONDITION. Without the temporary tenant every denial below passes
// trivially — an empty series because the id belongs to nothing at all is not
// evidence of anything. Refuse to run rather than report a meaningless pass.
const gpA = await cookieFor('gp@clavio.app')
let gpB
try {
  gpB = await cookieFor('zztest.gpb@clavio.app')
} catch {
  console.error('\nREFUSING TO RUN: the temporary second tenant is not present.')
  console.error('Every denial in this file would pass trivially without it, which')
  console.error('would be a false clean result. Recreate ZZTEST Fund B first, and')
  console.error('update B_COMPANY with the new company id.\n')
  process.exit(2)
}
const subA = await cookieFor('submit@clavio.app')

const fdA = await fundData(gpA)
const fdB = await fundData(gpB)
const aOptions = fdA.quartersCompanies ?? []
const bOptions = fdB.quartersCompanies ?? []
const halcyon = aOptions.find(o => /Halcyon/.test(o.name))?.id

console.log('\n── The two tenants ──')
console.log('  Fund A selector: ' + aOptions.map(o => `${o.name} (${o.quartersFiled})`).join(', '))
console.log('  Fund B selector: ' + bOptions.map(o => `${o.name} (${o.quartersFiled})`).join(', '))

console.log('\n── POSITIVE CONTROLS (these make the denials mean something) ──')
// 6. If this fails, every empty result below could just be a wrong id.
const bOwn = await quarters(gpB, `?company=${B_COMPANY}`)
expect("PC1  Fund B's GP reads its OWN company: 3 rows",
  bOwn.status === 200 && bOwn.body.length === 3 && bOwn.body.every(q => q.company_id === B_COMPANY))
// 7.
let allA = true
for (const [name, n] of [['Marlow', 13], ['Halcyon', 8], ['Sentinel', 8], ['Atelier', 8]]) {
  const id = aOptions.find(o => o.name.includes(name))?.id
  const r = await quarters(gpA, `?company=${id}`)
  if (!(r.status === 200 && r.body.length === n)) allA = false
}
expect("PC2  Fund A's GP reads each of its own four companies (13/8/8/8)", allA)
// 8.
expect('PC3  Fund B\'s selector lists its own company', bOptions.length === 1 && bOptions[0].id === B_COMPANY)

console.log('\n── DENIALS ──')
// 1.
const d1 = await quarters(gpA, `?company=${B_COMPANY}`)
expect("D1  Fund A's GP requesting Fund B's company id gets an EMPTY series",
  d1.status === 200 && Array.isArray(d1.body) && d1.body.length === 0)
// 2.
expect("D2  Fund B's company does not appear in Fund A's selector",
  !aOptions.some(o => o.id === B_COMPANY || /ZZTEST/.test(o.name)))
expect("D2b Fund A's company does not appear in Fund B's selector",
  !bOptions.some(o => o.id === halcyon || /Halcyon|Marlow|Sentinel|Atelier/.test(o.name)))
// 3. The assistant. No Anthropic key, so this asserts the SCOPING the route
//    performs, by checking what a GP-A session can resolve for that id — the
//    same call /api/ask makes through the same function.
const askRes = await fetch(`${BASE}/api/ask`, {
  method: 'POST', headers: { 'Content-Type': 'application/json', cookie: gpA },
  body: JSON.stringify({ question: 'What was turnover?', company: B_COMPANY, lang: 'en' }),
})
const askBody = await askRes.json().catch(() => null)
// The key is not configured, so the route stops before the model. What matters
// is that it did NOT surface fund B data on the way; the series it would have
// used is the same empty one D1 proves.
expect('D3  the assistant route accepts the id without ever returning Fund B data',
  !JSON.stringify(askBody ?? {}).includes('999001') && !JSON.stringify(askBody ?? {}).includes('ZZTEST'))
// 4.
const d4 = await quarters(subA, `?company=${halcyon}`)
expect(`D4  a portfolio company requesting a peer id in its OWN fund gets nothing (status ${d4.status}, body ${JSON.stringify(d4.body).slice(0,80)})`,
  d4.status === 200 && Array.isArray(d4.body) && d4.body.length === 0)
// 5.
expect('D5  anon requesting any company id gets 401',
  (await quarters(null, `?company=${B_COMPANY}`)).status === 401)

console.log('\n── Cross-check: fund B cannot reach fund A either ──')
const rev = await quarters(gpB, `?company=${halcyon}`)
expect("Fund B's GP requesting Fund A's Halcyon id gets an EMPTY series",
  rev.status === 200 && rev.body.length === 0)

console.log('\n── No Fund B figure appears anywhere in Fund A\'s payloads ──')
const blobA = JSON.stringify(fdA) + JSON.stringify((await quarters(gpA)).body)
expect('the marker turnover 999001 appears nowhere in Fund A data', !blobA.includes('999001'))
expect('the string ZZTEST appears nowhere in Fund A data', !blobA.includes('ZZTEST'))
// Control: the marker IS findable where it should be, so the scan can hit.
const blobB = JSON.stringify(fdB) + JSON.stringify(bOwn.body)
expect('...but 999001 IS present in Fund B data (control — the scan can find it)', blobB.includes('999001'))

console.log(`\n${failures === 0 ? 'ALL CHECKS PASS' : failures + ' CHECK(S) FAILED'}\n`)
process.exit(failures === 0 ? 0 : 1)
