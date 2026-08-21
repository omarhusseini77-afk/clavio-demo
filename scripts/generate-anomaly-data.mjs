// Builds quarterly series for the companies the GP anomaly feed talks about,
// then VERIFIES that every numeric claim in those anomalies actually computes
// from the generated figures before emitting anything.
//
// The point is derivability, not plausibility: if a check fails the script
// exits and prints what did not derive, rather than nudging the data until the
// narrative fits.
//
// EBITDA is not a stored column. It is op + depreciation_amortisation, which is
// how every check below reconstructs it.
//
//   node scripts/generate-anomaly-data.mjs          # verify + print SQL
//   node scripts/generate-anomaly-data.mjs --check  # verify only

const DAYS = 91

const r0 = n => Math.round(n)
const mean = a => a.reduce((s, x) => s + x, 0) / a.length
const sd = a => { const m = mean(a); return Math.sqrt(mean(a.map(x => (x - m) ** 2))) }
const ebitda = q => q.op + q.depreciation_amortisation
const ebitdaMargin = q => (ebitda(q) / q.turnover) * 100
const dso = q => (q.debtors / q.turnover) * DAYS
const dpo = q => (q.creditors / q.cos) * DAYS
const dio = q => (q.stock / q.cos) * DAYS
const ccc = q => dso(q) + dio(q) - dpo(q)

// A quarter row with the boring fields filled in consistently.
function quarter({ period, turnover, gm, ebitdaMarginPct, debtors, creditors, cash, stock }) {
  const cos = r0(turnover * (1 - gm / 100))
  const gross = turnover - cos
  const eb = r0(turnover * (ebitdaMarginPct / 100))
  const da = r0(turnover * 0.02)
  const op = eb - da
  const admin = gross - op
  const interest = r0(turnover * 0.004)
  const pbt = op - interest
  const tax = r0(pbt * 0.19)
  const retained = pbt - tax
  return {
    period, turnover, cos, gross, admin, op, interest, pbt, tax, retained,
    fixed: r0(turnover * 0.9), stock, debtors, cash, creditors,
    net_assets: r0(turnover * 1.2), funds: r0(turnover * 1.2),
    depreciation_amortisation: da,
    long_term_liabilities: r0(turnover * 0.3),
  }
}

const P = ['Q1 FY24','Q2 FY24','Q3 FY24','Q4 FY24','Q1 FY25','Q2 FY25','Q3 FY25','Q4 FY25']

// ── Halcyon Textiles ────────────────────────────────────────────────────────
// Claims: EBITDA margin down 4.2pp QoQ; latest outside trailing-6Q mean +/- 2sd;
// receivables up 14% QoQ; debtor days up from ~22.8 to ~25.9.
const halcyonMargins = [11.9, 12.1, 11.8, 12.2, 12.0, 11.9, 12.0, 7.8]
const halcyonDebtors = [498_000, 505_000, 492_000, 508_000, 495_000, 502_000, 500_000, 570_000]
const halcyon = P.map((period, i) => quarter({
  period, turnover: 2_000_000, gm: 34, ebitdaMarginPct: halcyonMargins[i],
  debtors: halcyonDebtors[i], creditors: 430_000 + i * 4_000,
  cash: 610_000 - i * 12_000, stock: 540_000 + i * 5_000,
}))

// ── Sentinel Security NW ────────────────────────────────────────────────────
// Claim: reported EBITDA deviates from the trailing-6Q mean by more than 2sd.
const sentinelEbitda = [178_000, 180_000, 184_800, 177_600, 182_400, 180_000, 175_200, 168_000]
const sentinel = P.map((period, i) => quarter({
  period, turnover: 1_200_000, gm: 48,
  ebitdaMarginPct: (sentinelEbitda[i] / 1_200_000) * 100,
  debtors: 300_000 + i * 3_000, creditors: 250_000 + i * 2_000,
  cash: 880_000 + i * 6_000, stock: 120_000,
}))

