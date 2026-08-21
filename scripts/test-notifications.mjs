// Can a message to a portfolio company leak fund or peer information?
//
// The claim: a submit-audience email may reference only the company's own name,
// the period, the deadline, and a link. Not the fund. Not a peer. Not "you are
// the last one we are waiting on".
//
// Checked against EVERY peer name and slug in the fund and against the fund
// name itself — and paired with a positive control that the company's OWN name
// IS present, because a composer returning an empty string would pass a leak
// test perfectly.
//
//   npx tsx scripts/test-notifications.mjs

import { createClient } from '@supabase/supabase-js'
import fs from 'node:fs'
import path from 'node:path'

for (const line of fs.readFileSync(path.join(process.cwd(), '.env.local'), 'utf8').split('\n')) {
  const m = line.match(/^([A-Z_]+)=(.*)$/)
  if (m && !process.env[m[1]]) process.env[m[1]] = m[2].trim()
}

const {
  submissionReminder, submissionConfirmation, gpSubmissionConfirmation,
} = await import('../lib/emailTemplates.ts')

const db = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL, process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY)
const { error: authErr } = await db.auth.signInWithPassword({ email: 'gp@clavio.app', password: 'ClavioDemo2026' })
if (authErr) { console.error(authErr.message); process.exit(1) }

const { data: fund } = await db.from('funds').select('name').limit(1).single()
const { data: companies } = await db.from('companies').select('name, slug')

let failures = 0
const expect = (label, cond) => { if (!cond) failures++; console.log(`  ${cond ? 'PASS' : 'FAIL'}  ${label}`) }

console.log(`\nFund: "${fund.name}"   companies: ${companies.map(c => c.slug).join(', ')}`)

console.log('\n── Every submit-audience email, for every company, in both languages ──')
for (const lang of ['en', 'fr']) {
  for (const me of companies) {
    const ctx = {
      companyName: me.name,
      period: 'Q1 FY26',
      deadline: lang === 'fr' ? '15 mai 2026' : '15 May 2026',
      link: 'https://clavio-demo.vercel.app/',
    }
    for (const [kind, composed] of [
      ['reminder', submissionReminder(ctx, lang)],
      ['confirmation', submissionConfirmation(ctx, lang)],
    ]) {
      const text = `${composed.subject}\n${composed.body}`
      const peers = companies.filter(c => c.slug !== me.slug)

      const leaks = []
      if (text.includes(fund.name)) leaks.push(`fund name "${fund.name}"`)
      for (const p of peers) {
        if (text.includes(p.name)) leaks.push(`peer name "${p.name}"`)
        // Slugs too: a link or reference could carry one where a name would not.
        if (new RegExp(`\\b${p.slug}\\b`, 'i').test(text)) leaks.push(`peer slug "${p.slug}"`)
      }
      // Phrases that are peer information in disguise.
      for (const phrase of ['last one', 'other companies', 'dernier', 'autres sociétés', 'of the portfolio']) {
        if (text.toLowerCase().includes(phrase.toLowerCase())) leaks.push(`comparative phrase "${phrase}"`)
      }

      expect(`${lang} ${kind} to ${me.slug}: no fund, no peer, no comparison${leaks.length ? ` — ${leaks.join(', ')}` : ''}`,
        leaks.length === 0)

      // Positive control. Without this, a composer that returned "" would look
      // like the most private template ever written.
      expect(`${lang} ${kind} to ${me.slug}: DOES name the company itself (control)`,
        text.includes(me.name))
    }
  }
}

console.log('\n── The GP template is allowed the fund name — proving the check can see one ──')
// If this did NOT find the fund name, every clean result above would be
// meaningless: it would mean the detector cannot spot a fund name at all.
const gpText = (() => {
  const c = gpSubmissionConfirmation({
    companyName: companies[0].name, period: 'Q1 FY26', fundName: fund.name,
    filedAt: '1 May 2026', link: 'https://clavio-demo.vercel.app/gp',
  }, 'en')
  return `${c.subject}\n${c.body}`
})()
expect('the GP template contains the fund name, so the detector demonstrably works', gpText.includes(fund.name))

console.log('\n── Templates are not shared between audiences ──')
const src = fs.readFileSync('lib/emailTemplates.ts', 'utf8')
expect('no submit-audience function receives a fundName',
  !/function submission(Reminder|Confirmation)[\s\S]{0,400}fundName/.test(src))
expect('SubmitContext does not declare a fundName field',
  !/interface SubmitContext[\s\S]*?\}/.exec(src)[0].includes('fundName'))

console.log(`\n${failures === 0 ? 'ALL CHECKS PASS' : failures + ' CHECK(S) FAILED'}\n`)
process.exit(failures === 0 ? 0 : 1)
