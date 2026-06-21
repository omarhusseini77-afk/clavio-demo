'use client'
import { useState } from 'react'
import type { Quarter } from '@/lib/supabase'
import type { Currency } from '@/lib/currency'
import { fmtM, fmtFull } from '@/lib/currency'

// ── Synthetic fund data ──────────────────────────────────────────────────────

const FUND = {
  name: 'Fund II', period: 'Q1 2026', date: '31 March 2026',
  nav: 5220000, tvpi: 1.68, dpi: 0.32,
  commitment: 5000000, called: 3850000, unfunded: 1150000,
  distributed: 1240000, shareOfFund: 14.8,
}

const COMPANIES = [
  {
    id: 'mrj', name: 'Marlow & Reed Joinery', sector: 'Manufacturing', country: 'UK',
    moic: 1.69, revenue: 3980000, sym: '£', status: 'green',
    trend: [3280000, 3450000, 3610000, 3780000, 3980000],
    data: [
      { fy: 'FY23', revenue: 3280000, grossMargin: 41, ebitda: 749000, netProfit: 562000, cash: 1270000, receivables: 572000, payables: 163000 },
      { fy: 'FY24', revenue: 3610000, grossMargin: 42, ebitda: 889000, netProfit: 702000, cash: 2490000, receivables: 639000, payables: 337000 },
      { fy: 'FY25', revenue: 3980000, grossMargin: 43, ebitda: 1040000, netProfit: 824000, cash: 2980000, receivables: 692000, payables: 412000 },
    ],
    commentary: 'Revenue grew 21.3% over three years with gross margin expanding from 41% to 43%, a structural gain rather than a one-off. EBITDA rose from £749k to £1.04M and cash more than doubled, with no debt drawn. The balance sheet now supports an add-on.',
  },
  {
    id: 'df', name: 'Delacourt Frères', sector: 'F&B Distribution', country: 'France',
    moic: 1.35, revenue: 13680000, sym: '€', status: 'amber',
    trend: [11200000, 11800000, 12400000, 13000000, 13680000],
    data: [
      { fy: 'FY23', revenue: 11200000, grossMargin: 28, ebitda: 980000, netProfit: 620000, cash: 1840000, receivables: 2100000, payables: 890000 },
      { fy: 'FY24', revenue: 12400000, grossMargin: 27, ebitda: 1050000, netProfit: 680000, cash: 1650000, receivables: 2380000, payables: 1020000 },
      { fy: 'FY25', revenue: 13680000, grossMargin: 26, ebitda: 1120000, netProfit: 710000, cash: 1420000, receivables: 2640000, payables: 1180000 },
    ],
    commentary: 'Revenue is growing but gross margin has compressed from 28% to 26% as input costs remain elevated. Working capital has tightened — receivables up 26% while cash declined. Management is executing a price-led recovery for H2.',
  },
  {
    id: 'ats', name: 'Abington Technical Services', sector: 'B2B Services', country: 'UK',
    moic: 1.34, revenue: 8240000, sym: '£', status: 'green',
    trend: [5980000, 6400000, 7100000, 7600000, 8240000],
    data: [
      { fy: 'FY23', revenue: 5980000, grossMargin: 52, ebitda: 1240000, netProfit: 890000, cash: 2100000, receivables: 980000, payables: 310000 },
      { fy: 'FY24', revenue: 7100000, grossMargin: 53, ebitda: 1580000, netProfit: 1120000, cash: 2840000, receivables: 1240000, payables: 380000 },
      { fy: 'FY25', revenue: 8240000, grossMargin: 54, ebitda: 1920000, netProfit: 1380000, cash: 3620000, receivables: 1490000, payables: 440000 },
    ],
    commentary: 'Strong performance across all metrics. Revenue up 37.8% over three years with consistent margin expansion. The B2B services model generates high cash conversion — cash has grown to £3.6M. Pipeline supports continued growth into FY26.',
  },
  {
    id: 'asp', name: 'Atelier Saint-Pierre', sector: 'Specialty Mfg', country: 'France',
    moic: 1.09, revenue: 4210000, sym: '€', status: 'amber',
    trend: [3840000, 3900000, 3980000, 4100000, 4210000],
    data: [
      { fy: 'FY23', revenue: 3840000, grossMargin: 38, ebitda: 580000, netProfit: 320000, cash: 920000, receivables: 710000, payables: 290000 },
      { fy: 'FY24', revenue: 3980000, grossMargin: 37, ebitda: 540000, netProfit: 290000, cash: 780000, receivables: 820000, payables: 340000 },
      { fy: 'FY25', revenue: 4210000, grossMargin: 36, ebitda: 510000, netProfit: 270000, cash: 640000, receivables: 890000, payables: 390000 },
    ],
    commentary: 'Revenue is growing modestly but profitability is declining as gross margins compress. Cash has fallen from €920k to €640k while receivables have grown. Working capital management is a priority and the team is reviewing pricing and operational costs.',
  },
]

