'use client'
import { useState, useEffect } from 'react'
import { ResponsiveContainer, LineChart, Line, XAxis, YAxis, Tooltip, Legend, CartesianGrid } from 'recharts'
import type { Quarter } from '@/lib/supabase'
import type { Currency } from '@/lib/currency'
import { fmtShort, fmtFull, symbol } from '@/lib/currency'
import { useCountUp } from '@/lib/useCountUp'
import { useLang, loc } from '@/lib/i18n'
import type { Loc } from '@/lib/loc'
import AskPanel from './AskPanel'

// Secondary metrics shown beneath the hero (hero covers turnover/gross/op/pbt).
const COLS: { key: keyof Quarter; tKey: string }[] = [
  { key: 'retained', tKey: 'gp.retained' },
  { key: 'net_assets', tKey: 'gp.netAssets' },
  { key: 'cash', tKey: 'gp.cash' },
  { key: 'debtors', tKey: 'gp.debtors' },
]

// Edit-modal fields; label comes from field.<key> (period is special).
const ALL_FIELDS: { key: keyof Quarter }[] = [
  { key: 'period' }, { key: 'turnover' }, { key: 'cos' }, { key: 'gross' },
  { key: 'admin' }, { key: 'op' }, { key: 'interest' }, { key: 'pbt' },
  { key: 'tax' }, { key: 'retained' }, { key: 'fixed' }, { key: 'stock' },
  { key: 'debtors' }, { key: 'cash' }, { key: 'creditors' }, { key: 'net_assets' },
  { key: 'funds' },
]

interface Signal { company: string; detail: Loc; level: 'red' | 'amber' }
const SIGNALS: Signal[] = [
  { company: 'Halcyon Textiles', detail: { en: 'Lost client >5% · Bank discussions · Miss next target', fr: 'Perte client >5 % · Discussions bancaires · Objectif suivant manqué' }, level: 'red' },
  { company: 'Sentinel Security NW', detail: { en: 'Miss next target', fr: 'Objectif suivant manqué' }, level: 'amber' },
]

