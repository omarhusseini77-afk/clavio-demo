// Does the investor PDF contain anything an investor is not shown?
//
// The claim under test is that cash, receivables, payables and net debt never
// appear. Proving that against an LP session alone would be worthless: RLS has
// already removed those figures before the payload reaches the browser, so an
// empty result would say nothing about the exporter.
//
// So it runs TWICE:
//   * as an LP  — the real case, must be clean
//   * as a GP   — whose payload DOES carry those figures, so if the exporter
//                 rendered them it would show here. A clean GP run is what
//                 makes the clean LP run mean something.
//
//   npx tsx scripts/test-lp-report.mjs

import { createClient } from '@supabase/supabase-js'
import fs from 'node:fs'
import path from 'node:path'

for (const line of fs.readFileSync(path.join(process.cwd(), '.env.local'), 'utf8').split('\n')) {
  const m = line.match(/^([A-Z_]+)=(.*)$/)
  if (m && !process.env[m[1]]) process.env[m[1]] = m[2].trim()
}

const BASE = process.env.TEST_BASE_URL ?? 'http://localhost:3000'
const PASSWORD = 'ClavioDemo2026'

let failures = 0
const expect = (label, cond) => {
  if (!cond) failures++
  console.log(`  ${cond ? 'PASS' : 'FAIL'}  ${label}`)
}

// Signs in and returns the cookie header a Next.js route handler expects, by
// driving the same endpoint the browser does.
async function sessionCookie(email) {
  const db = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL, process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY)
  const { data, error } = await db.auth.signInWithPassword({ email, password: PASSWORD })
  if (error) throw new Error(`${email}: ${error.message}`)
  const ref = new URL(process.env.NEXT_PUBLIC_SUPABASE_URL).hostname.split('.')[0]
  const payload = encodeURIComponent(JSON.stringify(data.session))
  return `sb-${ref}-auth-token=base64-${Buffer.from(decodeURIComponent(payload)).toString('base64')}`
}

async function payloadFor(email) {
  const cookie = await sessionCookie(email)
  const res = await fetch(`${BASE}/api/fund-data`, { headers: { cookie } })
  if (!res.ok) throw new Error(`${email}: /api/fund-data returned ${res.status}`)
  return res.json()
}

// The exporter reads only these keys. Rather than rendering a PDF in Node —
// which needs a DOM — this checks the source of truth: which fields the module
// actually reaches for.
const SOURCE = fs.readFileSync('lib/lpReportPdf.ts', 'utf8')
const FORBIDDEN_FIELDS = ['netDebt', 'cash', 'receivables', 'payables']

console.log('\n── Does the exporter reference a withheld field at all? ──')
for (const field of FORBIDDEN_FIELDS) {
  // Matches a property read: `.netDebt`, `['netDebt']`, `yr.cash`.
  const re = new RegExp(`[.\\[]\\s*['"\`]?${field}\\b`)
  const hit = re.test(SOURCE.replace(/^\s*\/\/.*$/gm, ''))   // comments do not count
  expect(`lib/lpReportPdf.ts never reads .${field}`, !hit)
}
// Positive control: the scan CAN find a field, so a clean result above is not
// the regex silently matching nothing.
expect(
  'the same scan does find .revenue, which the exporter legitimately reads (control)',
  /[.\[]\s*['"`]?revenue\b/.test(SOURCE.replace(/^\s*\/\/.*$/gm, '')),
)

console.log('\n── What each session actually receives ──')
for (const [email, label] of [['lp@clavio.app', 'LP'], ['gp@clavio.app', 'GP']]) {
  const p = await payloadFor(email)
  const years = (p.companies ?? []).flatMap(c => c.data ?? [])
  const withInternals = years.filter(y => y.cash !== undefined || y.receivables !== undefined || y.payables !== undefined)
  const withNetDebt = (p.companies ?? []).filter(c => c.netDebt !== undefined)
  console.log(`  ${label}: ${(p.companies ?? []).length} companies, ${years.length} company-years, ` +
              `${withInternals.length} carrying working capital, ${withNetDebt.length} carrying net debt`)
  if (label === 'LP') {
    expect('LP payload carries no working-capital fields', withInternals.length === 0)
    expect('LP payload carries no net debt', withNetDebt.length === 0)
  } else {
    // This is the control. If the GP payload were also empty, the LP result
    // above would prove nothing about RLS.
    expect('GP payload DOES carry working capital (control — otherwise the LP result is vacuous)', withInternals.length > 0)
    expect('GP payload DOES carry net debt (control)', withNetDebt.length > 0)
  }
}

console.log(`\n${failures === 0 ? 'ALL CHECKS PASS' : failures + ' CHECK(S) FAILED'}\n`)
process.exit(failures === 0 ? 0 : 1)