const DOCUMENTS = [
  { title: 'Q1 2026 Quarterly Report', type: 'Report', date: '16 Apr 2026', isNew: true },
  { title: 'Capital Call Notice · Call 7', type: 'Notice', date: '02 Apr 2026', isNew: true },
  { title: 'Q4 2025 Quarterly Report', type: 'Report', date: '18 Jan 2026', isNew: false },
  { title: '2025 Annual Report & Audited Accounts', type: 'Report', date: '12 Jan 2026', isNew: false },
  { title: 'Distribution Notice · Dist 3', type: 'Notice', date: '20 Nov 2025', isNew: false },
  { title: 'Q3 2025 Quarterly Report', type: 'Report', date: '15 Oct 2025', isNew: false },
  { title: '2024 Tax Statement', type: 'Tax', date: '30 Mar 2025', isNew: false },
]

// ── Main component ───────────────────────────────────────────────────────────

type Tab = 'account' | 'performance' | 'portfolio' | 'documents'

export default function LPView({ quarters, currency }: { quarters: Quarter[]; currency: Currency }) {
  const [tab, setTab] = useState<Tab>('account')
  const [selectedCompany, setSelectedCompany] = useState(COMPANIES[0].id)
  void quarters // kept for future real-data integration

  return (
    <div style={{ maxWidth: 900, margin: '0 auto' }}>
      {/* Page header */}
      <div style={{ marginBottom: 24 }}>
        <h1 style={{ fontSize: 22, fontWeight: 700, letterSpacing: '-0.3px' }}>My Account</h1>
        <p style={{ fontSize: 13, color: 'var(--text-muted)', marginTop: 3 }}>{FUND.name} · as at {FUND.date}</p>
      </div>

      {/* Tabs */}
      <div style={{ display: 'flex', gap: 6, marginBottom: 24, borderBottom: '1px solid var(--border)', paddingBottom: 0 }}>
        {([
          { id: 'account', label: 'My account' },
          { id: 'performance', label: 'Fund performance' },
          { id: 'portfolio', label: 'Portfolio' },
          { id: 'documents', label: 'Documents' },
        ] as { id: Tab; label: string }[]).map(t => (
          <button
            key={t.id}
            onClick={() => setTab(t.id)}
            style={{
              padding: '8px 16px', fontSize: 13, fontWeight: tab === t.id ? 600 : 400,
              border: 'none', cursor: 'pointer', borderRadius: '8px 8px 0 0',
              background: tab === t.id ? 'var(--navy)' : 'transparent',
              color: tab === t.id ? 'white' : 'var(--text-muted)',
              borderBottom: tab === t.id ? '2px solid var(--navy)' : '2px solid transparent',
              marginBottom: -1,
            }}
          >
            {t.label}
          </button>
        ))}
      </div>

      {tab === 'account' && <AccountTab currency={currency} goToPerformance={() => setTab('performance')} />}
      {tab === 'performance' && <PerformanceTab />}
      {tab === 'portfolio' && <PortfolioTab selectedCompany={selectedCompany} setSelectedCompany={setSelectedCompany} />}
      {tab === 'documents' && <DocumentsTab />}
    </div>
  )
}