interface Anomaly { company: string; title: Loc; detail: Loc; level: 'red' | 'amber'; actions: Loc[] }
const ANOMALIES: Anomaly[] = [
  {
    company: 'HALCYON TEXTILES',
    title: { en: 'EBITDA margin contracted 4.2pp month-over-month', fr: "Marge d'EBITDA en baisse de 4,2 pts sur un mois" },
    detail: { en: 'Outside the 95% confidence band of the trailing 6 months. Bad debt also up 14% on receivables.', fr: "Hors de l'intervalle de confiance à 95 % des 6 derniers mois. Créances douteuses également en hausse de 14 %." },
    level: 'red',
    actions: [
      { en: "Request management's written explanation for the 4.2pp EBITDA margin contraction — isolate cost vs. revenue driver", fr: "Demander à la direction une explication écrite sur la contraction de 4,2 pts de la marge EBITDA — isoler l'origine (coûts vs. CA)" },
      { en: 'Run an EBITDA bridge vs. the prior quarter to identify the specific line items driving the move', fr: 'Établir un pont EBITDA par rapport au trimestre précédent pour identifier les postes en cause' },
      { en: 'Investigate the 14% receivables increase — request a full aged debtors schedule and top-10 debtor breakdown', fr: 'Analyser la hausse de 14 % des créances — demander un échéancier complet des débiteurs et les 10 principaux clients' },
      { en: 'Place Halcyon Textiles on the formal watch-list; schedule a partner call within 10 business days', fr: 'Inscrire Halcyon Textiles sur la liste de surveillance formelle ; planifier un appel associé sous 10 jours ouvrés' },
    ],
  },
  {
    company: 'SENTINEL SECURITY NW',
    title: { en: 'Reported EBITDA inconsistent with prior pattern', fr: 'EBITDA déclaré incohérent avec la tendance passée' },
    detail: { en: 'Variance from 6-month trailing average exceeds 2σ. Flagged for partner review.', fr: "L'écart par rapport à la moyenne mobile sur 6 mois dépasse 2σ. Signalé pour revue des associés." },
    level: 'amber',
    actions: [
      { en: 'Request management accounts for the last 3 months to independently validate the reported EBITDA figure', fr: "Demander les comptes de gestion des 3 derniers mois pour valider indépendamment le chiffre d'EBITDA déclaré" },
      { en: 'Cross-reference with the most recent board pack — check for restatements, reclassifications, or one-off items', fr: 'Croiser avec le dernier board pack — vérifier tout redressement, reclassification ou élément exceptionnel' },
      { en: 'Ask management to confirm the absence of accounting adjustments that may have suppressed the reported number', fr: "Demander à la direction de confirmer l'absence d'ajustements comptables ayant pu minorer le chiffre déclaré" },
      { en: 'Suspend pending drawdown approvals until a satisfactory written explanation is received', fr: "Suspendre les approbations de tirage en attente jusqu'à réception d'une explication écrite satisfaisante" },
    ],
  },
  {
    company: 'HALCYON TEXTILES',
    title: { en: 'Receivables aging — 18% in 30+ day bucket', fr: 'Vieillissement des créances — 18 % à plus de 30 jours' },
    detail: { en: 'Up from 9% three months ago. Trend warrants follow-up with management.', fr: 'Contre 9 % il y a trois mois. La tendance justifie un suivi avec la direction.' },
    level: 'amber',
    actions: [
      { en: "Request a full aged debtors schedule — identify the top-5 overdue accounts by value and days outstanding", fr: "Demander l'échéancier complet des débiteurs — identifier les 5 principaux comptes en retard par montant et ancienneté" },
      { en: 'Assess whether the overdue receivables are concentrated in the recently lost client (>5% of revenue)', fr: 'Évaluer si les créances en retard sont concentrées sur le client récemment perdu (>5 % du CA)' },
      { en: 'Review credit terms and collections procedures with the CFO — set a 30-day remediation target', fr: 'Examiner les conditions de crédit et procédures de recouvrement avec le DG financier — fixer un objectif de remédiation à 30 jours' },
      { en: 'Evaluate whether a specific bad debt provision is required and model the downside P&L impact if the bucket does not normalise', fr: "Évaluer si une provision pour créances douteuses est nécessaire et modéliser l'impact négatif sur le résultat si le solde ne se normalise pas" },
    ],
  },
  {
    company: 'ATELIER SAINT-PIERRE',
    title: { en: 'Working capital tightened for second consecutive quarter', fr: 'Besoin en fonds de roulement en tension pour le deuxième trimestre consécutif' },
    detail: { en: 'Cash conversion cycle extended by 18 days vs. the same period last year. Trade creditors are being stretched to fund operations.', fr: "Le cycle de conversion de trésorerie s'est allongé de 18 jours par rapport à la même période l'année dernière. Les fournisseurs sont sollicités pour financer l'exploitation." },
    level: 'amber',
    actions: [
      { en: 'Review the cash flow statement line by line with the CFO — identify the primary driver of the working capital build', fr: 'Examiner le tableau de flux de trésorerie ligne par ligne avec le DG financier — identifier le principal facteur de tension du BFR' },
      { en: 'Assess current headroom on the revolving credit facility and model cash requirements for the next two quarters', fr: 'Évaluer la disponibilité de la ligne de crédit revolving et modéliser les besoins de trésorerie pour les deux prochains trimestres' },
      { en: 'Request a 13-week cash flow forecast from management to assess near-term liquidity risk', fr: 'Demander à la direction une prévision de trésorerie sur 13 semaines pour évaluer le risque de liquidité à court terme' },
      { en: "Consider whether a short-term shareholder loan is warranted as a bridging measure pending a working capital improvement plan", fr: "Envisager si un prêt d'actionnaire à court terme est justifié comme mesure de transition dans l'attente d'un plan d'amélioration du BFR" },
    ],
  },
]

type Props = {
  quarters: Quarter[]
  onDelete: (id: number) => Promise<void>
  onUpdate: (id: number, q: Omit<Quarter, 'id' | 'created_at'>) => Promise<boolean>
  currency: Currency
  mobileSection?: 'overview' | 'data' | 'ask'
}

