'use client'
import { useState, useEffect, useRef } from 'react'
import type { Quarter } from '@/lib/supabase'
import type { Currency } from '@/lib/currency'
import { fmtM, fmtFull } from '@/lib/currency'
import { FUND, COMPANIES, DOCUMENTS, CAPITAL_EVENTS, FORECAST } from '@/lib/fundData'
import BottomTabBar from './BottomTabBar'

const LP_TABS = [
  {
    id: 'account', label: 'Account',
    icon: <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"><circle cx="12" cy="8" r="4"/><path d="M4 20c0-4 3.6-7 8-7s8 3 8 7"/></svg>,
  },
  {
    id: 'ask', label: 'Ask AI',
    icon: <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"><path d="M12 3l1.9 4.6L18.5 9.5 13.9 11.4 12 16l-1.9-4.6L5.5 9.5l4.6-1.9z"/><path d="M19 14l.8 2 2 .8-2 .8-.8 2-.8-2-2-.8 2-.8z"/></svg>,
  },
  {
    id: 'performance', label: 'Fund',
    icon: <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"><polyline points="22 12 18 12 15 21 9 3 6 12 2 12"/></svg>,
  },
  {
    id: 'portfolio', label: 'Portfolio',
    icon: <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"><rect x="2" y="7" width="20" height="14" rx="2"/><path d="M16 7V5a2 2 0 0 0-2-2h-4a2 2 0 0 0-2 2v2"/></svg>,
  },
  {
    id: 'documents', label: 'Docs',
    icon: <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"><path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/><polyline points="14 2 14 8 20 8"/></svg>,
  },
]

// ── Main component ───────────────────────────────────────────────────────────

type Tab = 'account' | 'ask' | 'performance' | 'portfolio' | 'documents'

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
            { id: 'ask', label: '✦ Ask AI' },
            { id: 'performance', label: 'Fund performance' },
            { id: 'portfolio', label: 'Portfolio' },
            { id: 'documents', label: 'Documents' },
          ] as { id: Tab; label: string }[]).map(t => {
            const isAsk = t.id === 'ask'
            const active = tab === t.id
            return (
              <button
                key={t.id}
                onClick={() => setTab(t.id)}
                style={{
                  padding: '8px 16px', fontSize: 13, fontWeight: active || isAsk ? 600 : 400,
                  border: 'none', cursor: 'pointer', borderRadius: '8px 8px 0 0',
                  background: active ? 'var(--navy)' : 'transparent',
                  color: active ? 'white' : isAsk ? 'var(--accent)' : 'var(--text-muted)',
                  borderBottom: active ? '2px solid var(--navy)' : '2px solid transparent',
                  marginBottom: -1,
                }}
              >
                {t.label}
              </button>
            )
          })}
        </div>
      )}

      {/* Mobile section header */}
      {isMobile && (
        <div style={{ marginBottom: 20 }}>
          <h2 style={{ fontSize: 18, fontWeight: 700, letterSpacing: '-0.2px' }}>
            {tab === 'account' ? 'My Account' : tab === 'ask' ? 'Ask Clavio AI' : tab === 'performance' ? 'Fund Performance' : tab === 'portfolio' ? 'Portfolio' : 'Documents'}
          </h2>
          <p style={{ fontSize: 12, color: 'var(--text-muted)', marginTop: 2 }}>{FUND.name} · {FUND.date}</p>
        </div>
      )}

      {tab === 'account' && <AccountTab currency={currency} goToPerformance={() => setTab('performance')} goToAsk={() => setTab('ask')} />}
      {tab === 'ask' && <AskTab isMobile={isMobile} />}
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