// ── My Account tab ───────────────────────────────────────────────────────────

function AccountTab({ currency, goToPerformance }: { currency: Currency; goToPerformance: () => void }) {
  const calledPct = (FUND.called / FUND.commitment) * 100

  return (
    <div>
      {/* Position header */}
      <div style={{ ...styles.card, marginBottom: 16 }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', flexWrap: 'wrap', gap: 16 }}>
          <div>
            <div style={{ fontSize: 13, fontWeight: 600, color: 'var(--text-muted)', marginBottom: 4 }}>Your position</div>
            <div style={{ fontSize: 13, color: 'var(--text-muted)' }}>{FUND.name} · as at {FUND.date}</div>
          </div>
          <div style={{ display: 'flex', gap: 32, alignItems: 'flex-start' }}>
            <div style={{ textAlign: 'right' }}>
              <div style={{ fontSize: 11, fontWeight: 600, color: 'var(--text-muted)', letterSpacing: '0.05em', textTransform: 'uppercase', marginBottom: 4 }}>NAV</div>
              <div style={{ fontSize: 22, fontWeight: 700, color: 'var(--accent)' }}>{fmtM(FUND.nav, currency)}</div>
            </div>
            <div style={{ textAlign: 'right' }}>
              <div style={{ fontSize: 11, fontWeight: 600, color: 'var(--text-muted)', letterSpacing: '0.05em', textTransform: 'uppercase', marginBottom: 4 }}>TVPI</div>
              <div style={{ fontSize: 22, fontWeight: 700 }}>{FUND.tvpi}x</div>
            </div>
            <div style={{ textAlign: 'right' }}>
              <div style={{ fontSize: 11, fontWeight: 600, color: 'var(--text-muted)', letterSpacing: '0.05em', textTransform: 'uppercase', marginBottom: 4 }}>DPI</div>
              <div style={{ fontSize: 22, fontWeight: 700 }}>{FUND.dpi}x</div>
            </div>
          </div>
        </div>
      </div>

      {/* 6 KPI cards */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(240px, 1fr))', gap: 12, marginBottom: 16 }}>
        {[
          { label: 'COMMITMENT', value: fmtFull(FUND.commitment, currency), sub: 'Total committed' },
          { label: 'CALLED TO DATE', value: fmtFull(FUND.called, currency), sub: `${calledPct.toFixed(0)}% of commitment` },
          { label: 'UNFUNDED', value: fmtFull(FUND.unfunded, currency), sub: 'Remaining to be called' },
          { label: 'DISTRIBUTED', value: fmtFull(FUND.distributed, currency), sub: 'Returned to you' },
          { label: 'CURRENT NAV', value: fmtFull(FUND.nav, currency), sub: 'Value of your holding' },
          { label: 'SHARE OF FUND', value: `${FUND.shareOfFund}%`, sub: 'Your stake' },
        ].map(k => (
          <div key={k.label} style={styles.card}>
            <div style={{ fontSize: 10, fontWeight: 700, color: 'var(--text-muted)', letterSpacing: '0.08em', textTransform: 'uppercase', marginBottom: 10 }}>{k.label}</div>
            <div style={{ fontSize: 24, fontWeight: 700, color: 'var(--text)', marginBottom: 6 }}>{k.value}</div>
            <div style={{ fontSize: 12, color: 'var(--text-muted)' }}>{k.sub}</div>
          </div>
        ))}
      </div>

      {/* Capital called progress */}
      <div style={{ ...styles.card, marginBottom: 16 }}>
        <div style={{ fontSize: 11, fontWeight: 700, color: 'var(--accent)', letterSpacing: '0.08em', textTransform: 'uppercase', marginBottom: 14 }}>Capital Called</div>
        <div style={{ background: '#F3F4F6', borderRadius: 4, height: 8, marginBottom: 12 }}>
          <div style={{ background: 'var(--accent)', borderRadius: 4, height: 8, width: `${calledPct}%`, transition: 'width 0.6s' }} />
        </div>
        <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 13 }}>
          <span style={{ fontWeight: 500 }}>{fmtFull(FUND.called, currency)} called</span>
          <span style={{ color: 'var(--text-muted)' }}>{fmtFull(FUND.unfunded, currency)} remaining</span>
        </div>
      </div>

      {/* Partners' Letter */}
      <div style={{ ...styles.card, marginBottom: 16 }}>
        <div style={{ fontSize: 11, fontWeight: 700, color: 'var(--accent)', letterSpacing: '0.08em', textTransform: 'uppercase', marginBottom: 16 }}>
          Partners&apos; Letter · Q1 2026
        </div>
        <p style={{ fontSize: 14, lineHeight: 1.75, color: '#374151', marginBottom: 14 }}>
          Fund II closed the quarter at 1.39x MOIC, with three of four portfolio companies delivering steady operational performance. Aggregate portfolio revenue grew approximately 8% year on year, led by Abington Technical Services and Marlow &amp; Reed Joinery.
        </p>
        <p style={{ fontSize: 14, lineHeight: 1.75, color: '#374151', marginBottom: 14 }}>
          Two companies are flagged for monitoring. Delacourt Frères continues to see gross-margin compression in its core distribution business, and we are working with management on a price-led recovery for the second half. Atelier Saint-Pierre&apos;s working capital has tightened and we are reviewing cash management with the team.
        </p>
        <p style={{ fontSize: 14, lineHeight: 1.75, color: '#374151' }}>
          We expect to make our next capital call in Q3 in connection with a planned add-on acquisition at Abington. We welcome any questions at the upcoming quarterly LP meeting.
        </p>
      </div>

      <button
        onClick={goToPerformance}
        style={{ background: 'var(--accent)', color: 'white', border: 'none', borderRadius: 10, padding: '13px 28px', fontSize: 14, fontWeight: 600, cursor: 'pointer', marginBottom: 40 }}
      >
        View full fund performance →
      </button>
    </div>
  )
}

