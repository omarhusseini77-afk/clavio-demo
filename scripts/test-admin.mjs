// The admin endpoint: what it refuses, and what it cannot do even when asked.
//
// Every denial paired with the same call by a GP, so a failure proves refusal
// rather than a malformed request.
//
//   npx tsx scripts/test-admin.mjs      (needs the dev server running)

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

const call = async (cookie, init) => {
  const res = await fetch(`${BASE}/api/admin`, {
    ...init, headers: { ...(init?.headers ?? {}), ...(cookie ? { cookie } : {}) },
  })
  let body = null
  try { body = await res.json() } catch { /* empty */ }
  return { status: res.status, body }
}

const gp = await cookieFor('gp@clavio.app')
const lp = await cookieFor('lp@clavio.app')
const sub = await cookieFor('submit@clavio.app')

console.log('\n── Who can reach it ──')
const gpGet = await call(gp)
expect('GP can read the admin data (positive control)', gpGet.status === 200 && Array.isArray(gpGet.body?.companies))
expect('LP gets 404, not 403 — the endpoint does not confirm it exists', (await call(lp)).status === 404)
expect('a portfolio company gets 404', (await call(sub)).status === 404)
expect('anon gets 401', (await call(null)).status === 401)

console.log('\n── What it reports ──')
const d = gpGet.body
console.log(`  ${d.companies.length} companies, ${d.outbox.length} outbox row(s), ${d.usage.window} usage row(s) in window`)
expect('every company reports its filing state', d.companies.every(c => typeof c.quartersFiled === 'number'))
expect('usage is aggregated by route, not a per-request stream',
  Array.isArray(d.usage.routes) && !('rows' in d.usage))
expect('dispatch is reported as OFF (no provider key, fund flag false)',
  d.dispatch.providerConfigured === false && d.dispatch.fundEnabled === false)

console.log('\n── The four writes, and their limits ──')
const co = d.companies[0]
const before = co.cfoSignalsSimultaneous
expect('GP can toggle cfo_signals_simultaneous (positive control)',
  (await call(gp, { method: 'POST', headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ action: 'set_simultaneous', companyId: co.id, value: !before }) })).status === 200)
// Put it back.
await call(gp, { method: 'POST', headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({ action: 'set_simultaneous', companyId: co.id, value: before }) })
const restored = (await call(gp)).body.companies.find(c => c.id === co.id)
expect('the toggle is reversible and was restored', restored.cfoSignalsSimultaneous === before)

expect('a deadline outside 1-120 days is rejected',
  (await call(gp, { method: 'POST', headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ action: 'set_deadline_days', companyId: co.id, value: 9999 }) })).status === 400)
expect('a valid deadline is accepted (control)',
  (await call(gp, { method: 'POST', headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ action: 'set_deadline_days', companyId: co.id, value: co.reportingDeadlineDays }) })).status === 200)

expect('an LP cannot perform a write either', (await call(lp, { method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({ action: 'set_dispatch', value: true }) })).status === 404)

console.log('\n── What it refuses to be ──')
for (const action of ['delete_company', 'delete_quarter', 'reset_demo', 'send_now', 'update', 'patch', 'set_password']) {
  const r = await call(gp, { method: 'POST', headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ action, companyId: co.id, value: 1 }) })
  expect(`"${action}" is not an action this endpoint has (${r.status})`, r.status === 400)
}

console.log('\n── Composing a reminder writes a row and sends nothing ──')
// Deliberately a company that HAS a submitting user. Aimed at one that does
// not, this check passes through its own error branch and proves nothing — the
// first version of it did exactly that.
const target = d.companies.find(c => c.slug === 'mrj') ?? co
const outboxBefore = (await call(gp)).body.outbox.length
const comp = await call(gp, { method: 'POST', headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({ action: 'compose_reminder', companyId: target.id, period: 'Q1 FY26' }) })
const after = (await call(gp)).body
expect(`compose_reminder for ${target.slug} queued exactly one row (${outboxBefore} -> ${after.outbox.length})`,
  comp.status === 200 && after.outbox.length === outboxBefore + 1)

// The refusal case is asserted separately rather than folded into the above.
const noUser = d.companies.find(c => !['mrj', 'asp'].includes(c.slug))
if (noUser) {
  const r = await call(gp, { method: 'POST', headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ action: 'compose_reminder', companyId: noUser.id, period: 'Q1 FY26' }) })
  expect(`a company with no submitting user is refused cleanly (${noUser.slug})`,
    r.status === 400 && String(r.body?.error).includes('submitting user'))
}
const queued = after.outbox.find(o => o.kind === 'submission_reminder')
if (queued) {
  expect('the queued reminder is pending, not sent', queued.status === 'pending' && queued.sent_at === null)
  // Cancel it, and confirm cancelling marks rather than removes.
  const n = after.outbox.length
  await call(gp, { method: 'POST', headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ action: 'cancel_outbox', id: queued.id, reason: 'test' }) })
  const post = (await call(gp)).body.outbox
  expect('cancelling MARKS the row and does not delete it',
    post.length === n && post.find(o => o.id === queued.id)?.status === 'cancelled')
}

console.log(`\n${failures === 0 ? 'ALL CHECKS PASS' : failures + ' CHECK(S) FAILED'}\n`)
process.exit(failures === 0 ? 0 : 1)
