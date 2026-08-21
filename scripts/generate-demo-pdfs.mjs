// Generates one PDF per row in `documents` and uploads it to the
// fund-documents bucket, then records the path on the row.
//
// Every page carries a demonstration-document notice, and the body repeats it.
// These files are downloadable and will end up detached from the demo, so they
// must not be mistakable for a real financial statement.
//
// Requires SUPABASE_SERVICE_ROLE_KEY: writing to fund-documents is deliberately
// impossible from the client (no insert policy on that bucket), so seeding is a
// service-role operation run from a trusted machine, never from the app.
//
//   SUPABASE_SERVICE_ROLE_KEY=... node scripts/generate-demo-pdfs.mjs

import { createClient } from '@supabase/supabase-js'
import { jsPDF } from 'jspdf'
import fs from 'node:fs'
import path from 'node:path'

const envPath = path.join(process.cwd(), '.env.local')
for (const line of fs.readFileSync(envPath, 'utf8').split('\n')) {
  const m = line.match(/^([A-Z_]+)=(.*)$/)
  if (m && !process.env[m[1]]) process.env[m[1]] = m[2].trim()
}

const url = process.env.NEXT_PUBLIC_SUPABASE_URL
const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY
if (!serviceKey) {
  console.error('SUPABASE_SERVICE_ROLE_KEY is required (Supabase dashboard > Project Settings > API).')
  process.exit(1)
}

const db = createClient(url, serviceKey, { auth: { persistSession: false } })

const NOTICE = 'Demonstration document - sample data, not a real financial report.'
const NAVY = [15, 23, 42]
const ACCENT = [22, 82, 160]
const MUTED = [110, 120, 135]

function buildPdf({ title, typeLabel, dateLabel, fundName, periodLabel }) {
  const doc = new jsPDF({ unit: 'pt', format: 'a4' })
  const W = doc.internal.pageSize.getWidth()
  const H = doc.internal.pageSize.getHeight()
  const M = 56

  // Wordmark
  doc.setFont('helvetica', 'bold'); doc.setFontSize(22)
  doc.setTextColor(...NAVY); doc.text('CLA', M, 70)
  const claW = doc.getTextWidth('CLA')
  doc.setTextColor(...ACCENT); doc.text('V', M + claW, 70)
  const vW = doc.getTextWidth('V')
  doc.setTextColor(...NAVY); doc.text('IO', M + claW + vW, 70)

  doc.setDrawColor(225, 230, 238); doc.setLineWidth(1)
  doc.line(M, 86, W - M, 86)

  // Title block
  doc.setFont('helvetica', 'bold'); doc.setFontSize(19); doc.setTextColor(...NAVY)
  doc.text(doc.splitTextToSize(title, W - M * 2), M, 128)

  doc.setFont('helvetica', 'normal'); doc.setFontSize(10.5); doc.setTextColor(...MUTED)
  doc.text(`${fundName}  ·  ${typeLabel}  ·  ${dateLabel}`, M, 152)

  // The notice, in the body and impossible to miss.
  doc.setFillColor(255, 247, 230); doc.setDrawColor(240, 200, 120)
  doc.roundedRect(M, 172, W - M * 2, 40, 5, 5, 'FD')
  doc.setFont('helvetica', 'bold'); doc.setFontSize(10); doc.setTextColor(150, 90, 10)
  doc.text(NOTICE, M + 14, 190)
  doc.setFont('helvetica', 'normal'); doc.setFontSize(9)
  doc.text('Figures are synthetic and generated for product demonstration purposes only.', M + 14, 204)

  // Body
  const body = [
    `This document accompanies the ${periodLabel} reporting cycle for ${fundName}.`,
    '',
    'In a live deployment this file would contain the full statement produced from',
    'the standardised accounting data collected from each portfolio company, together',
    'with the partner commentary and the investor-level capital account movements for',
    'the period.',
    '',
    'It is generated here so that the document workflow - storage, access control and',
    'retrieval through short-lived signed links - can be demonstrated end to end with',
    'real files rather than placeholders.',
  ]
  doc.setFontSize(11); doc.setTextColor(45, 55, 72)
  let y = 248
  for (const line of body) { doc.text(line, M, y); y += 17 }

  // Footer on every page
  const pages = doc.getNumberOfPages()
  for (let p = 1; p <= pages; p++) {
    doc.setPage(p)
    doc.setDrawColor(225, 230, 238)
    doc.line(M, H - 58, W - M, H - 58)
    doc.setFont('helvetica', 'bold'); doc.setFontSize(8.5); doc.setTextColor(150, 90, 10)
    doc.text(NOTICE, M, H - 42)
    doc.setFont('helvetica', 'normal'); doc.setTextColor(...MUTED)
    doc.text(`CLAVIO  ·  ${fundName}  ·  page ${p} of ${pages}`, M, H - 28)
  }

  return Buffer.from(doc.output('arraybuffer'))
}

const slug = s => s.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '').slice(0, 60)

const { data: fund } = await db.from('funds').select('id, name, period_label').limit(1).single()
const { data: docs, error } = await db
  .from('documents')
  .select('id, title_en, type_en, date_label, fund_id')
  .order('sort_order')

if (error) { console.error('Could not read documents:', error.message); process.exit(1) }

console.log(`Fund: ${fund.name}   documents: ${docs.length}\n`)

for (const d of docs) {
  const pdf = buildPdf({
    title: d.title_en,
    typeLabel: d.type_en ?? 'Document',
    dateLabel: d.date_label ?? '',
    fundName: fund.name,
    periodLabel: fund.period_label ?? '',
  })

  const objectPath = `${d.fund_id}/${d.id}/${slug(d.title_en)}.pdf`

  const { error: upErr } = await db.storage
    .from('fund-documents')
    .upload(objectPath, pdf, { contentType: 'application/pdf', upsert: true })
  if (upErr) { console.error(`  upload failed for ${d.title_en}: ${upErr.message}`); continue }

  const { error: rowErr } = await db
    .from('documents')
    .update({ storage_path: objectPath })
    .eq('id', d.id)
  if (rowErr) { console.error(`  path update failed for ${d.title_en}: ${rowErr.message}`); continue }

  console.log(`  ok  ${(pdf.length / 1024).toFixed(1).padStart(6)} KB  ${objectPath}`)
}

console.log('\nDone.')