// ── Fund Performance tab ─────────────────────────────────────────────────────

function PerformanceTab() {
  return (
    <div>
      {/* Header metrics */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 20, flexWrap: 'wrap', gap: 12 }}>
        <div>
          <h2 style={{ fontSize: 20, fontWeight: 700 }}>Fund performance</h2>
          <p style={{ fontSize: 13, color: 'var(--text-muted)', marginTop: 2 }}>{FUND.name} · {FUND.period}</p>
        </div>
        <div style={{ display: 'flex', gap: 28, textAlign: 'right' }}>
          {[
            { label: 'INVESTED', value: '£16.90M' },
            { label: 'CURRENT VALUE', value: '£23.50M' },
            { label: 'FUND MOIC', value: '1.39x', accent: true },
          ].map(m => (
            <div key={m.label}>
              <div style={{ fontSize: 11, fontWeight: 600, color: 'var(--text-muted)', letterSpacing: '0.06em', textTransform: 'uppercase', marginBottom: 4 }}>{m.label}</div>
              <div style={{ fontSize: 20, fontWeight: 700, color: m.accent ? 'var(--accent)' : 'var(--text)' }}>{m.value}</div>
            </div>
          ))}
        </div>
      </div>

      {/* Stat cards */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(200px, 1fr))', gap: 12, marginBottom: 24 }}>
        {[
          { label: 'Aggregate revenue growth, YoY', value: '+8.1%', color: 'var(--green)' },
          { label: 'Weighted avg gross margin', value: '35.4%', color: 'var(--text)' },
          { label: 'Aggregate EBITDA growth, YoY', value: '+11.2%', color: 'var(--green)' },
          { label: 'Companies above plan', value: '2 of 4', color: 'var(--green)' },
          { label: 'Companies on watch', value: '2 of 4', color: '#F59E0B' },
          { label: 'Fund cash coverage', value: '14.2 mo', color: 'var(--green)' },
        ].map(s => (
          <div key={s.label} style={styles.card}>
            <div style={{ fontSize: 13, color: 'var(--text-muted)', marginBottom: 10, lineHeight: 1.4 }}>{s.label}</div>
            <div style={{ fontSize: 26, fontWeight: 700, color: s.color }}>{s.value}</div>
          </div>
        ))}
      </div>

      {/* Portfolio companies grid */}
      <div style={{ fontSize: 11, fontWeight: 700, color: 'var(--accent)', letterSpacing: '0.08em', textTransform: 'uppercase', marginBottom: 12 }}>Portfolio Companies</div>
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(340px, 1fr))', gap: 12, marginBottom: 40 }}>
        {COMPANIES.map(co => (
          <div key={co.id} style={styles.card}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 14 }}>
              <div>
                <div style={{ fontSize: 15, fontWeight: 700, marginBottom: 3 }}>{co.name}</div>
                <div style={{ fontSize: 12, color: 'var(--text-muted)' }}>{co.sector} · {co.country}</div>
              </div>
              <div style={{ width: 10, height: 10, borderRadius: '50%', background: co.status === 'green' ? '#10B981' : '#F59E0B', marginTop: 4, flexShrink: 0 }} />
            </div>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-end' }}>
              <div style={{ display: 'flex', gap: 24 }}>
                <div>
                  <div style={{ fontSize: 10, fontWeight: 600, color: 'var(--text-muted)', letterSpacing: '0.06em', textTransform: 'uppercase', marginBottom: 4 }}>MOIC</div>
                  <div style={{ fontSize: 16, fontWeight: 700 }}>{co.moic}x</div>
                </div>
                <div>
                  <div style={{ fontSize: 10, fontWeight: 600, color: 'var(--text-muted)', letterSpacing: '0.06em', textTransform: 'uppercase', marginBottom: 4 }}>REVENUE</div>
                  <div style={{ fontSize: 16, fontWeight: 700 }}>{co.sym}{(co.revenue / 1_000_000).toFixed(2)}M</div>
                </div>
              </div>
              <div style={{ overflow: 'hidden', flexShrink: 0 }}>
                <Sparkline data={co.trend} color={co.status === 'green' ? '#10B981' : '#F59E0B'} />
              </div>
            </div>
          </div>
        ))}
      </div>
    </div>
  )
}