function AccountTab({ currency, goToPerformance, goToAsk }: { currency: Currency; goToPerformance: () => void; goToAsk: () => void }) {
  const calledPct = (FUND.called / FUND.commitment) * 100
  const navCount = useCountUp(FUND.nav)
  const tvpiCount = useCountUp(FUND.tvpi, 1000, 2)
  const dpiCount = useCountUp(FUND.dpi, 1000, 2)

  return (
    <div>
      {/* Hero position card — gradient + animated count-up */}
      <div style={{
        borderRadius: 14, marginBottom: 10, padding: '22px 24px',
        background: 'linear-gradient(135deg, #0A0E1A 0%, #16233E 55%, #1E3A5F 100%)',
        color: 'white', position: 'relative', overflow: 'hidden',
      }}>
        <div style={{ position: 'absolute', top: -40, right: -30, width: 180, height: 180, borderRadius: '50%', background: 'radial-gradient(circle, rgba(91,130,189,0.35), transparent 70%)' }} />
        <div style={{ fontSize: 11, fontWeight: 600, color: 'rgba(255,255,255,0.55)', letterSpacing: '0.08em', textTransform: 'uppercase', marginBottom: 4 }}>Your position · {FUND.name}</div>
        <div style={{ display: 'flex', alignItems: 'baseline', gap: 10, marginBottom: 18, position: 'relative' }}>
          <div style={{ fontSize: 38, fontWeight: 800, letterSpacing: '-0.5px' }}>{fmtM(navCount, currency)}</div>
          <div style={{ fontSize: 13, color: '#7FE6B0', fontWeight: 600 }}>▲ {FUND.tvpi}x net</div>
        </div>
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: 0, position: 'relative' }}>
          {[
            { label: 'TVPI', value: `${tvpiCount.toFixed(2)}x` },
            { label: 'DPI', value: `${dpiCount.toFixed(2)}x` },
            { label: 'Share of fund', value: `${FUND.shareOfFund}%` },
          ].map((s, i) => (
            <div key={s.label} style={{
              paddingRight: i < 2 ? 16 : 0,
              borderRight: i < 2 ? '1px solid rgba(255,255,255,0.12)' : 'none',
              paddingLeft: i > 0 ? 16 : 0,
            }}>
              <div style={{ fontSize: 10, fontWeight: 600, color: 'rgba(255,255,255,0.5)', letterSpacing: '0.07em', textTransform: 'uppercase', marginBottom: 5 }}>{s.label}</div>
              <div style={{ fontSize: 20, fontWeight: 700 }}>{s.value}</div>
            </div>
          ))}
        </div>
      </div>

      {/* Ask AI prompt */}
      <button
        onClick={goToAsk}
        style={{
          width: '100%', textAlign: 'left', marginBottom: 10, cursor: 'pointer',
          borderRadius: 12, padding: '13px 16px', border: '1px solid #D7E2F2',
          background: 'linear-gradient(90deg, #F4F8FE, #FFFFFF)',
          display: 'flex', alignItems: 'center', gap: 12,
        }}
      >
        <span style={{ width: 34, height: 34, borderRadius: 9, flexShrink: 0, background: 'var(--accent)', color: 'white', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 16 }}>✦</span>
        <span style={{ flex: 1, minWidth: 0 }}>
          <span style={{ display: 'block', fontSize: 13, fontWeight: 600, color: 'var(--text)' }}>Ask Clavio anything about your fund</span>
          <span style={{ display: 'block', fontSize: 12, color: 'var(--text-muted)' }}>“Why did Delacourt&apos;s margin fall?” · “What&apos;s my next capital call?”</span>
        </span>
        <span style={{ fontSize: 18, color: 'var(--accent)', flexShrink: 0 }}>→</span>
      </button>

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

      {/* Cash-flow forecast */}
      <ForecastStrip currency={currency} />

      {/* Capital account activity timeline */}
      <CapitalActivity currency={currency} />

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

// ── Cash-flow forecast strip ─────────────────────────────────────────────────

function ForecastStrip({ currency }: { currency: Currency }) {
  return (
    <div style={{ ...styles.card, marginBottom: 10, borderLeft: '3px solid var(--accent)' }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 14 }}>
        <span style={{ fontSize: 11, fontWeight: 700, color: 'var(--accent)', letterSpacing: '0.08em', textTransform: 'uppercase' }}>Cash-Flow Forecast</span>
        <span style={{ fontSize: 10, fontWeight: 700, background: 'var(--accent)', color: 'white', padding: '2px 7px', borderRadius: 20 }}>PROJECTED</span>
      </div>
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(150px, 1fr))', gap: 14 }}>
        <ForecastItem
          dir="out"
          label="Next capital call"
          amount={`~${fmtM(FORECAST.nextCall.amount, currency)}`}
          period={FORECAST.nextCall.period}
          note={FORECAST.nextCall.note}
        />
        <ForecastItem
          dir="in"
          label="Next distribution"
          amount={`~${fmtM(FORECAST.nextDistribution.amount, currency)}`}
          period={FORECAST.nextDistribution.period}
          note={FORECAST.nextDistribution.note}
        />
        <ForecastItem
          dir="in"
          label="Distributions, next 18m"
          amount={`~${fmtM(FORECAST.projectedDistributions18m, currency)}`}
          period="Through 2027"
          note="Based on the fund's realisation plan"
        />
      </div>
    </div>
  )
}