export default function GPView({ quarters, onDelete, onUpdate, currency, mobileSection }: Props) {
  const { t, lang } = useLang()
  const [editingId, setEditingId] = useState<number | null>(null)
  const [editValues, setEditValues] = useState<Partial<Quarter>>({})
  const [confirmDeleteId, setConfirmDeleteId] = useState<number | null>(null)
  const [investigateAnomaly, setInvestigateAnomaly] = useState<typeof ANOMALIES[0] | null>(null)
  const [hoveredPoint, setHoveredPoint] = useState<Record<string, unknown> | null>(null)

  useEffect(() => {
    const handler = (e: Event) => {
      const { section, highlight } = (e as CustomEvent).detail as { section?: string; highlight?: string }
      if (section) {
        setTimeout(() => {
          const el = document.getElementById(section)
          if (el) el.scrollIntoView({ behavior: 'smooth', block: 'center' })
          const target = highlight ? document.getElementById(highlight) : null
          if (target) {
            setTimeout(() => {
              target.classList.remove('clavio-highlight')
              void target.offsetWidth // force reflow to restart animation
              target.classList.add('clavio-highlight')
              setTimeout(() => target.classList.remove('clavio-highlight'), 2200)
            }, 400)
          }
        }, 120)
      }
    }
    window.addEventListener('clavio:gp-navigate', handler)
    return () => window.removeEventListener('clavio:gp-navigate', handler)
  }, [])

  const latest = quarters[quarters.length - 1]
  const prev = quarters[quarters.length - 2]
  const turnoverCount = useCountUp(latest?.turnover ?? 0)

  if (!latest) {
    return <div style={{ padding: 40, textAlign: 'center', color: 'var(--text-muted)' }}>No data yet.</div>
  }

  const delta = (key: keyof Quarter) => {
    if (!prev || typeof latest[key] !== 'number' || typeof prev[key] !== 'number') return null
    return (((latest[key] as number) - (prev[key] as number)) / Math.abs(prev[key] as number)) * 100
  }

  const chartData = quarters.map(q => ({
    period: q.period,
    Turnover: q.turnover,
    'Gross Profit': q.gross,
    'Op. Profit': q.op,
    PBT: q.pbt,
  }))

  const startEdit = (q: Quarter) => {
    setEditingId(q.id!)
    setEditValues({ ...q })
  }

  const saveEdit = async () => {
    if (!editingId) return
    const { id, created_at, ...rest } = editValues as Quarter
    await onUpdate(editingId, rest)
    setEditingId(null)
  }

  const exportPDF = async (qs: Quarter[], cur: typeof currency) => {
    const { default: jsPDF } = await import('jspdf')
    const { default: autoTable } = await import('jspdf-autotable')
    const latest = qs[qs.length - 1]
    const today = new Date().toLocaleDateString('en-GB', { day: 'numeric', month: 'long', year: 'numeric' })
    const doc = new jsPDF({ orientation: 'landscape', unit: 'mm', format: 'a4' })
    doc.setFillColor(10, 14, 26)
    doc.rect(0, 0, 297, 30, 'F')
    doc.setTextColor(255, 255, 255)
    doc.setFontSize(16); doc.setFont('helvetica', 'bold')
    doc.text('Partner Dashboard — Quarterly Data', 14, 14)
    doc.setFontSize(9); doc.setFont('helvetica', 'normal'); doc.setTextColor(180, 195, 220)
    doc.text(`${qs.length} quarters · Latest: ${latest?.period} · ${today} · ${cur}`, 14, 23)
    const rows = [...qs].reverse().map(q => [
      q.period,
      fmtFull(q.turnover, cur), fmtFull(q.gross, cur),
      `${q.turnover > 0 ? ((q.gross / q.turnover) * 100).toFixed(1) : 0}%`,
      fmtFull(q.op, cur), fmtFull(q.pbt, cur),
      fmtFull(q.retained, cur), fmtFull(q.net_assets, cur), fmtFull(q.cash, cur),
    ])
    autoTable(doc, {
      startY: 36,
      head: [['Period', 'Turnover', 'Gross Profit', 'Gross Margin', 'Op. Profit', 'PBT', 'Retained', 'Net Assets', 'Cash']],
      body: rows,
      headStyles: { fillColor: [10, 14, 26], textColor: 255, fontSize: 8, fontStyle: 'bold' },
      bodyStyles: { fontSize: 8, textColor: [30, 30, 40] },
      alternateRowStyles: { fillColor: [249, 250, 251] },
      margin: { left: 14, right: 14 },
    })
    const pageCount = (doc as unknown as { internal: { getNumberOfPages: () => number } }).internal.getNumberOfPages()
    for (let i = 1; i <= pageCount; i++) {
      doc.setPage(i); doc.setFontSize(7); doc.setTextColor(150)
      doc.text(`Clavio · Partner Dashboard · ${today} · Page ${i} of ${pageCount}`, 14, 205)
    }
    doc.save(`clavio-partner-dashboard.pdf`)
  }

  const exportExcel = async () => {
    const { utils, writeFile } = await import('xlsx')
    const rows = quarters.map(q => ({
      Period: q.period,
      Turnover: q.turnover,
      'Cost of Sales': q.cos,
      'Gross Profit': q.gross,
      'Admin Expenses': q.admin,
      'Operating Profit': q.op,
      'Interest Received': q.interest,
      'Profit Before Tax': q.pbt,
      Tax: q.tax,
      'Retained Profit': q.retained,
      'Fixed Assets': q.fixed,
      'Stock & WIP': q.stock,
      Debtors: q.debtors,
      'Cash at Bank': q.cash,
      'Creditors Due Within 1 Year': q.creditors,
      'Net Assets': q.net_assets,
      "Shareholders' Funds": q.funds,
    }))
    const ws = utils.json_to_sheet(rows)
    const wb = utils.book_new()
    utils.book_append_sheet(wb, ws, 'Quarterly Data')
    writeFile(wb, 'clavio-quarterly-data.xlsx')
  }

  const sym = symbol(currency)

  const showOverview = !mobileSection || mobileSection === 'overview'
  const showData = !mobileSection || mobileSection === 'data'
  const showAsk = !mobileSection || mobileSection === 'ask'

  const heroSubs: { key: keyof Quarter; label: string }[] = [
    { key: 'gross', label: t('gp.grossProfit') },
    { key: 'op', label: t('gp.opProfit') },
    { key: 'pbt', label: t('gp.pbt') },
  ]
  const turnoverDelta = delta('turnover')

  // Compact dataset the AI assistant reasons over (all quarters, GBP).
  const askContext = {
    entity: 'Portfolio company (standardised quarterly accounts)',
    currency: 'GBP',
    quarters: quarters.map(q => ({
      period: q.period, turnover: q.turnover, costOfSales: q.cos, grossProfit: q.gross,
      adminExpenses: q.admin, operatingProfit: q.op, profitBeforeTax: q.pbt, tax: q.tax,
      retainedProfit: q.retained, fixedAssets: q.fixed, stock: q.stock, debtors: q.debtors,
      cash: q.cash, creditors: q.creditors, netAssets: q.net_assets, shareholdersFunds: q.funds,
    })),
  }

  return (
    <div>
      {showOverview && (
        <>
      <div style={{ display: 'flex', alignItems: 'baseline', justifyContent: 'space-between', flexWrap: 'wrap', gap: 10, marginBottom: 6 }}>
        <div style={{ display: 'flex', alignItems: 'baseline', gap: 10 }}>
          <h1 style={{ fontSize: 22, fontWeight: 700 }}>{t('gp.dashboard')}</h1>
          <span style={{ fontSize: 13, color: 'var(--text-muted)' }}>{t('gp.latest', { period: latest.period })}</span>
        </div>
        {!mobileSection && (
          <div style={{ display: 'flex', gap: 8 }}>
            <button onClick={exportExcel} style={styles.exportBtn}>↓ Excel</button>
            <button onClick={() => exportPDF(quarters, currency)} style={styles.exportBtn}>↓ PDF</button>
          </div>
        )}
      </div>
      <p style={{ color: 'var(--text-muted)', marginBottom: 16, fontSize: 14 }}>
        {t(quarters.length === 1 ? 'gp.onRecord1' : 'gp.onRecord', { n: quarters.length, currency })}
      </p>

      {/* Gradient hero — headline result with count-up */}
      <div style={{
        borderRadius: 14, marginBottom: 16, padding: '22px 24px',
        background: 'linear-gradient(135deg, #0A0E1A 0%, #16233E 55%, #1E3A5F 100%)',
        color: 'white', position: 'relative', overflow: 'hidden',
        boxShadow: '0 14px 34px -16px rgba(10,14,26,0.6)',
      }}>
        <div style={{ position: 'absolute', top: -40, right: -30, width: 180, height: 180, borderRadius: '50%', background: 'radial-gradient(circle, rgba(91,130,189,0.35), transparent 70%)' }} />
        <div style={{ fontSize: 11, fontWeight: 600, color: 'rgba(255,255,255,0.55)', letterSpacing: '0.08em', textTransform: 'uppercase', marginBottom: 4 }}>{t('gp.turnover')} · {latest.period}</div>
        <div style={{ display: 'flex', alignItems: 'baseline', gap: 10, marginBottom: 18, position: 'relative' }}>
          <div style={{ fontSize: 38, fontWeight: 800, letterSpacing: '-0.5px' }}>{fmtShort(turnoverCount, currency)}</div>
          {turnoverDelta !== null && (
            <div style={{ fontSize: 13, color: turnoverDelta >= 0 ? '#7FE6B0' : '#FCA5A5', fontWeight: 600 }}>
              {turnoverDelta >= 0 ? '▲' : '▼'} {Math.abs(turnoverDelta).toFixed(1)}% {t('gp.vsPrev')}
            </div>
          )}
        </div>
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: 0, position: 'relative' }}>
          {heroSubs.map((s, i) => {
            const d = delta(s.key)
            return (
              <div key={s.key} style={{
                paddingRight: i < 2 ? 16 : 0,
                borderRight: i < 2 ? '1px solid rgba(255,255,255,0.12)' : 'none',
                paddingLeft: i > 0 ? 16 : 0,
              }}>
                <div style={{ fontSize: 10, fontWeight: 600, color: 'rgba(255,255,255,0.5)', letterSpacing: '0.06em', textTransform: 'uppercase', marginBottom: 5 }}>{s.label}</div>
                <div style={{ fontSize: 19, fontWeight: 700 }}>{fmtShort(latest[s.key] as number, currency)}</div>
                {d !== null && (
                  <div style={{ fontSize: 11, marginTop: 2, color: d >= 0 ? '#7FE6B0' : '#FCA5A5', fontWeight: 500 }}>
                    {d >= 0 ? '▲' : '▼'} {Math.abs(d).toFixed(1)}%
                  </div>
                )}
              </div>
            )
          })}
        </div>
      </div>

      {/* KPI strip — balance-sheet metrics */}
      <div style={styles.kpiGrid}>
        {COLS.map(c => {
          const d = delta(c.key)
          return (
            <div key={c.key} style={styles.kpiCard}>
              <div style={styles.kpiLabel}>{t(c.tKey)}</div>
              <div style={styles.kpiValue}>{fmtShort(latest[c.key] as number, currency)}</div>
              {d !== null && (
                <div style={{ fontSize: 12, marginTop: 4, color: d >= 0 ? 'var(--green)' : 'var(--red)', fontWeight: 500 }}>
                  {d >= 0 ? '▲' : '▼'} {Math.abs(d).toFixed(1)}% {t('gp.vsPrev')}
                </div>
              )}
            </div>
          )
        })}
      </div>

      {/* Signals + Trend row */}
      <div className="gp-trend-grid">
        <div style={styles.card}>
          <div style={{ display: 'flex', alignItems: 'baseline', justifyContent: 'space-between', marginBottom: 10 }}>
            <h3 style={styles.sectionTitle}>{t('gp.perfTrend')}</h3>
            {hoveredPoint && (
              <span style={{ fontSize: 12, fontWeight: 600, color: 'var(--text-muted)' }}>{String(hoveredPoint.period)}</span>
            )}
          </div>
          {hoveredPoint && (
            <div style={{ display: 'flex', gap: 16, flexWrap: 'wrap', marginBottom: 10, padding: '8px 10px', background: '#F8FAFF', borderRadius: 8 }}>
              {[
                { label: 'Turnover', color: '#1652A0', key: 'Turnover' },
                { label: 'Gross Profit', color: '#10B981', key: 'Gross Profit' },
                { label: 'Op. Profit', color: '#F59E0B', key: 'Op. Profit' },
                { label: 'PBT', color: '#8B5CF6', key: 'PBT' },
              ].map(({ label, color, key }) => (
                <div key={key} style={{ display: 'flex', flexDirection: 'column', gap: 1 }}>
                  <span style={{ fontSize: 10, color, fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.4px' }}>{label}</span>
                  <span style={{ fontSize: 13, fontWeight: 700, color: 'var(--text)' }}>{fmtFull(Number(hoveredPoint[key]), currency)}</span>
                </div>
              ))}
            </div>
          )}
        <div style={{ height: 240 }}>
          <ResponsiveContainer width="100%" height="100%">
            <LineChart data={chartData} margin={{ top: 4, right: 16, left: 0, bottom: 0 }}
              onMouseMove={(state) => { if (state.activePayload) setHoveredPoint(state.activePayload[0]?.payload ?? null) }}
              onMouseLeave={() => setHoveredPoint(null)}
            >
              <CartesianGrid strokeDasharray="3 3" stroke="#F0F0F0" />
              <XAxis dataKey="period" tick={{ fontSize: 11, fill: '#6B7280' }} />
              <YAxis tickFormatter={v => `${sym}${(v / 1000).toFixed(0)}k`} tick={{ fontSize: 11, fill: '#6B7280' }} width={64} />
              <Tooltip content={() => null} />
              <Legend wrapperStyle={{ fontSize: 12 }} />
              <Line type="monotone" dataKey="Turnover" stroke="#1652A0" strokeWidth={2} dot={false} />
              <Line type="monotone" dataKey="Gross Profit" stroke="#10B981" strokeWidth={2} dot={false} />
              <Line type="monotone" dataKey="Op. Profit" stroke="#F59E0B" strokeWidth={2} dot={false} />
              <Line type="monotone" dataKey="PBT" stroke="#8B5CF6" strokeWidth={2} dot={false} />
            </LineChart>
          </ResponsiveContainer>
        </div>
        </div>

        {/* Objective Signals */}
        <div style={styles.card}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'baseline', marginBottom: 14 }}>
            <h3 style={styles.sectionTitle}>{t('gp.signals')}</h3>
            <span style={{ fontSize: 11, color: 'var(--text-muted)' }}>{t('gp.flaggedMonth')}</span>
          </div>
          {SIGNALS.map((s, i) => (
            <div key={i} style={{ display: 'flex', gap: 10, marginBottom: i < SIGNALS.length - 1 ? 14 : 0, alignItems: 'flex-start' }}>
              <div style={{
                width: 28, height: 28, borderRadius: 8, flexShrink: 0,
                background: s.level === 'red' ? '#FEF2F2' : '#FEF3C7',
                display: 'flex', alignItems: 'center', justifyContent: 'center',
                fontSize: 13, color: s.level === 'red' ? '#EF4444' : '#D97706',
              }}>!</div>
              <div>
                <div style={{ fontSize: 13, fontWeight: 600, marginBottom: 2 }}>{s.company}</div>
                <div style={{ fontSize: 12, color: 'var(--text-muted)', lineHeight: 1.4 }}>{loc(s.detail, lang)}</div>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Anomaly Detection */}
      <div id="gp-anomalies" style={{ ...styles.card, marginBottom: 16, overflow: 'hidden' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'baseline', marginBottom: 16 }}>
          <h3 style={styles.sectionTitle}>{t('gp.anomalies')}</h3>
          <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
            <span style={{ fontSize: 11, color: 'var(--text-muted)' }}>{t('gp.anomaliesSub')}</span>
          </div>
        </div>
        {ANOMALIES.map((a, i) => (
          <div key={i} id={`gp-anomaly-${a.company.toLowerCase().replace(/\s+/g, '-')}`} style={{ display: 'flex', gap: 12, alignItems: 'flex-start', padding: '14px 0', borderTop: i === 0 ? '1px solid var(--border)' : '1px solid var(--border)' }}>
            <div style={{
              width: 28, height: 28, borderRadius: 8, flexShrink: 0,
              background: a.level === 'red' ? '#FEF2F2' : '#FEF3C7',
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              fontSize: 13, color: a.level === 'red' ? '#EF4444' : '#D97706', marginTop: 2,
            }}>!</div>
            <div style={{ flex: 1 }}>
              <div style={{ fontSize: 12, fontWeight: 700, color: 'var(--accent)', letterSpacing: '0.04em', marginBottom: 3 }}>{a.company}</div>
              <div style={{ fontSize: 13, fontWeight: 500, marginBottom: 3 }}>{loc(a.title, lang)}</div>
              <div style={{ fontSize: 12, color: 'var(--text-muted)', lineHeight: 1.5 }}>{loc(a.detail, lang)}</div>
            </div>
            <button
              onClick={() => setInvestigateAnomaly(a)}
              style={{ fontSize: 12, padding: '5px 12px', borderRadius: 7, border: '1px solid var(--border)', background: 'white', color: 'var(--accent)', cursor: 'pointer', flexShrink: 0, fontWeight: 500 }}
            >
              {t('gp.investigate')}
            </button>
          </div>
        ))}
      </div>
        </>
      )}

      {showAsk && (
        <div style={{ marginBottom: mobileSection ? 0 : 8 }}>
          {!mobileSection && <h3 style={styles.sectionTitle}>{t('gp.askSection')}</h3>}
          <AskPanel
            isMobile={mobileSection === 'ask'}
            context={askContext}
            connectedLabel={t('ask.connected')}
            connectedSub={t('ask.gp.sub', { n: quarters.length, period: latest.period })}
            introTitle={t('ask.gp.introTitle')}
            introBody={t('ask.gp.introBody')}
            placeholder={t('ask.gp.placeholder')}
            suggestions={[
              t('ask.gp.q1', { n: Math.min(quarters.length, 4) }),
              t('ask.gp.q2'),
              t('ask.gp.q3'),
              t('ask.gp.q4'),
            ]}
          />
        </div>
      )}

      {showData && (
        <>
          {mobileSection === 'data' && (
            <div style={{ display: 'flex', gap: 8, marginBottom: 16 }}>
              <button onClick={exportExcel} style={styles.exportBtn}>↓ Excel</button>
              <button onClick={() => exportPDF(quarters, currency)} style={styles.exportBtn}>↓ PDF</button>
            </div>
          )}
      {/* Data table */}
      <div style={styles.card}>
        <h3 style={styles.sectionTitle}>{t('gp.allQuarters')}</h3>
        <div style={{ overflowX: 'auto' }}>
          <table style={styles.table}>
            <thead>
              <tr>
                <th style={styles.th}>{t('gp.col.period')}</th>
                <th style={styles.th}>{t('gp.turnover')}</th>
                <th style={styles.th}>{t('gp.col.gross')}</th>
                <th style={styles.th}>{t('gp.opProfit')}</th>
                <th style={styles.th}>{t('gp.pbt')}</th>
                <th style={styles.th}>{t('gp.retained')}</th>
                <th style={styles.th}>{t('gp.netAssets')}</th>
                <th style={styles.th}>{t('gp.cash')}</th>
                <th style={styles.th}></th>
              </tr>
            </thead>
            <tbody>
              {[...quarters].reverse().map((q, i) => (
                <tr key={q.id ?? i} style={{ background: i % 2 === 0 ? 'transparent' : '#FAFAFA' }}>
                  <td style={{ ...styles.td, fontWeight: 600 }}>{q.period}</td>
                  <td style={styles.td}>{fmtFull(q.turnover, currency)}</td>
                  <td style={styles.td}>{fmtFull(q.gross, currency)}</td>
                  <td style={styles.td}>{fmtFull(q.op, currency)}</td>
                  <td style={styles.td}>{fmtFull(q.pbt, currency)}</td>
                  <td style={styles.td}>{fmtFull(q.retained, currency)}</td>
                  <td style={styles.td}>{fmtFull(q.net_assets, currency)}</td>
                  <td style={styles.td}>{fmtFull(q.cash, currency)}</td>
                  <td style={{ ...styles.td, whiteSpace: 'nowrap' }}>
                    <button onClick={() => startEdit(q)} style={styles.editBtn}>{t('gp.edit')}</button>
                    <button onClick={() => setConfirmDeleteId(q.id!)} style={styles.deleteBtn}>{t('gp.delete')}</button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

        </>
      )}

      {/* Edit modal */}
      {editingId !== null && (
        <Modal title={t('gp.editQuarter')} onClose={() => setEditingId(null)}>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px 20px', marginBottom: 20 }}>
            {ALL_FIELDS.map(f => (
              <div key={f.key}>
                <label style={styles.label}>{f.key === 'period' ? t('gp.col.period') : t(`field.${f.key}`)}</label>
                <input
                  style={styles.input}
                  value={String(editValues[f.key] ?? '')}
                  onChange={e => setEditValues(v => ({ ...v, [f.key]: f.key === 'period' ? e.target.value : parseFloat(e.target.value) || 0 }))}
                />
              </div>
            ))}
          </div>
          <div style={{ display: 'flex', gap: 10 }}>
            <button onClick={saveEdit} style={styles.submitBtn}>{t('gp.saveChanges')}</button>
            <button onClick={() => setEditingId(null)} style={styles.cancelBtn}>{t('gp.cancel')}</button>
          </div>
        </Modal>
      )}

      {/* Investigate modal */}
      {investigateAnomaly && (
        <Modal title={t('gp.anomalyInvestigation')} onClose={() => setInvestigateAnomaly(null)}>
          <div style={{ display: 'flex', gap: 10, alignItems: 'flex-start', marginBottom: 16 }}>
            <div style={{
              width: 32, height: 32, borderRadius: 8, flexShrink: 0,
              background: investigateAnomaly.level === 'red' ? '#FEF2F2' : '#FEF3C7',
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              fontSize: 15, color: investigateAnomaly.level === 'red' ? '#EF4444' : '#D97706',
            }}>!</div>
            <div>
              <div style={{ fontSize: 12, fontWeight: 700, color: 'var(--accent)', letterSpacing: '0.04em', marginBottom: 4 }}>{investigateAnomaly.company}</div>
              <div style={{ fontSize: 15, fontWeight: 600, marginBottom: 6 }}>{loc(investigateAnomaly.title, lang)}</div>
              <div style={{ fontSize: 13, color: 'var(--text-muted)', lineHeight: 1.6 }}>{loc(investigateAnomaly.detail, lang)}</div>
            </div>
          </div>
          <div style={{ background: '#F9FAFB', borderRadius: 10, padding: '14px 16px', marginBottom: 20 }}>
            <div style={{ fontSize: 12, fontWeight: 600, color: 'var(--accent)', marginBottom: 8, textTransform: 'uppercase', letterSpacing: '0.05em' }}>{t('gp.recommendedActions')}</div>
            <ul style={{ fontSize: 13, color: 'var(--text-muted)', lineHeight: 1.8, paddingLeft: 18 }}>
              {investigateAnomaly.actions.map((action, i) => (
                <li key={i}>{loc(action, lang)}</li>
              ))}
            </ul>
          </div>
          <button onClick={() => setInvestigateAnomaly(null)} style={styles.submitBtn}>{t('gp.close')}</button>
        </Modal>
      )}

      {/* Delete confirmation */}
      {confirmDeleteId !== null && (
        <Modal title={t('gp.deleteQuarter')} onClose={() => setConfirmDeleteId(null)}>
          <p style={{ marginBottom: 20, color: 'var(--text-muted)' }}>
            {t('gp.deleteConfirm')}
          </p>
          <div style={{ display: 'flex', gap: 10 }}>
            <button
              onClick={async () => { await onDelete(confirmDeleteId); setConfirmDeleteId(null) }}
              style={{ ...styles.submitBtn, background: 'var(--red)' }}
            >
              {t('gp.yesDelete')}
            </button>
            <button onClick={() => setConfirmDeleteId(null)} style={styles.cancelBtn}>{t('gp.cancel')}</button>
          </div>
        </Modal>
      )}
    </div>
  )
}

function Modal({ title, children, onClose }: { title: string; children: React.ReactNode; onClose: () => void }) {
  return (
    <div style={{
      position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.4)',
      display: 'flex', alignItems: 'center', justifyContent: 'center',
      zIndex: 1000, padding: 20,
    }} onClick={onClose}>
      <div style={{
        background: 'white', borderRadius: 14, padding: 28,
        maxWidth: 600, width: '100%', maxHeight: '85vh', overflowY: 'auto',
      }} onClick={e => e.stopPropagation()}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 20 }}>
          <h2 style={{ fontSize: 18, fontWeight: 700 }}>{title}</h2>
          <button onClick={onClose} style={{ background: 'none', border: 'none', fontSize: 20, color: 'var(--text-muted)', cursor: 'pointer' }}>✕</button>
        </div>
        {children}
      </div>
    </div>
  )
}