// ── Portfolio tab ────────────────────────────────────────────────────────────

function PortfolioTab({ selectedCompany, setSelectedCompany }: { selectedCompany: string; setSelectedCompany: (id: string) => void }) {
  const co = COMPANIES.find(c => c.id === selectedCompany)!
  const latest = co.data[co.data.length - 1]

  return (
    <div>
      {/* Company selector */}
      <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap', marginBottom: 20 }}>
        {COMPANIES.map(c => (
          <button
            key={c.id}
            onClick={() => setSelectedCompany(c.id)}
            style={{
              padding: '7px 14px', borderRadius: 8, fontSize: 13, fontWeight: selectedCompany === c.id ? 600 : 400,
              border: '1px solid var(--border)', cursor: 'pointer',
              background: selectedCompany === c.id ? 'var(--navy)' : 'white',
              color: selectedCompany === c.id ? 'white' : 'var(--text-muted)',
            }}
          >
            {c.name}
          </button>
        ))}
      </div>

      {/* Company header */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 20, flexWrap: 'wrap', gap: 12 }}>
        <div>
          <h2 style={{ fontSize: 20, fontWeight: 700 }}>{co.name}</h2>
          <p style={{ fontSize: 13, color: 'var(--text-muted)', marginTop: 2 }}>{co.sector} · {co.country}</p>
        </div>
        <div style={{ display: 'flex', gap: 28, textAlign: 'right' }}>
          <div>
            <div style={{ fontSize: 11, fontWeight: 600, color: 'var(--text-muted)', letterSpacing: '0.06em', textTransform: 'uppercase', marginBottom: 4 }}>MOIC</div>
            <div style={{ fontSize: 20, fontWeight: 700, color: 'var(--accent)' }}>{co.moic}x</div>
          </div>
          <div>
            <div style={{ fontSize: 11, fontWeight: 600, color: 'var(--text-muted)', letterSpacing: '0.06em', textTransform: 'uppercase', marginBottom: 4 }}>REVENUE</div>
            <div style={{ fontSize: 20, fontWeight: 700 }}>{co.sym}{(co.revenue / 1_000_000).toFixed(2)}M</div>
          </div>
        </div>
      </div>

      {/* Metrics table */}
      <div style={{ ...styles.card, marginBottom: 16, padding: 0, overflow: 'hidden' }}>
        <div style={{ overflowX: 'auto' }}>
          <table style={{ width: '100%', minWidth: 420, borderCollapse: 'collapse', fontSize: 14 }}>
            <thead>
              <tr style={{ borderBottom: '1px solid var(--border)' }}>
                <th style={{ textAlign: 'left', padding: '12px 16px', fontSize: 11, fontWeight: 600, color: 'var(--text-muted)', letterSpacing: '0.06em', textTransform: 'uppercase' }}>Metric</th>
                {co.data.map(d => (
                  <th key={d.fy} style={{ textAlign: 'right', padding: '12px 16px', fontSize: 11, fontWeight: 600, color: 'var(--text-muted)', letterSpacing: '0.06em', textTransform: 'uppercase' }}>{d.fy}</th>
                ))}
                <th className="hide-mobile" style={{ textAlign: 'right', padding: '12px 16px', fontSize: 11, fontWeight: 600, color: 'var(--text-muted)', letterSpacing: '0.06em', textTransform: 'uppercase' }}>Trend</th>
              </tr>
            </thead>
            <tbody>
              {[
                { label: 'Revenue', values: co.data.map(d => `${co.sym}${(d.revenue / 1_000_000).toFixed(2)}M`), trend: co.data.map(d => d.revenue), color: '#10B981' },
                { label: 'Gross margin %', values: co.data.map(d => `${d.grossMargin}%`), trend: co.data.map(d => d.grossMargin), color: '#10B981' },
                { label: 'EBITDA', values: co.data.map(d => `${co.sym}${(d.ebitda / 1000).toFixed(0)}k`), trend: co.data.map(d => d.ebitda), color: '#10B981' },
                { label: 'Net profit', values: co.data.map(d => `${co.sym}${(d.netProfit / 1000).toFixed(0)}k`), trend: co.data.map(d => d.netProfit), color: '#10B981' },
                { label: 'Cash', values: co.data.map(d => `${co.sym}${(d.cash / 1_000_000).toFixed(2)}M`), trend: co.data.map(d => d.cash), color: '#10B981' },
                { label: 'Receivables', values: co.data.map(d => `${co.sym}${(d.receivables / 1000).toFixed(0)}k`), trend: co.data.map(d => d.receivables), color: '#F59E0B' },
                { label: 'Payables', values: co.data.map(d => `${co.sym}${(d.payables / 1000).toFixed(0)}k`), trend: co.data.map(d => d.payables), color: '#F59E0B' },
              ].map((row, i) => (
                <tr key={row.label} style={{ borderBottom: '1px solid #F3F4F6', background: i % 2 === 0 ? 'transparent' : '#FAFAFA' }}>
                  <td style={{ padding: '12px 16px', color: 'var(--text-muted)', whiteSpace: 'nowrap' }}>{row.label}</td>
                  {row.values.map((v, j) => (
                    <td key={j} style={{ padding: '12px 16px', textAlign: 'right', fontWeight: j === row.values.length - 1 ? 600 : 400, whiteSpace: 'nowrap' }}>{v}</td>
                  ))}
                  <td className="hide-mobile" style={{ padding: '8px 16px', textAlign: 'right' }}>
                    <Sparkline data={row.trend} color={row.color} width={72} height={28} />
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* AI Commentary */}
      <div style={{ ...styles.card, marginBottom: 40, borderLeft: '3px solid var(--accent)' }}>
        <div style={{ fontSize: 11, fontWeight: 700, color: 'var(--accent)', letterSpacing: '0.08em', textTransform: 'uppercase', marginBottom: 12 }}>AI Commentary</div>
        <p style={{ fontSize: 14, lineHeight: 1.75, color: '#374151' }}>{co.commentary}</p>
      </div>
    </div>
  )
}

// ── Documents tab ────────────────────────────────────────────────────────────

function DocumentsTab() {
  return (
    <div>
      <div style={{ marginBottom: 20 }}>
        <h2 style={{ fontSize: 20, fontWeight: 700 }}>Documents</h2>
        <p style={{ fontSize: 13, color: 'var(--text-muted)', marginTop: 2 }}>Reports, notices and tax documents for {FUND.name}</p>
      </div>
      <div style={{ ...styles.card, padding: 0, overflow: 'hidden', marginBottom: 40 }}>
        {DOCUMENTS.map((doc, i) => (
          <div key={i} style={{
            display: 'flex', alignItems: 'center', gap: 14,
            padding: '16px 20px',
            borderBottom: i < DOCUMENTS.length - 1 ? '1px solid #F3F4F6' : 'none',
          }}>
            <div style={{
              width: 36, height: 36, borderRadius: 8, flexShrink: 0,
              background: doc.type === 'Notice' ? '#FEF3C7' : doc.type === 'Tax' ? '#EEF3FA' : '#F3F4F6',
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              fontSize: 14,
            }}>
              {doc.type === 'Notice' ? '!' : doc.type === 'Tax' ? '§' : '≡'}
            </div>
            <div style={{ flex: 1, minWidth: 0 }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 8, flexWrap: 'wrap' }}>
                <span style={{ fontSize: 14, fontWeight: 500 }}>{doc.title}</span>
                {doc.isNew && (
                  <span style={{ fontSize: 10, fontWeight: 700, background: '#ECFDF5', color: '#065F46', padding: '2px 7px', borderRadius: 20, letterSpacing: '0.05em' }}>NEW</span>
                )}
              </div>
              <div style={{ fontSize: 12, color: 'var(--text-muted)', marginTop: 2 }}>{doc.type} · {doc.date}</div>
            </div>
            <button style={{
              padding: '7px 16px', borderRadius: 8, fontSize: 13, fontWeight: 500,
              border: '1px solid var(--border)', background: 'white', color: 'var(--text)',
              cursor: 'pointer', flexShrink: 0,
            }}>
              Download
            </button>
          </div>
        ))}
      </div>
    </div>
  )
}