function ForecastItem({ dir, label, amount, period, note }: {
  dir: 'in' | 'out'; label: string; amount: string; period: string; note: string
}) {
  const isIn = dir === 'in'
  return (
    <div>
      <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginBottom: 5 }}>
        <span style={{
          width: 18, height: 18, borderRadius: 5, flexShrink: 0, fontSize: 11,
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          background: isIn ? '#ECFDF5' : '#EEF3FA', color: isIn ? '#10B981' : 'var(--accent)',
        }}>{isIn ? '↓' : '↑'}</span>
        <span style={{ fontSize: 11, fontWeight: 600, color: 'var(--text-muted)', letterSpacing: '0.03em', textTransform: 'uppercase' }}>{label}</span>
      </div>
      <div style={{ fontSize: 18, fontWeight: 700, color: isIn ? '#0F7B4F' : 'var(--text)' }}>{amount}</div>
      <div style={{ fontSize: 12, color: 'var(--text)', fontWeight: 500, marginTop: 1 }}>{period}</div>
      <div style={{ fontSize: 11, color: 'var(--text-muted)', marginTop: 3, lineHeight: 1.4 }}>{note}</div>
    </div>
  )
}

// ── Capital account activity timeline ────────────────────────────────────────

function CapitalActivity({ currency }: { currency: Currency }) {
  // Most recent first
  const events = [...CAPITAL_EVENTS].reverse()
  return (
    <div style={{ ...styles.card, marginBottom: 10 }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'baseline', marginBottom: 16, flexWrap: 'wrap', gap: 6 }}>
        <span style={{ fontSize: 11, fontWeight: 700, color: 'var(--accent)', letterSpacing: '0.08em', textTransform: 'uppercase' }}>Capital Account Activity</span>
        <span style={{ fontSize: 12, color: 'var(--text-muted)' }}>
          {fmtM(FUND.called, currency)} called · {fmtM(FUND.distributed, currency)} distributed
        </span>
      </div>
      <div style={{ position: 'relative' }}>
        {/* vertical line */}
        <div style={{ position: 'absolute', left: 7, top: 6, bottom: 6, width: 2, background: 'var(--border)' }} />
        {events.map((e, i) => {
          const isCall = e.type === 'call'
          return (
            <div key={i} style={{ display: 'flex', gap: 14, alignItems: 'flex-start', paddingBottom: i < events.length - 1 ? 16 : 0, position: 'relative' }}>
              <span style={{
                width: 16, height: 16, borderRadius: '50%', flexShrink: 0, marginTop: 2, zIndex: 1,
                border: '2px solid white', boxShadow: '0 0 0 1px var(--border)',
                background: isCall ? 'var(--accent)' : '#10B981',
                display: 'flex', alignItems: 'center', justifyContent: 'center',
              }} />
              <div style={{ flex: 1, minWidth: 0, display: 'flex', justifyContent: 'space-between', gap: 12 }}>
                <div style={{ minWidth: 0 }}>
                  <div style={{ fontSize: 13, fontWeight: 600, color: 'var(--text)', lineHeight: 1.35 }}>{e.label}</div>
                  <div style={{ fontSize: 12, color: 'var(--text-muted)', marginTop: 1 }}>{e.date}</div>
                </div>
                <div style={{ textAlign: 'right', flexShrink: 0 }}>
                  <div style={{ fontSize: 14, fontWeight: 700, color: isCall ? 'var(--text)' : '#0F7B4F' }}>
                    {isCall ? '−' : '+'}{fmtM(e.amount, currency)}
                  </div>
                  <div style={{ fontSize: 10.5, fontWeight: 600, color: 'var(--text-muted)', letterSpacing: '0.04em', textTransform: 'uppercase' }}>
                    {isCall ? 'Called' : 'Distributed'}
                  </div>
                </div>
              </div>
            </div>
          )
        })}
      </div>
    </div>
  )
}

// ── Fund Performance tab ─────────────────────────────────────────────────────

