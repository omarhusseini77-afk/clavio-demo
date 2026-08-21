// Adversarial pass on the Phase 7 tables.
//
// Every denial is paired with the identical operation by someone entitled to
// it, so a failure proves refusal rather than a malformed request. That pairing
// is not ceremony: it is what caught the anomalies check constraint being
// answered by RLS instead of by the constraint (docs/verification-notes.md #4).
//
//   npx tsx scripts/test-phase7-rls.mjs

import { createClient } from '@supabase/supabase-js'
import fs from 'node:fs'
import path from 'node:path'

for (const line of fs.readFileSync(path.join(process.cwd(), '.env.local'), 'utf8').split('\n')) {
  const m = line.match(/^([A-Z_]+)=(.*)$/)
  if (m && !process.env[m[1]]) process.env[m[1]] = m[2].trim()
}
const URL_ = process.env.NEXT_PUBLIC_SUPABASE_URL
const KEY = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY
const PW = 'ClavioDemo2026'

let failures = 0
const expect = (label, cond) => { if (!cond) failures++; console.log(`  ${cond ? 'PASS' : 'FAIL'}  ${label}`) }

const login = async (email) => {
  const db = createClient(URL_, KEY)
  const { data, error } = await db.auth.signInWithPassword({ email, password: PW })
  if (error) throw new Error(`${email}: ${error.message}`)
  return { db, uid: data.user.id }
}

const anon = createClient(URL_, KEY)
const gp = await login('gp@clavio.app')
const lp = await login('lp@clavio.app')
const mrj = await login('submit@clavio.app')
const asp = await login('submit.atelier@clavio.app')

const { data: fundRow } = await gp.db.from('funds').select('id').limit(1).single()
const { data: comps } = await gp.db.from('companies').select('id, slug')
const idOf = (slug) => comps.find(c => c.slug === slug).id

console.log('\n── Seed one outbox row as the GP (positive control first) ──')
const seeded = await gp.db.from('email_outbox').insert({
  fund_id: fundRow.id, company_id: idOf('mrj'), recipient_profile_id: gp.uid,
  audience: 'gp', kind: 'submission_confirmation',
  subject: 'RLS PROBE', body: 'RLS PROBE',
}).select('id').single()
expect('GP can write an outbox row in its own fund', !seeded.error && !!seeded.data)

console.log('\n── email_outbox: who can read it ──')
expect('GP reads its own fund\'s outbox',
  (await gp.db.from('email_outbox').select('id')).data?.length > 0)
expect('LP reads NOTHING from the outbox',
  ((await lp.db.from('email_outbox').select('id')).data ?? []).length === 0)
expect('a portfolio company reads NOTHING from the outbox (the list of who was chased IS peer information)',
  ((await mrj.db.from('email_outbox').select('id')).data ?? []).length === 0)
expect('anon reads NOTHING from the outbox',
  ((await anon.from('email_outbox').select('id')).data ?? []).length === 0)

console.log('\n── email_outbox: what a portfolio company may write ──')
const ownRow = {
  fund_id: fundRow.id, company_id: idOf('mrj'), recipient_profile_id: mrj.uid,
  audience: 'submit', kind: 'submission_confirmation', subject: 'own', body: 'own',
}
const ok = await mrj.db.from('email_outbox').insert(ownRow)
expect('a company CAN write a message about itself, to itself (positive control)', !ok.error)

expect('a company CANNOT write a message about a PEER company',
  !!(await mrj.db.from('email_outbox').insert({ ...ownRow, company_id: idOf('asp') })).error)
expect('a company CANNOT address a message to someone else',
  !!(await mrj.db.from('email_outbox').insert({ ...ownRow, recipient_profile_id: gp.uid })).error)
expect('a company CANNOT write a gp-audience message',
  !!(await mrj.db.from('email_outbox').insert({ ...ownRow, audience: 'gp' })).error)
expect('anon CANNOT write to the outbox',
  !!(await anon.from('email_outbox').insert(ownRow)).error)

console.log('\n── email_outbox: nothing can be deleted, by anyone ──')
const before = (await gp.db.from('email_outbox').select('id')).data.length
await gp.db.from('email_outbox').delete().eq('subject', 'RLS PROBE')
await mrj.db.from('email_outbox').delete().eq('subject', 'own')
const after = (await gp.db.from('email_outbox').select('id')).data.length
expect(`no delete policy exists, so rows survive a delete attempt (${before} before, ${after} after)`, before === after)

console.log('\n── usage_log ──')
const logRow = { route: '/probe', method: 'GET', status: 200, duration_ms: 1, role: 'gp', fund_id: fundRow.id }
expect('a session CAN log a row attributed to itself (positive control)',
  !(await gp.db.from('usage_log').insert({ ...logRow, user_id: gp.uid })).error)
expect('a session CANNOT log a row attributed to a DIFFERENT user',
  !!(await gp.db.from('usage_log').insert({ ...logRow, user_id: lp.uid })).error)
expect('anon CANNOT write to usage_log',
  !!(await anon.from('usage_log').insert({ ...logRow, user_id: gp.uid })).error)
expect('LP reads NOTHING from usage_log',
  ((await lp.db.from('usage_log').select('id')).data ?? []).length === 0)
expect('a portfolio company reads NOTHING from usage_log',
  ((await mrj.db.from('usage_log').select('id')).data ?? []).length === 0)
expect('GP reads its own fund\'s usage_log (positive control)',
  ((await gp.db.from('usage_log').select('id')).data ?? []).length > 0)

console.log('\n── usage_log: existing rows cannot be rewritten ──')
const row = (await gp.db.from('usage_log').select('id, route').eq('route', '/probe').limit(1).single()).data
await gp.db.from('usage_log').update({ route: '/tampered' }).eq('id', row.id)
const afterUpd = (await gp.db.from('usage_log').select('route').eq('id', row.id).single()).data
expect('no update policy, so a logged row keeps its value', afterUpd.route === '/probe')

console.log('\n── clean up the probe rows ──')
// Deliberately NOT deleted from the client — there is no delete policy, which
// is the point. Left in place and reported so they can be removed in SQL if
// wanted; they carry no content beyond the word "probe".
const probes = (await gp.db.from('usage_log').select('id').eq('route', '/probe')).data ?? []
const outboxProbes = (await gp.db.from('email_outbox').select('id').in('subject', ['RLS PROBE', 'own'])).data ?? []
console.log(`  ${probes.length} usage_log probe row(s) and ${outboxProbes.length} outbox probe row(s) remain — by design, nothing here can delete them.`)

console.log(`\n${failures === 0 ? 'ALL CHECKS PASS' : failures + ' CHECK(S) FAILED'}\n`)
process.exit(failures === 0 ? 0 : 1)