// ── Sparkline ────────────────────────────────────────────────────────────────

function Sparkline({ data, color = '#10B981', width = 80, height = 36 }: { data: number[]; color?: string; width?: number; height?: number }) {
  if (data.length < 2) return null
  const min = Math.min(...data)
  const max = Math.max(...data)
  const range = max - min || 1
  const pad = 4
  const w = width - pad * 2 - 4 // 4px right margin for the dot
  const h = height - pad * 2
  const points = data.map((v, i) => {
    const x = pad + (i / (data.length - 1)) * w
    const y = pad + h - ((v - min) / range) * h
    return `${x.toFixed(1)},${y.toFixed(1)}`
  }).join(' ')
  const lastX = pad + w
  const lastY = pad + h - ((data[data.length - 1] - min) / range) * h
  return (
    <svg width={width} height={height} style={{ display: 'block', overflow: 'hidden' }}>
      <polyline points={points} fill="none" stroke={color} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
      <circle cx={lastX.toFixed(1)} cy={lastY.toFixed(1)} r="3" fill={color} />
    </svg>
  )
}

// ── Styles ───────────────────────────────────────────────────────────────────

const styles: Record<string, React.CSSProperties> = {
  card: {
    background: 'var(--white)', borderRadius: 12,
    padding: '20px', marginBottom: 0,
    border: '1px solid var(--border)',
  },
}