function PerformanceTab() {
  return (
    <div>
      {/* Header metrics */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 20, flexWrap: 'wrap', gap: 12 }}>
        <div className="hide-mobile">
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

      {/* Value creation bridge */}
      <div style={{ ...styles.card, marginBottom: 12 }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'baseline', marginBottom: 4, flexWrap: 'wrap', gap: 6 }}>
          <div style={{ fontSize: 11, fontWeight: 700, color: 'var(--accent)', letterSpacing: '0.08em', textTransform: 'uppercase' }}>Value Creation Bridge</div>
          <div style={{ fontSize: 12, color: 'var(--text-muted)' }}>Invested cost → current value</div>
        </div>
        <p style={{ fontSize: 12.5, color: 'var(--text-muted)', marginBottom: 16, lineHeight: 1.5 }}>
          How the fund grew gross value from £16.9M invested to £23.5M, decomposed by driver.
        </p>
        <ValueBridge />
      </div>

      {/* J-curve + allocation row */}
      <div className="gp-trend-grid" style={{ marginBottom: 24 }}>
        <div style={styles.card}>
          <div style={{ fontSize: 11, fontWeight: 700, color: 'var(--accent)', letterSpacing: '0.08em', textTransform: 'uppercase', marginBottom: 4 }}>Fund J-Curve</div>
          <p style={{ fontSize: 12.5, color: 'var(--text-muted)', marginBottom: 14, lineHeight: 1.5 }}>
            Cumulative net cash flow to investors. Crossed into positive territory in 2025.
          </p>
          <JCurve />
        </div>
        <div style={styles.card}>
          <div style={{ fontSize: 11, fontWeight: 700, color: 'var(--accent)', letterSpacing: '0.08em', textTransform: 'uppercase', marginBottom: 14 }}>Allocation by Sector</div>
          <AllocationDonut />
        </div>
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
  const [query, setQuery] = useState('')
  const [openDoc, setOpenDoc] = useState<string | null>(null)
  const [summaries, setSummaries] = useState<Record<string, string>>({})
  const [loadingDoc, setLoadingDoc] = useState<string | null>(null)
  const [errorDoc, setErrorDoc] = useState<Record<string, string>>({})

  const q = query.trim().toLowerCase()
  const filtered = DOCUMENTS.filter(d =>
    !q || d.title.toLowerCase().includes(q) || d.type.toLowerCase().includes(q)
  )

  const summarize = async (title: string, type: string) => {
    setOpenDoc(prev => (prev === title ? null : title))
    if (summaries[title] || loadingDoc === title) return
    setLoadingDoc(title)
    setErrorDoc(e => ({ ...e, [title]: '' }))
    try {
      const question = `Summarise the "${title}" (a ${type.toLowerCase()} for ${FUND.name}) for an investor in exactly 3 short bullet points. Each bullet on its own line starting with "• ". Ground every bullet in the fund and portfolio figures you have. No preamble, just the 3 bullets.`
      const res = await fetch('/api/ask', {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ question }),
      })
      const data = await res.json()
      if (!res.ok) throw new Error(data.error || 'Request failed')
      setSummaries(s => ({ ...s, [title]: data.answer || '' }))
    } catch (e: unknown) {
      setErrorDoc(er => ({ ...er, [title]: e instanceof Error ? e.message : 'Could not summarise' }))
    } finally {
      setLoadingDoc(null)
    }
  }

  return (
    <div>
      <div className="hide-mobile" style={{ marginBottom: 16 }}>
        <h2 style={{ fontSize: 20, fontWeight: 700 }}>Documents</h2>
        <p style={{ fontSize: 13, color: 'var(--text-muted)', marginTop: 2 }}>Reports, notices and tax documents for {FUND.name}</p>
      </div>

      {/* Search */}
      <div style={{ position: 'relative', marginBottom: 12 }}>
        <span style={{ position: 'absolute', left: 14, top: '50%', transform: 'translateY(-50%)', color: 'var(--text-muted)', fontSize: 14 }}>⌕</span>
        <input
          value={query}
          onChange={e => setQuery(e.target.value)}
          placeholder="Search documents…"
          style={{ width: '100%', padding: '11px 14px 11px 36px', borderRadius: 10, fontSize: 14, border: '1px solid var(--border)', outline: 'none', background: 'white' }}
        />
      </div>

      <div style={{ ...styles.card, padding: 0, overflow: 'hidden', marginBottom: 40 }}>
        {filtered.length === 0 && (
          <div style={{ padding: '28px 20px', textAlign: 'center', fontSize: 13, color: 'var(--text-muted)' }}>No documents match “{query}”.</div>
        )}
        {filtered.map((doc, i) => {
          const isOpen = openDoc === doc.title
          return (
            <div key={doc.title} style={{ borderBottom: i < filtered.length - 1 ? '1px solid #F3F4F6' : 'none' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 14, padding: '16px 20px' }}>
                <div style={{
                  width: 36, height: 36, borderRadius: 8, flexShrink: 0,
                  background: doc.type === 'Notice' ? '#FEF3C7' : doc.type === 'Tax' ? '#EEF3FA' : '#F3F4F6',
                  display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 14,
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
                <button
                  onClick={() => summarize(doc.title, doc.type)}
                  style={{
                    padding: '7px 12px', borderRadius: 8, fontSize: 12.5, fontWeight: 600,
                    border: `1px solid ${isOpen ? 'var(--accent)' : '#D7E2F2'}`,
                    background: isOpen ? 'var(--accent)' : '#F4F8FE', color: isOpen ? 'white' : 'var(--accent)',
                    cursor: 'pointer', flexShrink: 0, display: 'flex', alignItems: 'center', gap: 5,
                  }}
                >
                  ✦ <span className="hide-mobile">Summary</span>
                </button>
                <button style={{
                  padding: '7px 14px', borderRadius: 8, fontSize: 12.5, fontWeight: 500,
                  border: '1px solid var(--border)', background: 'white', color: 'var(--text)',
                  cursor: 'pointer', flexShrink: 0,
                }}>
                  <span className="hide-mobile">Download</span>
                  <span className="show-mobile">↓</span>
                </button>
              </div>

              {isOpen && (
                <div style={{ padding: '0 20px 16px 70px' }}>
                  <div style={{ background: '#F7FAFE', border: '1px solid #E3ECF8', borderRadius: 10, padding: '12px 14px' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginBottom: 8 }}>
                      <span style={{ fontSize: 10, fontWeight: 700, color: 'var(--accent)', letterSpacing: '0.06em', textTransform: 'uppercase' }}>✦ AI Summary</span>
                    </div>
                    {loadingDoc === doc.title ? (
                      <div style={{ display: 'flex', gap: 5, alignItems: 'center' }}>
                        {[0, 1, 2].map(k => (
                          <span key={k} style={{ width: 6, height: 6, borderRadius: '50%', background: 'var(--accent)', animation: `clavio-pulse 1.2s ${k * 0.18}s infinite ease-in-out` }} />
                        ))}
                        <span style={{ fontSize: 12, color: 'var(--text-muted)', marginLeft: 4 }}>Reading the document…</span>
                      </div>
                    ) : errorDoc[doc.title] ? (
                      <div style={{ fontSize: 12.5, color: 'var(--red)' }}>{errorDoc[doc.title]}</div>
                    ) : (
                      <div style={{ fontSize: 13, lineHeight: 1.65, color: '#374151', whiteSpace: 'pre-wrap' }}>{summaries[doc.title]}</div>
                    )}
                  </div>
                </div>
              )}
            </div>
          )
        })}
      </div>
    </div>
  )
}

// ── Ask AI tab ───────────────────────────────────────────────────────────────

interface ChatMsg { role: 'user' | 'assistant'; content: string }

const SUGGESTED = [
  'Why did Delacourt’s gross margin compress?',
  'Compare Abington and Marlow revenue growth over three years',
  'Which company has the weakest cash position and why?',
  'What’s my unfunded commitment and likely next call?',
]

function AskTab({ isMobile }: { isMobile?: boolean }) {
  const [messages, setMessages] = useState<ChatMsg[]>([])
  const [input, setInput] = useState('')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const scrollRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    scrollRef.current?.scrollTo({ top: scrollRef.current.scrollHeight, behavior: 'smooth' })
  }, [messages, loading])

  const send = async (text: string) => {
    const q = text.trim()
    if (!q || loading) return
    setError('')
    setInput('')
    const history = messages
    const next = [...messages, { role: 'user' as const, content: q }]
    setMessages(next)
    setLoading(true)
    try {
      const res = await fetch('/api/ask', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ question: q, messages: history }),
      })
      const data = await res.json()
      if (!res.ok) throw new Error(data.error || 'Request failed')
      setMessages(m => [...m, { role: 'assistant', content: data.answer || '…' }])
    } catch (e: unknown) {
      setError(e instanceof Error ? e.message : 'Something went wrong')
    } finally {
      setLoading(false)
    }
  }

  const empty = messages.length === 0

  return (
    <div style={{ marginBottom: isMobile ? 12 : 40 }}>
      {/* Connected-data banner */}
      <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 14, flexWrap: 'wrap' }}>
        <span style={{ display: 'inline-flex', alignItems: 'center', gap: 6, fontSize: 11.5, fontWeight: 600, color: '#0F7B4F', background: '#ECFDF5', border: '1px solid #BBF7D0', borderRadius: 20, padding: '4px 10px' }}>
          <span style={{ width: 7, height: 7, borderRadius: '50%', background: '#10B981', display: 'inline-block' }} />
          Connected to live accounting data
        </span>
        <span style={{ fontSize: 12, color: 'var(--text-muted)' }}>QuickBooks · {COMPANIES.length} entities · synced {FUND.date}</span>
      </div>

      {/* Conversation */}
      <div
        ref={scrollRef}
        style={{
          ...styles.card, padding: empty ? '24px 20px' : '8px 4px',
          minHeight: empty ? 'auto' : 260, maxHeight: isMobile ? 'none' : 440,
          overflowY: 'auto', marginBottom: 12,
        }}
      >
        {empty ? (
          <div>
            <div style={{ fontSize: 15, fontWeight: 700, marginBottom: 4 }}>Ask Clavio about Fund II</div>
            <p style={{ fontSize: 13, color: 'var(--text-muted)', lineHeight: 1.6, marginBottom: 18 }}>
              Clavio reads the portfolio companies&apos; books directly. Ask a question in plain English and it pulls the exact figures to answer — no spreadsheets, no waiting on the GP.
            </p>
            <div style={{ display: 'grid', gap: 8 }}>
              {SUGGESTED.map(s => (
                <button key={s} onClick={() => send(s)} style={{
                  textAlign: 'left', padding: '11px 14px', borderRadius: 10,
                  border: '1px solid var(--border)', background: 'var(--bg)', cursor: 'pointer',
                  fontSize: 13, color: 'var(--text)', display: 'flex', alignItems: 'center', gap: 10,
                }}>
                  <span style={{ color: 'var(--accent)', fontSize: 14 }}>✦</span>
                  <span>{s}</span>
                </button>
              ))}
            </div>
          </div>
        ) : (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
            {messages.map((m, i) => <ChatBubble key={i} role={m.role} content={m.content} />)}
            {loading && <ThinkingBubble />}
          </div>
        )}
      </div>

      {error && (
        <div style={{ fontSize: 12.5, color: 'var(--red)', marginBottom: 10 }}>{error}</div>
      )}

      {/* Input */}
      <form onSubmit={e => { e.preventDefault(); send(input) }} style={{ display: 'flex', gap: 8 }}>
        <input
          value={input}
          onChange={e => setInput(e.target.value)}
          placeholder="Ask about revenue, margins, cash, your position…"
          style={{
            flex: 1, padding: '12px 16px', borderRadius: 10, fontSize: 14,
            border: '1px solid var(--border)', outline: 'none', background: 'white',
          }}
        />
        <button type="submit" disabled={loading || !input.trim()} style={{
          padding: '0 20px', borderRadius: 10, border: 'none', fontSize: 14, fontWeight: 600,
          background: loading || !input.trim() ? '#C7D2E0' : 'var(--accent)', color: 'white',
          cursor: loading || !input.trim() ? 'default' : 'pointer',
        }}>
          {loading ? '…' : 'Ask'}
        </button>
      </form>
      <div style={{ fontSize: 11, color: 'var(--text-muted)', marginTop: 8, textAlign: 'center' }}>
        Clavio AI can make mistakes. Verify material figures against source reports.
      </div>
    </div>
  )
}