// ── Atelier Saint-Pierre ────────────────────────────────────────────────────
// Already has annual accounts, so the quarters must tie to them or this fixes
// one inconsistency by creating another. Revenue and EBITDA sum to the annual
// figures; Q4 balance items equal the annual year-end values. Stock is the only
// free variable, and is what the cash-conversion-cycle claim is solved through.
const ATELIER_ANNUAL = {
  FY24: { revenue: 3_980_000, gm: 37, ebitda: 540_000, cash: 780_000, receivables: 820_000, payables: 340_000 },
  FY25: { revenue: 4_210_000, gm: 36, ebitda: 510_000, cash: 640_000, receivables: 890_000, payables: 390_000 },
}
const SPLIT = [0.24, 0.25, 0.25, 0.26]

function atelierYear(fy, stockByQ) {
  const a = ATELIER_ANNUAL[fy]
  const revs = SPLIT.map(s => r0(a.revenue * s))
  revs[3] = a.revenue - revs[0] - revs[1] - revs[2]           // force the sum
  const ebs = SPLIT.map(s => r0(a.ebitda * s))
  ebs[3] = a.ebitda - ebs[0] - ebs[1] - ebs[2]
  return revs.map((rev, i) => quarter({
    period: `Q${i + 1} ${fy}`, turnover: rev, gm: a.gm,
    ebitdaMarginPct: (ebs[i] / rev) * 100,
    // Year-end quarter carries the annual balance-sheet values exactly.
    debtors: i === 3 ? a.receivables : r0(a.receivables * (0.86 + i * 0.045)),
    creditors: i === 3 ? a.payables : r0(a.payables * (0.88 + i * 0.04)),
    cash: i === 3 ? a.cash : r0(a.cash * (1.12 - i * 0.035)),
    stock: stockByQ[i],
  }))
}

// Solved so that CCC(Q4 FY25) - CCC(Q4 FY24) rounds to 18 days and CCC rises
// across the last two quarters.
const atelier = [
  ...atelierYear('FY24', [250_000, 262_000, 272_000, 309_000]),
  ...atelierYear('FY25', [352_000, 396_000, 436_000, 474_500]),
]

// ── Verification ────────────────────────────────────────────────────────────
let failures = 0
const check = (label, actual, expected, tol, unit = '') => {
  const ok = Math.abs(actual - expected) <= tol
  if (!ok) failures++
  console.log(`  ${ok ? 'PASS' : 'FAIL'}  ${label.padEnd(56)} ${actual.toFixed(2)}${unit} (claim ${expected}${unit}, tol ${tol})`)
}

console.log('\nHALCYON TEXTILES')
{
  const last = halcyon[7], prev = halcyon[6]
  check('EBITDA margin contracted QoQ', ebitdaMargin(prev) - ebitdaMargin(last), 4.2, 0.001, 'pp')
  const trailing = halcyon.slice(1, 7).map(ebitdaMargin)
  const lo = mean(trailing) - 2 * sd(trailing)
  console.log(`        trailing-6Q mean ${mean(trailing).toFixed(2)}%  2sd band lower bound ${lo.toFixed(2)}%`)
  check('latest below the 2sd band (outside 95%)', lo - ebitdaMargin(last), 4.2, 1.0, 'pp')
  check('receivables up QoQ', ((last.debtors / prev.debtors) - 1) * 100, 14.0, 0.05, '%')
  check('debtor days, prior quarter', dso(prev), 22.8, 0.1, 'd')
  check('debtor days, latest quarter', dso(last), 25.9, 0.1, 'd')
}

console.log('\nSENTINEL SECURITY NW')
{
  const last = sentinel[7]
  const trailing = sentinel.slice(1, 7).map(ebitda)
  const z = (mean(trailing) - ebitda(last)) / sd(trailing)
  console.log(`        trailing-6Q mean EBITDA ${r0(mean(trailing)).toLocaleString()}  sd ${r0(sd(trailing)).toLocaleString()}  latest ${ebitda(last).toLocaleString()}`)
  check('deviation from trailing-6Q mean exceeds 2sd', z, 3.87, 0.6, 'sd')
  if (z <= 2) { console.log('  FAIL  deviation does not exceed 2sd'); failures++ }
}

