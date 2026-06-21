'use client'
import { useState } from 'react'
import type { Quarter } from '@/lib/supabase'
import type { Currency } from '@/lib/currency'
import { fmtM, fmtFull } from '@/lib/currency'
import BottomTabBar from './BottomTabBar'

const LP_TABS = [
  {
    id: 'account', label: 'Account',
    icon: <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"><circle cx="12" cy="8" r="4"/><path d="M4 20c0-4 3.6-7 8-7s8 3 8 7"/></svg>,
  },
  {
    id: 'performance', label: 'Performance',
    icon: <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"><polyline points="22 12 18 12 15 21 9 3 6 12 2 12"/></svg>,
  },
  {
    id: 'portfolio', label: 'Portfolio',
    icon: <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"><rect x="2" y="7" width="20" height="14" rx="2"/><path d="M16 7V5a2 2 0 0 0-2-2h-4a2 2 0 0 0-2 2v2"/></svg>,
  },
  {
    id: 'documents', label: 'Documents',
    icon: <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"><path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/><polyline points="14 2 14 8 20 8"/></svg>,
  },
]

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

export default function LPView({ quarters, currency, isMobile }: { quarters: Quarter[]; currency: Currency; isMobile?: boolean }) {
  const [tab, setTab] = useState<Tab>('account')
  const [selectedCompany, setSelectedCompany] = useState(COMPANIES[0].id)
  void quarters // kept for future real-data integration

  return (
    <div style={{ maxWidth: 900, margin: '0 auto', paddingBottom: isMobile ? 'calc(72px + env(safe-area-inset-bottom))' : 0 }}>
      {/* Page header — hide on mobile since bottom bar shows context */}
      {!isMobile && (
        <div style={{ marginBottom: 24 }}>
          <h1 style={{ fontSize: 22, fontWeight: 700, letterSpacing: '-0.3px' }}>My Account</h1>
          <p style={{ fontSize: 13, color: 'var(--text-muted)', marginTop: 3 }}>{FUND.name} · as at {FUND.date}</p>
        </div>
      )}

      {/* Desktop tabs */}
      {!isMobile && (
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
      )}

      {/* Mobile section header */}
      {isMobile && (
        <div style={{ marginBottom: 20 }}>
          <h2 style={{ fontSize: 18, fontWeight: 700, letterSpacing: '-0.2px' }}>
            {tab === 'account' ? 'My Account' : tab === 'performance' ? 'Fund Performance' : tab === 'portfolio' ? 'Portfolio' : 'Documents'}
          </h2>
          <p style={{ fontSize: 12, color: 'var(--text-muted)', marginTop: 2 }}>{FUND.name} · {FUND.date}</p>
        </div>
      )}

      {tab === 'account' && <AccountTab currency={currency} goToPerformance={() => setTab('performance')} />}
      {tab === 'performance' && <PerformanceTab />}
      {tab === 'portfolio' && <PortfolioTab selectedCompany={selectedCompany} setSelectedCompany={setSelectedCompany} />}
      {tab === 'documents' && <DocumentsTab />}

      {/* Mobile bottom tab bar */}
      {isMobile && (
        <BottomTabBar
          tabs={LP_TABS}
          activeTab={tab}
          onTabChange={id => setTab(id as Tab)}
        />
      )}
    </div>
  )
}

// ── My Account tab ───────────────────────────────────────────────────────────