function ChatBubble({ role, content }: { role: 'user' | 'assistant'; content: string }) {
  const isUser = role === 'user'
  return (
    <div style={{ display: 'flex', justifyContent: isUser ? 'flex-end' : 'flex-start', padding: '6px 8px' }}>
      <div style={{
        maxWidth: '88%', padding: '11px 14px', borderRadius: 12, fontSize: 13.5, lineHeight: 1.6,
        whiteSpace: 'pre-wrap',
        background: isUser ? 'var(--accent)' : 'var(--bg)',
        color: isUser ? 'white' : 'var(--text)',
        border: isUser ? 'none' : '1px solid var(--border)',
        borderBottomRightRadius: isUser ? 4 : 12,
        borderBottomLeftRadius: isUser ? 12 : 4,
      }}>
        {content}
      </div>
    </div>
  )
}

function ThinkingBubble() {
  return (
    <div style={{ display: 'flex', justifyContent: 'flex-start', padding: '6px 8px' }}>
      <div style={{ padding: '12px 16px', borderRadius: 12, background: 'var(--bg)', border: '1px solid var(--border)', display: 'flex', gap: 5, alignItems: 'center' }}>
        {[0, 1, 2].map(i => (
          <span key={i} style={{
            width: 6, height: 6, borderRadius: '50%', background: 'var(--accent)',
            animation: `clavio-pulse 1.2s ${i * 0.18}s infinite ease-in-out`,
          }} />
        ))}
        <span style={{ fontSize: 12, color: 'var(--text-muted)', marginLeft: 4 }}>Reading the books…</span>
      </div>
    </div>
  )
}