console.log('\nATELIER SAINT-PIERRE')
{
  const q4fy24 = atelier[3], q4fy25 = atelier[7], q3fy25 = atelier[6], q2fy25 = atelier[5]
  console.log(`        CCC Q4 FY24 ${ccc(q4fy24).toFixed(1)}d -> Q2 ${ccc(q2fy25).toFixed(1)}d -> Q3 ${ccc(q3fy25).toFixed(1)}d -> Q4 FY25 ${ccc(q4fy25).toFixed(1)}d`)
  // The authored text said 18 days. The figure that actually derives from this
  // (internally consistent, annual-tied) dataset is 17. Inventory is a free
  // variable here and could have been tuned upward to make 18 true, but that
  // would be moving the data to fit the sentence — the precise habit this whole
  // exercise exists to remove. The anomaly text is restated to 17 instead.
  check('CCC extended vs the same quarter last year', ccc(q4fy25) - ccc(q4fy24), 17, 0.5, 'd')
  const rising = ccc(q3fy25) > ccc(q2fy25) && ccc(q4fy25) > ccc(q3fy25)
  console.log(`  ${rising ? 'PASS' : 'FAIL'}  working capital tightened two consecutive quarters`)
  if (!rising) failures++
  const stretched = q4fy25.creditors > q4fy24.creditors && dpo(q4fy25) > dpo(q4fy24)
  console.log(`  ${stretched ? 'PASS' : 'FAIL'}  trade creditors stretched (DPO ${dpo(q4fy24).toFixed(1)}d -> ${dpo(q4fy25).toFixed(1)}d)`)
  if (!stretched) failures++

  for (const fy of ['FY24', 'FY25']) {
    const qs = atelier.filter(q => q.period.endsWith(fy))
    const a = ATELIER_ANNUAL[fy]
    check(`${fy} quarterly revenue ties to annual`, qs.reduce((s, q) => s + q.turnover, 0), a.revenue, 0)
    check(`${fy} quarterly EBITDA ties to annual`, qs.reduce((s, q) => s + ebitda(q), 0), a.ebitda, 4)
    const ye = qs[3]
    check(`${fy} year-end receivables tie to annual`, ye.debtors, a.receivables, 0)
    check(`${fy} year-end payables tie to annual`, ye.creditors, a.payables, 0)
    check(`${fy} year-end cash ties to annual`, ye.cash, a.cash, 0)
  }
}

console.log(`\n${failures === 0 ? 'ALL CLAIMS DERIVE' : failures + ' CHECK(S) FAILED — not emitting SQL'}\n`)
if (failures > 0) process.exit(1)
if (process.argv.includes('--check')) process.exit(0)

// ── SQL ─────────────────────────────────────────────────────────────────────
const COLS = ['period','turnover','cos','gross','admin','op','interest','pbt','tax','retained','fixed','stock','debtors','cash','creditors','net_assets','funds','depreciation_amortisation','long_term_liabilities']
const emit = (slug, rows) => {
  const values = rows.map(r => `(${COLS.map(c => typeof r[c] === 'string' ? `'${r[c]}'` : r[c]).join(',')})`).join(',\n  ')
  return `insert into public.quarters (${COLS.join(',')},company_id)
select v.*, c.id from public.companies c
cross join (values
  ${values}
) as v(${COLS.join(',')})
where c.slug = '${slug}'
  and not exists (select 1 from public.quarters q where q.company_id = c.id and q.period = v.period);`
}
console.log(emit('halcyon', halcyon))
console.log()
console.log(emit('sentinel', sentinel))
console.log()
console.log(emit('asp', atelier))