function AccountTab({ currency, goToPerformance }: { currency: Currency; goToPerformance: () => void }) {
  const calledPct = (FUND.called / FUND.commitment) * 100

  return (
    <div>
      {/* Top summary: fund name + 3 headline numbers in one compact card */}
      <div style={{ ...styles.card, marginBottom: 10 }}>
        <div style={{ fontSize: 12, color: 'var(--text-muted)', marginBottom: 12 }}>{FUND.name} · as at {FUND.date}</div>
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: 0 }}>
          {[
            { label: 'NAV', value: fmtM(FUND.nav, currency), accent: true },
            { label: 'TVPI', value: `${FUND.tvpi}x`, accent: false },
            { label: 'DPI', value: `${FUND.dpi}x`, accent: false },
          ].map((s, i) => (
            <div key={s.label} style={{
              paddingRight: i < 2 ? 16 : 0,
              borderRight: i < 2 ? '1px solid var(--border)' : 'none',
              paddingLeft: i > 0 ? 16 : 0,
            }}>
              <div style={{ fontSize: 10, fontWeight: 600, color: 'var(--text-muted)', letterSpacing: '0.07em', textTransform: 'uppercase', marginBottom: 5 }}>{s.label}</div>
              <div style={{ fontSize: 22, fontWeight: 700, color: s.accent ? 'var(--accent)' : 'var(--text)' }}>{s.value}</div>
            </div>
          ))}
        </div>
      </div>

      {/* Capital called progress */}
      <div style={{ ...styles.card, marginBottom: 10 }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 8 }}>
          <span style={{ fontSize: 11, fontWeight: 700, color: 'var(--accent)', letterSpacing: '0.07em', textTransform: 'uppercase' }}>Capital Called</span>
          <span style={{ fontSize: 12, color: 'var(--text-muted)' }}>{calledPct.toFixed(0)}% of commitment</span>
        </div>
        <div style={{ background: '#F3F4F6', borderRadius: 4, height: 6, marginBottom: 8 }}>
          <div style={{ background: 'var(--accent)', borderRadius: 4, height: 6, width: `${calledPct}%` }} />
        </div>
        <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 12 }}>
          <span style={{ fontWeight: 500 }}>{fmtM(FUND.called, currency)} called</span>
          <span style={{ color: 'var(--text-muted)' }}>{fmtM(FUND.unfunded, currency)} remaining</span>
        </div>
      </div>

      {/* 6 KPIs in a tight 3-column grid */}
      <div style={{ ...styles.card, marginBottom: 10, padding: '14px 16px' }}>
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: '16px 12px' }}>
          {[
            { label: 'Commitment', value: fmtM(FUND.commitment, currency) },
            { label: 'Called', value: fmtM(FUND.called, currency) },
            { label: 'Unfunded', value: fmtM(FUND.unfunded, currency) },
            { label: 'Distributed', value: fmtM(FUND.distributed, currency) },
            { label: 'Current NAV', value: fmtM(FUND.nav, currency) },
            { label: 'Share of Fund', value: `${FUND.shareOfFund}%` },
          ].map(k => (
            <div key={k.label}>
              <div style={{ fontSize: 10, fontWeight: 600, color: 'var(--text-muted)', letterSpacing: '0.05em', textTransform: 'uppercase', marginBottom: 4 }}>{k.label}</div>
              <div style={{ fontSize: 16, fontWeight: 700, color: 'var(--text)' }}>{k.value}</div>
            </div>
          ))}
        </div>
      </div>

      {/* Partners' Letter */}
      <div style={{ ...styles.card, marginBottom: 10 }}>
        <div style={{ fontSize: 11, fontWeight: 700, color: 'var(--accent)', letterSpacing: '0.08em', textTransform: 'uppercase', marginBottom: 12 }}>
          Partners&apos; Letter · Q1 2026
        </div>
        <p style={{ fontSize: 13, lineHeight: 1.7, color: '#374151', marginBottom: 10 }}>
          Fund II closed the quarter at 1.39x MOIC, with three of four portfolio companies delivering steady operational performance. Aggregate portfolio revenue grew approximately 8% year on year, led by Abington Technical Services and Marlow &amp; Reed Joinery.
        </p>
        <p style={{ fontSize: 13, lineHeight: 1.7, color: '#374151', marginBottom: 10 }}>
          Two companies are flagged for monitoring. Delacourt Frères continues to see gross-margin compression in its core distribution business, and we are working with management on a price-led recovery for the second half. Atelier Saint-Pierre&apos;s working capital has tightened and we are reviewing cash management with the team.
        </p>
        <p style={{ fontSize: 13, lineHeight: 1.7, color: '#374151' }}>
          We expect to make our next capital call in Q3 in connection with a planned add-on acquisition at Abington. We welcome any questions at the upcoming quarterly LP meeting.
        </p>
      </div>

      <button
        onClick={goToPerformance}
        style={{ background: 'var(--accent)', color: 'white', border: 'none', borderRadius: 10, padding: '12px 24px', fontSize: 14, fontWeight: 600, cursor: 'pointer', marginBottom: 32 }}
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
              <Sparkline
                data={co.trend}
                color={co.status === 'green' ? '#10B981' : '#F59E0B'}
                startLabel={`${co.sym}${(co.trend[0] / 1_000_000).toFixed(1)}M`}
                endLabel={`${co.sym}${(co.trend[co.trend.length - 1] / 1_000_000).toFixed(1)}M`}
                width={100} height={48}
              />
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
                    <Sparkline data={row.trend} color={row.color} width={72} height={36} />
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

function Sparkline({ data, color = '#10B981', width = 110, height = 44, startLabel, endLabel }: {
  data: number[]; color?: string; width?: number; height?: number
  startLabel?: string; endLabel?: string
}) {
  if (data.length < 2) return null
  const min = Math.min(...data)
  const max = Math.max(...data)
  const range = max - min || 1
  const padX = 2; const padY = 4
  const w = width - padX * 2
  const h = height - padY * 2 - 16 // 16px reserved for labels at bottom
  const uid = `grad-${color.replace('#', '')}`

  const pts = data.map((v, i) => ({
    x: padX + (i / (data.length - 1)) * w,
    y: padY + h - ((v - min) / range) * h,
  }))

  const linePts = pts.map(p => `${p.x.toFixed(1)},${p.y.toFixed(1)}`).join(' ')
  const areaBottom = padY + h
  const areaPts = [
    `${pts[0].x.toFixed(1)},${areaBottom}`,
    ...pts.map(p => `${p.x.toFixed(1)},${p.y.toFixed(1)}`),
    `${pts[pts.length - 1].x.toFixed(1)},${areaBottom}`,
  ].join(' ')

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 0 }}>
      <svg width={width} height={height} style={{ display: 'block', overflow: 'hidden' }}>
        <defs>
          <linearGradient id={uid} x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor={color} stopOpacity="0.25" />
            <stop offset="100%" stopColor={color} stopOpacity="0" />
          </linearGradient>
        </defs>
        <polygon points={areaPts} fill={`url(#${uid})`} />
        <polyline points={linePts} fill="none" stroke={color} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
      </svg>
      {(startLabel || endLabel) && (
        <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 10, color: color, fontWeight: 600, marginTop: 2, paddingLeft: padX, paddingRight: padX }}>
          <span>{startLabel}</span>
          <span>{endLabel}</span>
        </div>
      )}
    </div>
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