// ── Value creation bridge (custom SVG waterfall) ─────────────────────────────

function ValueBridge() {
  // £M figures: start at invested cost, build to current gross value
  const steps = [
    { label: 'Invested', value: 16.9, type: 'total' as const },
    { label: 'Revenue\ngrowth', value: 4.3, type: 'up' as const },
    { label: 'Margin\nexpansion', value: 2.1, type: 'up' as const },
    { label: 'Multiple', value: 1.4, type: 'up' as const },
    { label: 'Net debt\npaydown', value: 0.9, type: 'up' as const },
    { label: 'FX', value: -2.1, type: 'down' as const },
    { label: 'Current\nvalue', value: 23.5, type: 'total' as const },
  ]
  const maxVal = 26
  const chartH = 180
  const colW = 100 / steps.length
  const scale = (v: number) => (v / maxVal) * chartH

  let running = 0
  const bars = steps.map((s) => {
    if (s.type === 'total') {
      const bar = { x: 0, base: 0, height: scale(s.value), top: s.value }
      running = s.value
      return { ...s, ...bar }
    }
    const prev = running
    running += s.value
    const base = Math.min(prev, running)
    const bar = { base: scale(base), height: scale(Math.abs(s.value)), top: running }
    return { ...s, x: 0, ...bar }
  })

  const color = (t: 'total' | 'up' | 'down') => t === 'total' ? '#1E3A5F' : t === 'up' ? '#10B981' : '#EF4444'

  return (
    <div style={{ overflowX: 'auto' }}>
      <div style={{ minWidth: 460 }}>
        <svg viewBox="0 0 100 100" preserveAspectRatio="none" width="100%" height={chartH} style={{ display: 'block', overflow: 'visible' }}>
          {bars.map((b, i) => {
            const x = i * colW + colW * 0.18
            const w = colW * 0.64
            const yTop = ((chartH - b.base - b.height) / chartH) * 100
            const h = (b.height / chartH) * 100
            return (
              <g key={i}>
                <rect x={x} y={yTop} width={w} height={Math.max(h, 0.4)} fill={color(b.type)} rx="0.8" vectorEffect="non-scaling-stroke" />
                {i < bars.length - 1 && (
                  <line
                    x1={x} y1={((chartH - b.top) / chartH) * 100 * (b.type === 'down' ? 1 : 1)}
                    x2={x + colW} y2={((chartH - b.top) / chartH) * 100}
                    stroke="#CBD5E1" strokeWidth="0.4" strokeDasharray="1.5 1" vectorEffect="non-scaling-stroke"
                  />
                )}
              </g>
            )
          })}
        </svg>
        {/* Labels */}
        <div style={{ display: 'flex', marginTop: 8 }}>
          {bars.map((b, i) => (
            <div key={i} style={{ width: `${colW}%`, textAlign: 'center', padding: '0 2px' }}>
              <div style={{ fontSize: 12, fontWeight: 700, color: color(b.type), marginBottom: 2 }}>
                {b.type === 'up' ? '+' : b.type === 'down' ? '−' : ''}£{Math.abs(b.value).toFixed(1)}M
              </div>
              <div style={{ fontSize: 10.5, color: 'var(--text-muted)', lineHeight: 1.2, whiteSpace: 'pre-line' }}>{b.label}</div>
            </div>
          ))}
        </div>
      </div>
    </div>
  )
}