const styles: Record<string, React.CSSProperties> = {
  kpiGrid: { display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(140px, 1fr))', gap: 12, marginBottom: 20 },
  kpiCard: { background: 'var(--white)', border: '1px solid var(--border)', borderRadius: 12, padding: '16px 18px', boxShadow: '0 1px 2px rgba(16,24,40,0.04), 0 1px 3px rgba(16,24,40,0.04)' },
  kpiLabel: { fontSize: 11, fontWeight: 600, color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.05em', marginBottom: 6 },
  kpiValue: { fontSize: 20, fontWeight: 700, color: 'var(--text)' },
  card: { background: 'var(--white)', borderRadius: 12, padding: '20px', marginBottom: 16, border: '1px solid var(--border)', boxShadow: '0 1px 2px rgba(16,24,40,0.04), 0 1px 3px rgba(16,24,40,0.04)' },
  sectionTitle: { fontSize: 13, fontWeight: 600, color: 'var(--accent)', textTransform: 'uppercase', letterSpacing: '0.05em', marginBottom: 16 },
  table: { width: '100%', borderCollapse: 'collapse', fontSize: 13, minWidth: 700 },
  th: { textAlign: 'left', padding: '8px 12px', fontSize: 11, fontWeight: 600, color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.04em', borderBottom: '2px solid var(--border)' },
  td: { padding: '9px 12px', borderBottom: '1px solid #F3F4F6', color: 'var(--text)' },
  editBtn: { fontSize: 12, padding: '4px 10px', borderRadius: 6, border: '1px solid var(--accent)', color: 'var(--accent)', background: 'transparent', marginRight: 6, cursor: 'pointer' },
  deleteBtn: { fontSize: 12, padding: '4px 10px', borderRadius: 6, border: '1px solid var(--red)', color: 'var(--red)', background: 'transparent', cursor: 'pointer' },
  exportBtn: { fontSize: 13, padding: '8px 16px', borderRadius: 8, border: '1px solid var(--accent)', color: 'var(--accent)', background: 'transparent', fontWeight: 500, cursor: 'pointer' },
  label: { display: 'block', fontSize: 12, fontWeight: 500, color: 'var(--text-muted)', marginBottom: 5 },
  input: { width: '100%', padding: '8px 12px', border: '1px solid var(--border)', borderRadius: 8, fontSize: 14, outline: 'none', background: 'var(--bg)' },
  submitBtn: { background: 'var(--accent)', color: 'white', border: 'none', borderRadius: 8, padding: '10px 24px', fontSize: 14, fontWeight: 600, cursor: 'pointer' },
  cancelBtn: { background: 'transparent', color: 'var(--text-muted)', border: '1px solid var(--border)', borderRadius: 8, padding: '10px 24px', fontSize: 14, cursor: 'pointer' },
}