// ── J-curve (cumulative cash flow) ───────────────────────────────────────────

function JCurve() {
  // Cumulative net cash flow to LPs over fund life (£M), turning positive in 2025
  const pts = [
    { t: '2022', v: -3.2 },
    { t: '2023', v: -8.1 },
    { t: '2024', v: -5.4 },
    { t: '2025', v: 1.8 },
    { t: '2026', v: 6.6 },
  ]
  const W = 300, H = 170, padL = 26, padR = 24, padT = 12, padB = 24
  const vals = pts.map(p => p.v)
  const min = Math.min(...vals, 0), max = Math.max(...vals, 0)
  const range = max - min || 1
  const x = (i: number) => padL + (i / (pts.length - 1)) * (W - padL - padR)
  const y = (v: number) => padT + (1 - (v - min) / range) * (H - padT - padB)
  const zeroY = y(0)
  const linePts = pts.map((p, i) => `${x(i)},${y(p.v)}`).join(' ')
  const areaPts = `${x(0)},${zeroY} ${linePts} ${x(pts.length - 1)},${zeroY}`

  return (
    <svg viewBox={`0 0 ${W} ${H}`} width="100%" style={{ display: 'block' }}>
      <defs>
        <linearGradient id="jcurve-pos" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor="#10B981" stopOpacity="0.28" />
          <stop offset="100%" stopColor="#10B981" stopOpacity="0" />
        </linearGradient>
      </defs>
      {/* zero line */}
      <line x1={padL} y1={zeroY} x2={W - padR} y2={zeroY} stroke="#E5E7EB" strokeWidth="1" />
      <text x={padL - 5} y={zeroY + 3} textAnchor="end" fontSize="9" fill="#9CA3AF">0</text>
      <polygon points={areaPts} fill="url(#jcurve-pos)" />
      <polyline points={linePts} fill="none" stroke="var(--accent)" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" />
      {pts.map((p, i) => (
        <g key={i}>
          <circle cx={x(i)} cy={y(p.v)} r="3" fill="white" stroke="var(--accent)" strokeWidth="2" />
          <text x={x(i)} y={H - 8} textAnchor="middle" fontSize="9.5" fill="#6B7280">{p.t}</text>
        </g>
      ))}
      {/* breakeven marker */}
      <text x={x(3)} y={y(1.8) - 8} textAnchor="middle" fontSize="9" fontWeight="700" fill="#10B981">Breakeven</text>
    </svg>
  )
}

// ── Allocation donut ─────────────────────────────────────────────────────────

function AllocationDonut() {
  // Share of fund gross value by sector
  const slices = [
    { label: 'B2B Services', value: 33, color: '#1E3A5F' },
    { label: 'F&B Distribution', value: 28, color: '#5B82BD' },
    { label: 'Manufacturing', value: 23, color: '#10B981' },
    { label: 'Specialty Mfg', value: 16, color: '#F59E0B' },
  ]
  const total = slices.reduce((a, s) => a + s.value, 0)
  const R = 52, stroke = 20, C = 2 * Math.PI * R
  let offset = 0

  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: 18, flexWrap: 'wrap' }}>
      <svg width="132" height="132" viewBox="0 0 132 132" style={{ flexShrink: 0 }}>
        <g transform="rotate(-90 66 66)">
          {slices.map((s, i) => {
            const frac = s.value / total
            const dash = frac * C
            const seg = (
              <circle key={i} cx="66" cy="66" r={R} fill="none" stroke={s.color} strokeWidth={stroke}
                strokeDasharray={`${dash} ${C - dash}`} strokeDashoffset={-offset} />
            )
            offset += dash
            return seg
          })}
        </g>
        <text x="66" y="62" textAnchor="middle" fontSize="13" fontWeight="700" fill="var(--text)">£23.5M</text>
        <text x="66" y="76" textAnchor="middle" fontSize="9" fill="#9CA3AF">gross value</text>
      </svg>
      <div style={{ display: 'flex', flexDirection: 'column', gap: 8, minWidth: 130 }}>
        {slices.map(s => (
          <div key={s.label} style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
            <span style={{ width: 10, height: 10, borderRadius: 3, background: s.color, flexShrink: 0 }} />
            <span style={{ fontSize: 12, color: 'var(--text)', flex: 1 }}>{s.label}</span>
            <span style={{ fontSize: 12, fontWeight: 700, color: 'var(--text)' }}>{s.value}%</span>
          </div>
        ))}
      </div>
    </div>
  )
}

// ── Count-up hook ────────────────────────────────────────────────────────────

function useCountUp(target: number, duration = 1000, decimals = 0) {
  const [value, setValue] = useState(0)
  useEffect(() => {
    let raf = 0
    const start = performance.now()
    const tick = (now: number) => {
      const p = Math.min((now - start) / duration, 1)
      const eased = 1 - Math.pow(1 - p, 3) // ease-out cubic
      setValue(target * eased)
      if (p < 1) raf = requestAnimationFrame(tick)
      else setValue(target)
    }
    raf = requestAnimationFrame(tick)
    return () => cancelAnimationFrame(raf)
  }, [target, duration])
  void decimals
  return value
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
