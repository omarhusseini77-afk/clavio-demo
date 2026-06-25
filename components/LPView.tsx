'use client'
import { useState, useEffect } from 'react'
import type { Quarter } from '@/lib/supabase'
import type { Currency } from '@/lib/currency'
import { fmtM, fmtFull } from '@/lib/currency'
import { FUND, COMPANIES, DOCUMENTS, CAPITAL_EVENTS, FORECAST } from '@/lib/fundData'
import { useCountUp } from '@/lib/useCountUp'
import { useLang, loc } from '@/lib/i18n'
import AskPanel from './AskPanel'
import BottomTabBar from './BottomTabBar'

const LP_TABS = [
  {
    id: 'account', label: 'Overview',
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
    id: 'settings', label: 'Settings',
    icon: <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"><circle cx="12" cy="12" r="3"/><path d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 0 1-2.83 2.83l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 0 1-4 0v-.09A1.65 1.65 0 0 0 9 19.4a1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 0 1-2.83-2.83l.06-.06A1.65 1.65 0 0 0 4.68 15a1.65 1.65 0 0 0-1.51-1H3a2 2 0 0 1 0-4h.09A1.65 1.65 0 0 0 4.6 9a1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 0 1 2.83-2.83l.06.06A1.65 1.65 0 0 0 9 4.68a1.65 1.65 0 0 0 1-1.51V3a2 2 0 0 1 4 0v.09a1.65 1.65 0 0 0 1 1.51 1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 0 1 2.83 2.83l-.06.06A1.65 1.65 0 0 0 19.4 9a1.65 1.65 0 0 0 1.51 1H21a2 2 0 0 1 0 4h-.09a1.65 1.65 0 0 0-1.51 1z"/></svg>,
  },
]

// ── Main component ───────────────────────────────────────────────────────────

type Tab = 'account' | 'ask' | 'performance' | 'portfolio' | 'settings'

export default function LPView({ quarters, currency, isMobile }: { quarters: Quarter[]; currency: Currency; isMobile?: boolean }) {
  const { t, lang } = useLang()
  const [tab, setTab] = useState<Tab>('account')
  const [selectedCompany, setSelectedCompany] = useState(COMPANIES[0].id)
  void quarters // kept for future real-data integration
  const fundDate = loc(FUND.date, lang)

  const changeTab = (t: Tab) => {
    setTab(t)
    window.scrollTo({ top: 0, behavior: 'smooth' })
  }

  return (
    <div style={{ maxWidth: 900, margin: '0 auto', paddingBottom: isMobile ? 'calc(72px + env(safe-area-inset-bottom))' : 0 }}>
      {/* Page header — hide on mobile since bottom bar shows context */}
      {!isMobile && (
        <div style={{ marginBottom: 24 }}>
          <h1 style={{ fontSize: 22, fontWeight: 700, letterSpacing: '-0.3px' }}>{t('lp.section.account')}</h1>
          <p style={{ fontSize: 13, color: 'var(--text-muted)', marginTop: 3 }}>{t('lp.asAt', { name: FUND.name, date: fundDate })}</p>
        </div>
      )}

      {/* Desktop tabs */}
      {!isMobile && (
        <div style={{ display: 'flex', gap: 6, marginBottom: 24, borderBottom: '1px solid var(--border)', paddingBottom: 0 }}>
          {(['account', 'ask', 'performance', 'portfolio', 'settings'] as Tab[]).map(id => {
            const isAsk = id === 'ask'
            const active = tab === id
            return (
              <button
                key={id}
                onClick={() => changeTab(id)}
                style={{
                  padding: '8px 16px', fontSize: 13, fontWeight: active || isAsk ? 600 : 400,
                  border: 'none', cursor: 'pointer', borderRadius: '8px 8px 0 0',
                  background: active ? 'var(--navy)' : 'transparent',
                  color: active ? 'white' : isAsk ? 'var(--accent)' : 'var(--text-muted)',
                  borderBottom: active ? '2px solid var(--navy)' : '2px solid transparent',
                  marginBottom: -1,
                }}
              >
                {t(`lp.tab.${id}`)}
              </button>
            )
          })}
        </div>
      )}

      {/* Mobile section header */}
      {isMobile && (
        <div style={{ marginBottom: 20 }}>
          <h2 style={{ fontSize: 18, fontWeight: 700, letterSpacing: '-0.2px' }}>{t(`lp.section.${tab}`)}</h2>
          <p style={{ fontSize: 12, color: 'var(--text-muted)', marginTop: 2 }}>{t('lp.nameDate', { name: FUND.name, date: fundDate })}</p>
        </div>
      )}

      {tab === 'account' && <AccountTab currency={currency} goToPerformance={() => changeTab('performance')} goToAsk={() => changeTab('ask')} />}
      {tab === 'ask' && <AskTab isMobile={isMobile} />}
      {tab === 'performance' && <PerformanceTab />}
      {tab === 'portfolio' && <PortfolioTab selectedCompany={selectedCompany} setSelectedCompany={setSelectedCompany} />}
      {tab === 'settings' && <SettingsTab />}

      {/* Mobile bottom tab bar */}
      {isMobile && (
        <BottomTabBar
          tabs={LP_TABS.map(tab => ({ ...tab, label: t(`lp.mtab.${tab.id}`) }))}
          activeTab={tab}
          onTabChange={id => changeTab(id as Tab)}
        />
      )}
    </div>
  )
}

// ── My Account tab ───────────────────────────────────────────────────────────

function AccountTab({ currency, goToPerformance, goToAsk }: { currency: Currency; goToPerformance: () => void; goToAsk: () => void }) {
  const { t, lang } = useLang()
  const calledPct = (FUND.called / FUND.commitment) * 100
  const navCount = useCountUp(FUND.nav)
  const tvpiCount = useCountUp(FUND.tvpi)
  const dpiCount = useCountUp(FUND.dpi)

  return (
    <div>
      {/* Hero position card — gradient + animated count-up */}
      <div style={{
        borderRadius: 14, marginBottom: 10, padding: '22px 24px',
        background: 'linear-gradient(135deg, #0A0E1A 0%, #16233E 55%, #1E3A5F 100%)',
        color: 'white', position: 'relative', overflow: 'hidden',
        boxShadow: '0 14px 34px -16px rgba(10,14,26,0.6)',
      }}>
        <div style={{ position: 'absolute', top: -40, right: -30, width: 180, height: 180, borderRadius: '50%', background: 'radial-gradient(circle, rgba(91,130,189,0.35), transparent 70%)' }} />
        <div style={{ fontSize: 11, fontWeight: 600, color: 'rgba(255,255,255,0.55)', letterSpacing: '0.08em', textTransform: 'uppercase', marginBottom: 4 }}>{t('lp.yourPosition', { name: FUND.name })}</div>
        <div style={{ display: 'flex', alignItems: 'baseline', gap: 10, marginBottom: 18, position: 'relative' }}>
          <div style={{ fontSize: 38, fontWeight: 800, letterSpacing: '-0.5px' }}>{fmtM(navCount, currency)}</div>
          <div style={{ fontSize: 13, color: '#7FE6B0', fontWeight: 600 }}>▲ {t('lp.netSuffix', { x: FUND.tvpi })}</div>
        </div>
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr 1fr', gap: 0, position: 'relative' }}>
          {[
            { label: t('lp.tvpi'), value: `${tvpiCount.toFixed(2)}x` },
            { label: t('lp.dpi'), value: `${dpiCount.toFixed(2)}x` },
            { label: 'NET IRR', value: `${FUND.irr}%` },
            { label: t('lp.fundShare'), value: `${FUND.shareOfFund}%` },
          ].map((s, i) => (
            <div key={s.label} style={{
              paddingRight: i < 3 ? 12 : 0,
              borderRight: i < 3 ? '1px solid rgba(255,255,255,0.12)' : 'none',
              paddingLeft: i > 0 ? 12 : 0,
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
        className="lift"
        style={{
          width: '100%', textAlign: 'left', marginBottom: 10, cursor: 'pointer',
          borderRadius: 12, padding: '13px 16px', border: '1px solid #D7E2F2',
          background: 'linear-gradient(90deg, #F4F8FE, #FFFFFF)',
          display: 'flex', alignItems: 'center', gap: 12,
        }}
      >
        <span style={{ width: 34, height: 34, borderRadius: 9, flexShrink: 0, background: 'var(--accent)', color: 'white', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 16 }}>✦</span>
        <span style={{ flex: 1, minWidth: 0 }}>
          <span style={{ display: 'block', fontSize: 13, fontWeight: 600, color: 'var(--text)' }}>{t('lp.askPromptTitle')}</span>
          <span style={{ display: 'block', fontSize: 12, color: 'var(--text-muted)' }}>{t('lp.askPromptSub')}</span>
        </span>
        <span style={{ fontSize: 18, color: 'var(--accent)', flexShrink: 0 }}>→</span>
      </button>

      {/* Capital called progress */}
      <div style={{ ...styles.card, marginBottom: 10 }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 8 }}>
          <span style={{ fontSize: 11, fontWeight: 700, color: 'var(--accent)', letterSpacing: '0.07em', textTransform: 'uppercase' }}>{t('lp.capitalCalled')}</span>
          <span style={{ fontSize: 12, color: 'var(--text-muted)' }}>{t('lp.ofCommitment', { pct: calledPct.toFixed(0) })}</span>
        </div>
        <div style={{ background: '#F3F4F6', borderRadius: 4, height: 6, marginBottom: 8 }}>
          <div style={{ background: 'var(--accent)', borderRadius: 4, height: 6, width: `${calledPct}%` }} />
        </div>
        <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 12 }}>
          <span style={{ fontWeight: 500 }}>{t('lp.called', { amount: fmtM(FUND.called, currency) })}</span>
          <span style={{ color: 'var(--text-muted)' }}>{t('lp.remaining', { amount: fmtM(FUND.unfunded, currency) })}</span>
        </div>
      </div>

      {/* 6 KPIs in a tight 3-column grid */}
      <div style={{ ...styles.card, marginBottom: 10, padding: '14px 16px' }}>
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: '16px 12px' }}>
          {[
            { label: t('lp.kpi.commitment'), value: fmtM(FUND.commitment, currency) },
            { label: t('lp.kpi.called'), value: fmtM(FUND.called, currency) },
            { label: t('lp.kpi.unfunded'), value: fmtM(FUND.unfunded, currency) },
            { label: t('lp.kpi.distributed'), value: fmtM(FUND.distributed, currency) },
            { label: t('lp.kpi.currentNav'), value: fmtM(FUND.nav, currency) },
            { label: t('lp.kpi.fundShare'), value: `${FUND.shareOfFund}%` },
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
          {t('lp.letter')}
        </div>
        <p style={{ fontSize: 13, lineHeight: 1.7, color: '#374151', marginBottom: 10 }}>{t('lp.letter.p1')}</p>
        <p style={{ fontSize: 13, lineHeight: 1.7, color: '#374151', marginBottom: 10 }}>{t('lp.letter.p2')}</p>
        <p style={{ fontSize: 13, lineHeight: 1.7, color: '#374151' }}>{t('lp.letter.p3')}</p>
      </div>

      <button
        onClick={goToPerformance}
        style={{ background: 'var(--accent)', color: 'white', border: 'none', borderRadius: 10, padding: '12px 24px', fontSize: 14, fontWeight: 600, cursor: 'pointer', marginBottom: 24 }}
      >
        {t('lp.viewPerformance')}
      </button>

      {/* Documents — compact list */}
      <div style={{ fontSize: 11, fontWeight: 700, color: 'var(--accent)', letterSpacing: '0.08em', textTransform: 'uppercase', marginBottom: 10 }}>Documents</div>
      <div style={{ ...styles.card, padding: 0, overflow: 'hidden', marginBottom: 40 }}>
        {DOCUMENTS.slice(0, 5).map((doc, i) => (
          <div key={doc.title.en} style={{ display: 'flex', alignItems: 'center', gap: 12, padding: '13px 16px', borderBottom: i < 4 ? '1px solid #F3F4F6' : 'none' }}>
            <div style={{
              width: 30, height: 30, borderRadius: 7, flexShrink: 0,
              background: doc.typeKey === 'Notice' ? '#FEF3C7' : '#F3F4F6',
              display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 12,
            }}>
              {doc.typeKey === 'Notice' ? '!' : '≡'}
            </div>
            <div style={{ flex: 1, minWidth: 0 }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                <span style={{ fontSize: 13, fontWeight: 500 }}>{loc(doc.title, lang)}</span>
                {doc.isNew && <span style={{ fontSize: 9, fontWeight: 700, background: '#ECFDF5', color: '#065F46', padding: '2px 6px', borderRadius: 20 }}>NEW</span>}
              </div>
              <div style={{ fontSize: 11.5, color: 'var(--text-muted)', marginTop: 1 }}>{loc(doc.type, lang)} · {doc.date}</div>
            </div>
            <span style={{ fontSize: 18, color: '#D1D5DB', cursor: 'pointer' }}>↓</span>
          </div>
        ))}
      </div>
    </div>
  )
}

// ── Cash-flow forecast strip ─────────────────────────────────────────────────

function ForecastStrip({ currency }: { currency: Currency }) {
  const { t, lang } = useLang()
  return (
    <div style={{ ...styles.card, marginBottom: 10, borderLeft: '3px solid var(--accent)' }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 14 }}>
        <span style={{ fontSize: 11, fontWeight: 700, color: 'var(--accent)', letterSpacing: '0.08em', textTransform: 'uppercase' }}>{t('lp.forecast')}</span>
        <span style={{ fontSize: 10, fontWeight: 700, background: 'var(--accent)', color: 'white', padding: '2px 7px', borderRadius: 20 }}>{t('lp.projected')}</span>
      </div>
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(150px, 1fr))', gap: 14 }}>
        <ForecastItem
          dir="out"
          label={t('lp.nextCall')}
          amount={`~${fmtM(FORECAST.nextCall.amount, currency)}`}
          period={loc(FORECAST.nextCall.period, lang)}
          note={loc(FORECAST.nextCall.note, lang)}
        />
        <ForecastItem
          dir="in"
          label={t('lp.nextDist')}
          amount={`~${fmtM(FORECAST.nextDistribution.amount, currency)}`}
          period={loc(FORECAST.nextDistribution.period, lang)}
          note={loc(FORECAST.nextDistribution.note, lang)}
        />
        <ForecastItem
          dir="in"
          label={t('lp.dist18m')}
          amount={`~${fmtM(FORECAST.projectedDistributions18m, currency)}`}
          period={loc(FORECAST.through, lang)}
          note={loc({ en: "Based on the fund's realisation plan", fr: 'Selon le plan de réalisation du fonds' }, lang)}
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
  const { t, lang } = useLang()
  // Most recent first
  const events = [...CAPITAL_EVENTS].reverse()
  return (
    <div style={{ ...styles.card, marginBottom: 10 }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'baseline', marginBottom: 16, flexWrap: 'wrap', gap: 6 }}>
        <span style={{ fontSize: 11, fontWeight: 700, color: 'var(--accent)', letterSpacing: '0.08em', textTransform: 'uppercase' }}>{t('lp.activity')}</span>
        <span style={{ fontSize: 12, color: 'var(--text-muted)' }}>
          {t('lp.activitySummary', { called: fmtM(FUND.called, currency), distributed: fmtM(FUND.distributed, currency) })}
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
                  <div style={{ fontSize: 13, fontWeight: 600, color: 'var(--text)', lineHeight: 1.35 }}>{loc(e.label, lang)}</div>
                  <div style={{ fontSize: 12, color: 'var(--text-muted)', marginTop: 1 }}>{loc(e.date, lang)}</div>
                </div>
                <div style={{ textAlign: 'right', flexShrink: 0 }}>
                  <div style={{ fontSize: 14, fontWeight: 700, color: isCall ? 'var(--text)' : '#0F7B4F' }}>
                    {isCall ? '−' : '+'}{fmtM(e.amount, currency)}
                  </div>
                  <div style={{ fontSize: 10.5, fontWeight: 600, color: 'var(--text-muted)', letterSpacing: '0.04em', textTransform: 'uppercase' }}>
                    {isCall ? t('lp.calledTag') : t('lp.distributedTag')}
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

function CompanyModal({ co, onClose }: { co: typeof COMPANIES[0]; onClose: () => void }) {
  const { t, lang } = useLang()
  const [notes, setNotes] = useState('')
  return (
    <div
      onClick={onClose}
      style={{
        position: 'fixed', inset: 0, background: 'rgba(10,14,26,0.55)', zIndex: 1000,
        display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 20,
      }}
    >
      <div
        onClick={e => e.stopPropagation()}
        style={{
          background: 'white', borderRadius: 16, width: '100%', maxWidth: 560,
          maxHeight: '85vh', overflowY: 'auto', boxShadow: '0 24px 64px rgba(10,14,26,0.3)',
        }}
      >
        {/* Header */}
        <div style={{ padding: '20px 24px', borderBottom: '1px solid var(--border)', display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
          <div>
            <div style={{ fontSize: 18, fontWeight: 700, marginBottom: 2 }}>{co.name}</div>
            <div style={{ fontSize: 12, color: 'var(--text-muted)' }}>{loc(co.sector, lang)} · {loc(co.country, lang)}</div>
          </div>
          <button onClick={onClose} style={{ border: 'none', background: 'none', cursor: 'pointer', fontSize: 20, color: 'var(--text-muted)', lineHeight: 1 }}>×</button>
        </div>

        <div style={{ padding: '20px 24px' }}>
          {/* Key metrics */}
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr 1fr', gap: 12, marginBottom: 20 }}>
            {[
              { label: 'MOIC', value: `${co.moic}x`, accent: true },
              { label: t('lp.co.irr'), value: `${co.irr}%`, accent: false },
              { label: t('lp.co.ownership'), value: `${co.ownership}%`, accent: false },
              { label: 'EV/EBITDA', value: `${co.evEbitda}x`, accent: false },
            ].map(m => (
              <div key={m.label} style={{ background: '#F8F9FC', borderRadius: 10, padding: '12px 14px' }}>
                <div style={{ fontSize: 9.5, fontWeight: 600, color: 'var(--text-muted)', letterSpacing: '0.06em', textTransform: 'uppercase', marginBottom: 4 }}>{m.label}</div>
                <div style={{ fontSize: 17, fontWeight: 700, color: m.accent ? 'var(--accent)' : 'var(--text)' }}>{m.value}</div>
              </div>
            ))}
          </div>

          {/* Signals */}
          <div style={{ marginBottom: 16 }}>
            <div style={{ fontSize: 10, fontWeight: 700, color: 'var(--accent)', letterSpacing: '0.1em', textTransform: 'uppercase', marginBottom: 10 }}>Signals</div>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
              {[
                { label: 'Revenue trend', value: '+8.1% YoY', positive: true },
                { label: 'EBITDA margin', value: `${((co.data[co.data.length-1].ebitda / co.data[co.data.length-1].revenue) * 100).toFixed(1)}%`, positive: true },
                { label: 'Cash cover', value: '14.2 months', positive: true },
                { label: 'Status', value: co.status === 'green' ? 'On plan' : 'On watch', positive: co.status === 'green' },
              ].map(s => (
                <div key={s.label} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '8px 12px', background: '#F8F9FC', borderRadius: 8 }}>
                  <span style={{ fontSize: 12.5, color: 'var(--text-muted)' }}>{s.label}</span>
                  <span style={{ fontSize: 13, fontWeight: 600, color: s.positive ? '#10B981' : '#F59E0B' }}>{s.value}</span>
                </div>
              ))}
            </div>
          </div>

          {/* AI commentary */}
          <div style={{ marginBottom: 16, background: '#F0F5FF', border: '1px solid #BFDBFE', borderLeft: '3px solid var(--accent)', borderRadius: 10, padding: '14px 16px' }}>
            <div style={{ fontSize: 10, fontWeight: 700, color: 'var(--accent)', letterSpacing: '0.1em', textTransform: 'uppercase', marginBottom: 8 }}>AI Analysis</div>
            <p style={{ fontSize: 13, lineHeight: 1.7, color: '#1E3A5F', margin: 0 }}>{loc(co.commentary, lang)}</p>
          </div>

          {/* Notes */}
          <div>
            <div style={{ fontSize: 10, fontWeight: 700, color: 'var(--accent)', letterSpacing: '0.1em', textTransform: 'uppercase', marginBottom: 8 }}>Notes</div>
            <textarea
              value={notes}
              onChange={e => setNotes(e.target.value)}
              placeholder="Add your own notes on this company..."
              style={{
                width: '100%', minHeight: 80, padding: '10px 12px', borderRadius: 8,
                border: '1px solid var(--border)', fontSize: 13, fontFamily: 'inherit',
                resize: 'vertical', outline: 'none', color: 'var(--text)', background: 'white',
              }}
            />
          </div>
        </div>
      </div>
    </div>
  )
}

function PerformanceTab() {
  const { t, lang } = useLang()
  const [activeCompany, setActiveCompany] = useState<typeof COMPANIES[0] | null>(null)
  return (
    <div>
      {/* Header metrics */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 20, flexWrap: 'wrap', gap: 12 }}>
        <div className="hide-mobile">
          <h2 style={{ fontSize: 20, fontWeight: 700 }}>{t('lp.section.performance')}</h2>
          <p style={{ fontSize: 13, color: 'var(--text-muted)', marginTop: 2 }}>{FUND.name} · {FUND.period}</p>
        </div>
        <div style={{ display: 'flex', gap: 28, textAlign: 'right' }}>
          {[
            { label: t('lp.invested'), value: '£16.90M' },
            { label: t('lp.currentValue'), value: '£23.50M' },
            { label: t('lp.fundMoic'), value: '1.39x', accent: true },
          ].map(m => (
            <div key={m.label}>
              <div style={{ fontSize: 11, fontWeight: 600, color: 'var(--text-muted)', letterSpacing: '0.06em', textTransform: 'uppercase', marginBottom: 4 }}>{m.label}</div>
              <div style={{ fontSize: 20, fontWeight: 700, color: m.accent ? 'var(--accent)' : 'var(--text)' }}>{m.value}</div>
            </div>
          ))}
        </div>
      </div>

      {/* Stat cards */}
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10, marginBottom: 24 }}>
        {[
          { label: t('lp.stat.netIrr'), value: `${FUND.irr}%`, color: 'var(--accent)' },
          { label: t('lp.stat.grossIrr'), value: `${FUND.grossIrr}%`, color: 'var(--accent)' },
          { label: t('lp.stat.rvpi'), value: `${FUND.rvpi}x`, color: 'var(--text)' },
          { label: t('lp.stat.revGrowth'), value: '+8.1%', color: 'var(--green)' },
          { label: t('lp.stat.gmargin'), value: '35.4%', color: 'var(--text)' },
          { label: t('lp.stat.ebitdaGrowth'), value: '+11.2%', color: 'var(--green)' },
          { label: t('lp.stat.abovePlan'), value: t('lp.stat.of4', { n: 2 }), color: 'var(--green)' },
          { label: t('lp.stat.onWatch'), value: t('lp.stat.of4', { n: 2 }), color: '#F59E0B' },
          { label: t('lp.stat.cashCover'), value: t('lp.stat.months', { n: '14.2' }), color: 'var(--green)' },
          { label: t('lp.stat.lossRatio'), value: t('lp.stat.of4', { n: 0 }), color: 'var(--green)' },
        ].map(s => (
          <div key={s.label} style={{ ...styles.card, padding: '14px 16px' }}>
            <div style={{ fontSize: 11.5, color: 'var(--text-muted)', marginBottom: 8, lineHeight: 1.4 }}>{s.label}</div>
            <div style={{ fontSize: 22, fontWeight: 700, color: s.color }}>{s.value}</div>
          </div>
        ))}
      </div>

      {/* Value creation bridge */}
      <div style={{ ...styles.card, marginBottom: 12 }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'baseline', marginBottom: 4, flexWrap: 'wrap', gap: 6 }}>
          <div style={{ fontSize: 11, fontWeight: 700, color: 'var(--accent)', letterSpacing: '0.08em', textTransform: 'uppercase' }}>{t('lp.bridge')}</div>
          <div style={{ fontSize: 12, color: 'var(--text-muted)' }}>{t('lp.bridgeSub')}</div>
        </div>
        <p style={{ fontSize: 12.5, color: 'var(--text-muted)', marginBottom: 16, lineHeight: 1.5 }}>
          {t('lp.bridgeDesc')}
        </p>
        <ValueBridge />
      </div>

      {/* J-curve + allocation row */}
      <div className="gp-trend-grid" style={{ marginBottom: 24 }}>
        <div style={styles.card}>
          <div style={{ fontSize: 11, fontWeight: 700, color: 'var(--accent)', letterSpacing: '0.08em', textTransform: 'uppercase', marginBottom: 4 }}>{t('lp.jcurve')}</div>
          <p style={{ fontSize: 12.5, color: 'var(--text-muted)', marginBottom: 14, lineHeight: 1.5 }}>
            {t('lp.jcurveDesc')}
          </p>
          <JCurve />
        </div>
        <div style={styles.card}>
          <div style={{ fontSize: 11, fontWeight: 700, color: 'var(--accent)', letterSpacing: '0.08em', textTransform: 'uppercase', marginBottom: 14 }}>{t('lp.allocation')}</div>
          <AllocationDonut />
        </div>
      </div>

      {/* Portfolio companies grid */}
      <div style={{ fontSize: 11, fontWeight: 700, color: 'var(--accent)', letterSpacing: '0.08em', textTransform: 'uppercase', marginBottom: 12 }}>{t('lp.portfolioCompanies')}</div>
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(340px, 1fr))', gap: 12, marginBottom: 40 }}>
        {COMPANIES.map(co => (
          <div key={co.id} style={{ ...styles.card, cursor: 'pointer' }} onClick={() => setActiveCompany(co)}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 14 }}>
              <div>
                <div style={{ fontSize: 15, fontWeight: 700, marginBottom: 3 }}>{co.name}</div>
                <div style={{ fontSize: 12, color: 'var(--text-muted)' }}>{loc(co.sector, lang)} · {loc(co.country, lang)}</div>
              </div>
              <div style={{ width: 10, height: 10, borderRadius: '50%', background: co.status === 'green' ? '#10B981' : '#F59E0B', marginTop: 4, flexShrink: 0 }} />
            </div>
            <div style={{ display: 'flex', gap: 16, marginBottom: 10, flexWrap: 'wrap' }}>
              {[
                { label: t('lp.moic'), value: `${co.moic}x` },
                { label: t('lp.co.irr'), value: `${co.irr}%` },
                { label: t('lp.co.ownership'), value: `${co.ownership}%` },
                { label: t('lp.co.evEbitda'), value: `${co.evEbitda}x` },
              ].map(m => (
                <div key={m.label}>
                  <div style={{ fontSize: 9.5, fontWeight: 600, color: 'var(--text-muted)', letterSpacing: '0.06em', textTransform: 'uppercase', marginBottom: 3 }}>{m.label}</div>
                  <div style={{ fontSize: 15, fontWeight: 700 }}>{m.value}</div>
                </div>
              ))}
            </div>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-end' }}>
              <div style={{ display: 'flex', gap: 16 }}>
                <div>
                  <div style={{ fontSize: 9.5, fontWeight: 600, color: 'var(--text-muted)', letterSpacing: '0.06em', textTransform: 'uppercase', marginBottom: 3 }}>{t('lp.revenue')}</div>
                  <div style={{ fontSize: 14, fontWeight: 700 }}>{co.sym}{(co.revenue / 1_000_000).toFixed(2)}M</div>
                </div>
                <div>
                  <div style={{ fontSize: 9.5, fontWeight: 600, color: 'var(--text-muted)', letterSpacing: '0.06em', textTransform: 'uppercase', marginBottom: 3 }}>{t('lp.co.investmentDate')}</div>
                  <div style={{ fontSize: 14, fontWeight: 600, color: 'var(--text-muted)' }}>{co.investmentDate}</div>
                </div>
              </div>
              <Sparkline
                data={co.trend}
                color={co.status === 'green' ? '#10B981' : '#F59E0B'}
                startLabel={`${co.sym}${(co.trend[0] / 1_000_000).toFixed(1)}M`}
                endLabel={`${co.sym}${(co.trend[co.trend.length - 1] / 1_000_000).toFixed(1)}M`}
                width={100} height={48}
              />
              <div style={{ marginTop: 8, fontSize: 11, color: 'var(--text-muted)', textAlign: 'right' }}>Tap for details →</div>
            </div>
          </div>
        ))}
      </div>
      {activeCompany && <CompanyModal co={activeCompany} onClose={() => setActiveCompany(null)} />}
    </div>
  )
}

// ── Portfolio tab ────────────────────────────────────────────────────────────

function PortfolioTab({ selectedCompany, setSelectedCompany }: { selectedCompany: string; setSelectedCompany: (id: string) => void }) {
  const { t, lang } = useLang()
  const co = COMPANIES.find(c => c.id === selectedCompany)!
  const latest = co.data[co.data.length - 1]
  void latest

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
      <div style={{ marginBottom: 20 }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', flexWrap: 'wrap', gap: 8, marginBottom: 14 }}>
          <div>
            <h2 style={{ fontSize: 20, fontWeight: 700 }}>{co.name}</h2>
            <p style={{ fontSize: 13, color: 'var(--text-muted)', marginTop: 2 }}>{loc(co.sector, lang)} · {loc(co.country, lang)}</p>
          </div>
          <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
            <div style={{ width: 8, height: 8, borderRadius: '50%', background: co.status === 'green' ? '#10B981' : '#F59E0B' }} />
            <span style={{ fontSize: 12, color: co.status === 'green' ? '#10B981' : '#F59E0B', fontWeight: 600 }}>{co.status === 'green' ? 'On plan' : 'On watch'}</span>
          </div>
        </div>
        <div style={{ display: 'flex', gap: 20, flexWrap: 'wrap' }}>
          {[
            { label: t('lp.moic'), value: `${co.moic}x`, accent: true },
            { label: t('lp.co.irr'), value: `${co.irr}%`, accent: false },
            { label: t('lp.co.evEbitda'), value: `${co.evEbitda}x`, accent: false },
            { label: t('lp.co.ownership'), value: `${co.ownership}%`, accent: false },
            { label: t('lp.co.cost'), value: `${co.sym} ${(co.cost / 1_000_000).toFixed(1)}M`, accent: false },
            { label: t('lp.co.investmentDate'), value: co.investmentDate, accent: false },
          ].map(m => (
            <div key={m.label}>
              <div style={{ fontSize: 10, fontWeight: 600, color: 'var(--text-muted)', letterSpacing: '0.06em', textTransform: 'uppercase', marginBottom: 4 }}>{m.label}</div>
              <div style={{ fontSize: 17, fontWeight: 700, color: m.accent ? 'var(--accent)' : 'var(--text)' }}>{m.value}</div>
            </div>
          ))}
        </div>
      </div>

      {/* Metrics table */}
      <div style={{ ...styles.card, marginBottom: 16, padding: 0, overflow: 'hidden' }}>
        <div style={{ overflowX: 'auto' }}>
          <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 12 }}>
            <thead>
              <tr style={{ borderBottom: '1px solid var(--border)' }}>
                <th style={{ textAlign: 'left', padding: '9px 12px', fontSize: 10, fontWeight: 600, color: 'var(--text-muted)', letterSpacing: '0.06em', textTransform: 'uppercase' }}>{t('lp.metric')}</th>
                {co.data.map(d => (
                  <th key={d.fy} style={{ textAlign: 'right', padding: '9px 12px', fontSize: 10, fontWeight: 600, color: 'var(--text-muted)', letterSpacing: '0.06em', textTransform: 'uppercase' }}>{d.fy}</th>
                ))}
                <th className="hide-mobile" style={{ textAlign: 'right', padding: '9px 12px', fontSize: 10, fontWeight: 600, color: 'var(--text-muted)', letterSpacing: '0.06em', textTransform: 'uppercase' }}>{t('lp.trend')}</th>
              </tr>
            </thead>
            <tbody>
              {[
                { label: t('lp.m.revenue'), values: co.data.map(d => `${co.sym} ${(d.revenue / 1_000_000).toFixed(2)}M`), trend: co.data.map(d => d.revenue), color: '#10B981' },
                { label: t('lp.m.revenueGrowth'), values: co.data.map((d, i) => i === 0 ? '—' : `${(((d.revenue - co.data[i-1].revenue) / co.data[i-1].revenue) * 100).toFixed(1)}%`), trend: co.data.map((d, i) => i === 0 ? 0 : ((d.revenue - co.data[i-1].revenue) / co.data[i-1].revenue) * 100), color: '#10B981' },
                { label: t('lp.m.gmargin'), values: co.data.map(d => `${d.grossMargin}%`), trend: co.data.map(d => d.grossMargin), color: '#10B981' },
                { label: t('lp.m.ebitda'), values: co.data.map(d => `${co.sym} ${(d.ebitda / 1000).toFixed(0)}k`), trend: co.data.map(d => d.ebitda), color: '#10B981' },
                { label: t('lp.m.ebitdaMargin'), values: co.data.map(d => `${((d.ebitda / d.revenue) * 100).toFixed(1)}%`), trend: co.data.map(d => (d.ebitda / d.revenue) * 100), color: '#10B981' },
                { label: t('lp.m.netProfit'), values: co.data.map(d => `${co.sym} ${(d.netProfit / 1000).toFixed(0)}k`), trend: co.data.map(d => d.netProfit), color: '#10B981' },
                { label: t('lp.m.cash'), values: co.data.map(d => `${co.sym} ${(d.cash / 1_000_000).toFixed(2)}M`), trend: co.data.map(d => d.cash), color: '#10B981' },
                { label: t('lp.m.netDebt'), values: co.data.map(d => `${co.sym} ${((d.receivables - d.cash) / 1000).toFixed(0)}k`), trend: co.data.map(d => d.receivables - d.cash), color: '#F59E0B' },
                { label: t('lp.m.receivables'), values: co.data.map(d => `${co.sym} ${(d.receivables / 1000).toFixed(0)}k`), trend: co.data.map(d => d.receivables), color: '#F59E0B' },
                { label: t('lp.m.payables'), values: co.data.map(d => `${co.sym} ${(d.payables / 1000).toFixed(0)}k`), trend: co.data.map(d => d.payables), color: '#F59E0B' },
              ].map((row, i) => (
                <tr key={row.label} style={{ borderBottom: '1px solid #F3F4F6', background: i % 2 === 0 ? 'transparent' : '#FAFAFA' }}>
                  <td style={{ padding: '9px 12px', color: 'var(--text-muted)', whiteSpace: 'nowrap', fontSize: 12 }}>{row.label}</td>
                  {row.values.map((v, j) => (
                    <td key={j} style={{ padding: '9px 12px', textAlign: 'right', fontWeight: j === row.values.length - 1 ? 600 : 400, whiteSpace: 'nowrap', fontSize: 12 }}>{v}</td>
                  ))}
                  <td className="hide-mobile" style={{ padding: '6px 12px', textAlign: 'right' }}>
                    <Sparkline data={row.trend} color={row.color} width={64} height={32} />
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* AI Commentary */}
      <div style={{ ...styles.card, marginBottom: 40, borderLeft: '3px solid var(--accent)' }}>
        <div style={{ fontSize: 11, fontWeight: 700, color: 'var(--accent)', letterSpacing: '0.08em', textTransform: 'uppercase', marginBottom: 12 }}>{t('lp.aiCommentary')}</div>
        <p style={{ fontSize: 14, lineHeight: 1.75, color: '#374151' }}>{loc(co.commentary, lang)}</p>
      </div>
    </div>
  )
}

// ── Documents tab ────────────────────────────────────────────────────────────

// ── Settings tab ─────────────────────────────────────────────────────────────

type SettingsView = 'main' | 'change-password' | 'two-factor' | 'privacy' | 'terms' | 'download' | 'signout'

function SettingsBackBar({ title, onBack }: { title: string; onBack: () => void }) {
  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 20 }}>
      <button onClick={onBack} style={{ border: 'none', background: 'none', cursor: 'pointer', padding: '4px 0', display: 'flex', alignItems: 'center', gap: 6, color: 'var(--accent)', fontSize: 15, fontWeight: 600 }}>
        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round"><polyline points="15 18 9 12 15 6"/></svg>
        Settings
      </button>
      <span style={{ color: 'var(--border)', fontSize: 16 }}>·</span>
      <span style={{ fontSize: 16, fontWeight: 700 }}>{title}</span>
    </div>
  )
}

function SettingsTab() {
  const { lang, setLang } = useLang()
  const [view, setView] = useState<SettingsView>('main')

  useEffect(() => { window.scrollTo({ top: 0, behavior: 'instant' as ScrollBehavior }) }, [view])
  const [notifs, setNotifs] = useState({ calls: true, distributions: true, reports: true })
  const [pwForm, setPwForm] = useState({ current: '', next: '', confirm: '' })
  const [pwSaved, setPwSaved] = useState(false)
  const [signoutConfirm, setSignoutConfirm] = useState(false)
  const [downloaded, setDownloaded] = useState(false)
  const [twoFAEnabled, setTwoFAEnabled] = useState(false)

  if (view === 'change-password') return (
    <div>
      <SettingsBackBar title="Change Password" onBack={() => { setView('main'); setPwSaved(false) }} />
      <div style={{ ...styles.card, marginBottom: 16 }}>
        {pwSaved ? (
          <div style={{ textAlign: 'center', padding: '24px 0' }}>
            <div style={{ fontSize: 36, marginBottom: 10 }}>✓</div>
            <div style={{ fontSize: 15, fontWeight: 600, color: '#10B981' }}>Password updated</div>
            <div style={{ fontSize: 13, color: 'var(--text-muted)', marginTop: 4 }}>You can now sign in with your new password.</div>
          </div>
        ) : (
          <>
            {[
              { label: 'Current password', key: 'current' as const },
              { label: 'New password', key: 'next' as const },
              { label: 'Confirm new password', key: 'confirm' as const },
            ].map((f, i) => (
              <div key={f.key} style={{ marginBottom: i < 2 ? 14 : 0 }}>
                <div style={{ fontSize: 12, fontWeight: 600, color: 'var(--text-muted)', marginBottom: 6 }}>{f.label}</div>
                <input
                  type="password"
                  value={pwForm[f.key]}
                  onChange={e => setPwForm(p => ({ ...p, [f.key]: e.target.value }))}
                  style={{ width: '100%', padding: '11px 14px', borderRadius: 8, border: '1px solid var(--border)', fontSize: 14, outline: 'none', background: 'white' }}
                />
              </div>
            ))}
          </>
        )}
      </div>
      {!pwSaved && (
        <button
          onClick={() => { if (pwForm.next && pwForm.next === pwForm.confirm) setPwSaved(true) }}
          style={{ width: '100%', padding: '13px', borderRadius: 10, fontSize: 14, fontWeight: 600, border: 'none', background: 'var(--accent)', color: 'white', cursor: 'pointer', marginBottom: 40 }}
        >
          Update password
        </button>
      )}
    </div>
  )

  if (view === 'two-factor') return (
    <div>
      <SettingsBackBar title="Two-Factor Authentication" onBack={() => setView('main')} />
      <div style={{ ...styles.card, marginBottom: 16 }}>
        <div style={{ fontSize: 13, color: 'var(--text-muted)', lineHeight: 1.6, marginBottom: 20 }}>
          Two-factor authentication adds an extra layer of security. Each time you sign in, you will need your password and a code from your authenticator app.
        </div>
        {twoFAEnabled ? (
          <div style={{ textAlign: 'center', padding: '16px 0 8px' }}>
            <div style={{ display: 'inline-flex', alignItems: 'center', gap: 8, background: '#ECFDF5', border: '1px solid #6EE7B7', borderRadius: 8, padding: '10px 16px', marginBottom: 20 }}>
              <span style={{ fontSize: 16 }}>✓</span>
              <span style={{ fontSize: 13, fontWeight: 600, color: '#065F46' }}>Two-factor authentication is active</span>
            </div>
            <button onClick={() => setTwoFAEnabled(false)} style={{ display: 'block', width: '100%', padding: '12px', borderRadius: 10, fontSize: 14, fontWeight: 600, border: '1.5px solid #E5E7EB', background: 'white', color: '#EF4444', cursor: 'pointer' }}>
              Disable 2FA
            </button>
          </div>
        ) : (
          <>
            <div style={{ background: '#F3F4F6', borderRadius: 10, padding: 20, display: 'flex', alignItems: 'center', justifyContent: 'center', marginBottom: 16 }}>
              <div style={{ width: 120, height: 120, background: 'white', borderRadius: 8, display: 'grid', gridTemplateColumns: 'repeat(10,1fr)', gap: 1, padding: 6 }}>
                {Array.from({ length: 100 }).map((_, i) => (
                  <div key={i} style={{ background: [0,1,2,7,8,9,10,18,19,20,27,28,29,36,37,38,45,46,47,56,65,74,83,50,51,52,61,70,79,88].includes(i) ? '#0A0E1A' : 'transparent', borderRadius: 1 }} />
                ))}
              </div>
            </div>
            <div style={{ fontSize: 12, color: 'var(--text-muted)', textAlign: 'center', marginBottom: 20 }}>Scan this QR code with your authenticator app (Google Authenticator, Authy, etc.)</div>
            <button onClick={() => setTwoFAEnabled(true)} style={{ width: '100%', padding: '12px', borderRadius: 10, fontSize: 14, fontWeight: 600, border: 'none', background: 'var(--accent)', color: 'white', cursor: 'pointer' }}>
              I have scanned the code — Enable 2FA
            </button>
          </>
        )}
      </div>
    </div>
  )

  if (view === 'privacy') return (
    <div>
      <SettingsBackBar title="Privacy Policy" onBack={() => setView('main')} />
      <div style={{ ...styles.card, marginBottom: 40 }}>
        {[
          { heading: 'What data we collect', body: 'We collect the information you provide when your fund manager sets up your investor account: your name, email address, and fund membership details. We also collect usage data such as pages visited and features used, to improve the product.' },
          { heading: 'How we use your data', body: 'Your data is used solely to provide you with access to your fund reporting. We do not sell, share, or disclose your personal data to any third party except where required by law or where you have given explicit consent.' },
          { heading: 'Data storage and security', body: 'All data is stored in encrypted form in our EU-based infrastructure (London region). We apply row-level security so that each investor can only access their own fund data. Access is protected by your chosen authentication method.' },
          { heading: 'AI processing', body: 'When you use the Ask Clavio feature, your questions are processed by our AI provider under a Zero Data Retention agreement, meaning your queries and the underlying financial data are never stored or used for model training.' },
          { heading: 'Your rights', body: 'You have the right to access, correct, or delete your personal data at any time. You may also request a copy of all data held about you using the Download my data option in these settings. To exercise any of these rights, contact your fund manager or write to privacy@clavio.io.' },
          { heading: 'Retention', body: 'We retain your data for as long as your investor account is active. If your account is closed, your personal data is deleted within 30 days, except where retention is required by applicable financial regulation.' },
          { heading: 'Updates', body: 'We may update this policy from time to time. We will notify you by email of any material changes.' },
        ].map((s, i) => (
          <div key={s.heading} style={{ marginBottom: i < 6 ? 20 : 0 }}>
            <div style={{ fontSize: 13, fontWeight: 700, marginBottom: 6 }}>{s.heading}</div>
            <div style={{ fontSize: 13, color: 'var(--text-muted)', lineHeight: 1.7 }}>{s.body}</div>
          </div>
        ))}
        <div style={{ marginTop: 24, paddingTop: 16, borderTop: '1px solid #F3F4F6', fontSize: 12, color: 'var(--text-muted)' }}>Last updated: June 2026 · Clavio Technologies Ltd</div>
      </div>
    </div>
  )

  if (view === 'terms') return (
    <div>
      <SettingsBackBar title="Terms of Service" onBack={() => setView('main')} />
      <div style={{ ...styles.card, marginBottom: 40 }}>
        {[
          { heading: '1. Acceptance', body: 'By accessing the Clavio investor portal, you agree to these terms. If you do not agree, you must not use the portal. Your access is granted by your fund manager and is personal to you.' },
          { heading: '2. Access and credentials', body: 'You are responsible for maintaining the confidentiality of your login credentials. You must not share access with any other person. You must notify your fund manager immediately if you believe your account has been compromised.' },
          { heading: '3. Permitted use', body: 'The portal is provided for the sole purpose of viewing fund reporting information relating to your investment. You may not use any data obtained through the portal for any commercial purpose or share it with any third party without the written consent of your fund manager.' },
          { heading: '4. Accuracy of information', body: 'The figures displayed in the portal are sourced from portfolio company accounting systems and are subject to audit. Clavio and your fund manager make reasonable efforts to ensure accuracy but do not warrant that all information is complete or error-free. AI-generated analysis is indicative only and does not constitute investment advice.' },
          { heading: '5. Limitation of liability', body: 'To the fullest extent permitted by law, Clavio Technologies Ltd accepts no liability for any loss or damage arising from your use of or reliance on any information in the portal.' },
          { heading: '6. Governing law', body: 'These terms are governed by English law. Any dispute shall be subject to the exclusive jurisdiction of the courts of England and Wales.' },
        ].map((s, i) => (
          <div key={s.heading} style={{ marginBottom: i < 5 ? 20 : 0 }}>
            <div style={{ fontSize: 13, fontWeight: 700, marginBottom: 6 }}>{s.heading}</div>
            <div style={{ fontSize: 13, color: 'var(--text-muted)', lineHeight: 1.7 }}>{s.body}</div>
          </div>
        ))}
        <div style={{ marginTop: 24, paddingTop: 16, borderTop: '1px solid #F3F4F6', fontSize: 12, color: 'var(--text-muted)' }}>Last updated: June 2026 · Clavio Technologies Ltd</div>
      </div>
    </div>
  )

  if (view === 'download') return (
    <div>
      <SettingsBackBar title="Download My Data" onBack={() => setView('main')} />
      <div style={{ ...styles.card, marginBottom: 16 }}>
        <div style={{ fontSize: 13, color: 'var(--text-muted)', lineHeight: 1.6, marginBottom: 20 }}>
          You can request a copy of all personal data we hold about you. This includes your profile information, account activity, and notification preferences. The file will be prepared and sent to your registered email address within 48 hours.
        </div>
        {downloaded ? (
          <div style={{ textAlign: 'center', padding: '20px 0' }}>
            <div style={{ fontSize: 13, fontWeight: 600, color: '#10B981', marginBottom: 4 }}>Request received</div>
            <div style={{ fontSize: 13, color: 'var(--text-muted)' }}>Your data export will be sent to investor@example.com within 48 hours.</div>
          </div>
        ) : (
          <button onClick={() => setDownloaded(true)} style={{ width: '100%', padding: '12px', borderRadius: 10, fontSize: 14, fontWeight: 600, border: 'none', background: 'var(--accent)', color: 'white', cursor: 'pointer' }}>
            Request data export
          </button>
        )}
      </div>
    </div>
  )

  if (view === 'signout') return (
    <div>
      <SettingsBackBar title="Sign Out" onBack={() => setView('main')} />
      <div style={{ ...styles.card, marginBottom: 16, textAlign: 'center', padding: '32px 24px' }}>
        <div style={{ fontSize: 13, color: 'var(--text-muted)', lineHeight: 1.6, marginBottom: 24 }}>
          Are you sure you want to sign out? You will need to sign in again to access your fund portal.
        </div>
        <button onClick={() => setSignoutConfirm(true)} style={{ width: '100%', padding: '13px', borderRadius: 10, fontSize: 14, fontWeight: 600, border: 'none', background: '#EF4444', color: 'white', cursor: 'pointer', marginBottom: 10 }}>
          {signoutConfirm ? 'Signing out…' : 'Sign out'}
        </button>
        <button onClick={() => setView('main')} style={{ width: '100%', padding: '13px', borderRadius: 10, fontSize: 14, fontWeight: 600, border: '1.5px solid var(--border)', background: 'white', color: 'var(--text)', cursor: 'pointer' }}>
          Cancel
        </button>
      </div>
    </div>
  )

  // Main settings view
  const row = (label: string, hint: string | null, onPress: () => void, danger = false) => (
    <div key={label} onClick={onPress} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '14px 0', borderTop: '1px solid #F3F4F6', cursor: 'pointer' }}>
      <div>
        <div style={{ fontSize: 15, fontWeight: 500, color: danger ? '#EF4444' : 'var(--text)' }}>{label}</div>
        {hint && <div style={{ fontSize: 13, color: 'var(--text-muted)', marginTop: 3 }}>{hint}</div>}
      </div>
      <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke={danger ? '#EF4444' : 'var(--text-muted)'} strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round"><polyline points="9 18 15 12 9 6"/></svg>
    </div>
  )

  return (
    <div>
      {/* Profile */}
      <div style={{ ...styles.card, marginBottom: 12 }}>
        <div style={{ fontSize: 12, fontWeight: 700, color: 'var(--accent)', letterSpacing: '0.08em', textTransform: 'uppercase', marginBottom: 14 }}>Profile</div>
        <div style={{ display: 'flex', alignItems: 'center', gap: 14, marginBottom: 16 }}>
          <div style={{ width: 48, height: 48, borderRadius: '50%', background: 'var(--navy)', display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'white', fontSize: 18, fontWeight: 700, flexShrink: 0 }}>LP</div>
          <div>
            <div style={{ fontSize: 15, fontWeight: 600 }}>Investor</div>
            <div style={{ fontSize: 13, color: 'var(--text-muted)' }}>investor@example.com</div>
          </div>
        </div>
        {[
          { label: 'Fund', value: 'Fund II' },
          { label: 'Investor since', value: 'June 2022' },
          { label: 'Commitment', value: '£5.00m' },
        ].map(r => (
          <div key={r.label} style={{ display: 'flex', justifyContent: 'space-between', padding: '11px 0', borderTop: '1px solid #F3F4F6' }}>
            <span style={{ fontSize: 14, color: 'var(--text-muted)' }}>{r.label}</span>
            <span style={{ fontSize: 14, fontWeight: 600 }}>{r.value}</span>
          </div>
        ))}
      </div>

      {/* Notifications */}
      <div style={{ ...styles.card, marginBottom: 12 }}>
        <div style={{ fontSize: 12, fontWeight: 700, color: 'var(--accent)', letterSpacing: '0.08em', textTransform: 'uppercase', marginBottom: 14 }}>Notifications</div>
        {([
          { key: 'calls' as const, label: 'Capital calls', hint: 'Email me when a new call is issued' },
          { key: 'distributions' as const, label: 'Distributions', hint: 'Email me when a distribution is made' },
          { key: 'reports' as const, label: 'Quarterly reports', hint: 'Email me when a new report is available' },
        ]).map((item, i) => (
          <div key={item.key} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '13px 0', borderTop: i === 0 ? 'none' : '1px solid #F3F4F6' }}>
            <div>
              <div style={{ fontSize: 15, fontWeight: 500 }}>{item.label}</div>
              <div style={{ fontSize: 13, color: 'var(--text-muted)', marginTop: 3 }}>{item.hint}</div>
            </div>
            <div
              onClick={() => setNotifs(n => ({ ...n, [item.key]: !n[item.key] }))}
              style={{ width: 40, height: 22, borderRadius: 11, background: notifs[item.key] ? 'var(--accent)' : '#D1D5DB', position: 'relative', flexShrink: 0, cursor: 'pointer', transition: 'background 0.2s' }}
            >
              <div style={{ position: 'absolute', top: 3, left: notifs[item.key] ? 21 : 3, width: 16, height: 16, borderRadius: '50%', background: 'white', transition: 'left 0.2s' }} />
            </div>
          </div>
        ))}
      </div>

      {/* Language */}
      <div style={{ ...styles.card, marginBottom: 12 }}>
        <div style={{ fontSize: 12, fontWeight: 700, color: 'var(--accent)', letterSpacing: '0.08em', textTransform: 'uppercase', marginBottom: 14 }}>Language</div>
        <div style={{ display: 'flex', gap: 8 }}>
          {(['en', 'fr'] as const).map(l => (
            <button key={l} onClick={() => setLang(l)} style={{ flex: 1, padding: '10px', borderRadius: 8, fontSize: 13, fontWeight: 600, border: lang === l ? '1.5px solid var(--accent)' : '1px solid var(--border)', background: lang === l ? '#EFF6FF' : 'white', color: lang === l ? 'var(--accent)' : 'var(--text-muted)', cursor: 'pointer' }}>
              {l === 'en' ? 'English' : 'Français'}
            </button>
          ))}
        </div>
      </div>

      {/* Security */}
      <div style={{ ...styles.card, marginBottom: 12 }}>
        <div style={{ fontSize: 12, fontWeight: 700, color: 'var(--accent)', letterSpacing: '0.08em', textTransform: 'uppercase', marginBottom: 2 }}>Security</div>
        {row('Change password', 'Update your login password', () => setView('change-password'))}
        {row('Two-factor authentication', twoFAEnabled ? 'Active' : 'Not enabled', () => setView('two-factor'))}
      </div>

      {/* Data & Privacy */}
      <div style={{ ...styles.card, marginBottom: 24 }}>
        <div style={{ fontSize: 12, fontWeight: 700, color: 'var(--accent)', letterSpacing: '0.08em', textTransform: 'uppercase', marginBottom: 2 }}>Data &amp; Privacy</div>
        {row('Privacy policy', null, () => setView('privacy'))}
        {row('Terms of service', null, () => setView('terms'))}
        {row('Download my data', 'Export a copy of your account data', () => setView('download'))}
      </div>

      <div style={{ ...styles.card, marginBottom: 40 }}>
        {row('Sign out', null, () => setView('signout'), true)}
      </div>
    </div>
  )
}

function DocumentsTab() {
  const { t, lang } = useLang()
  const [query, setQuery] = useState('')
  const [openDoc, setOpenDoc] = useState<string | null>(null)
  const [summaries, setSummaries] = useState<Record<string, string>>({})
  const [loadingDoc, setLoadingDoc] = useState<string | null>(null)
  const [errorDoc, setErrorDoc] = useState<Record<string, string>>({})

  const q = query.trim().toLowerCase()
  const filtered = DOCUMENTS.filter(d =>
    !q || loc(d.title, lang).toLowerCase().includes(q) || loc(d.type, lang).toLowerCase().includes(q)
  )

  const summarize = async (id: string, titleEn: string, typeEn: string) => {
    setOpenDoc(prev => (prev === id ? null : id))
    if (summaries[id] || loadingDoc === id) return
    setLoadingDoc(id)
    setErrorDoc(e => ({ ...e, [id]: '' }))
    try {
      const question = `Summarise the "${titleEn}" (a ${typeEn.toLowerCase()} for ${FUND.name}) for an investor in exactly 3 short bullet points. Each bullet on its own line starting with "• ". Ground every bullet in the fund and portfolio figures you have. No preamble, just the 3 bullets.`
      const res = await fetch('/api/ask', {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ question, lang }),
      })
      const data = await res.json()
      if (!res.ok) throw new Error(data.error || 'Request failed')
      setSummaries(s => ({ ...s, [id]: data.answer || '' }))
    } catch (e: unknown) {
      setErrorDoc(er => ({ ...er, [id]: e instanceof Error ? e.message : 'Could not summarise' }))
    } finally {
      setLoadingDoc(null)
    }
  }

  return (
    <div>
      <div className="hide-mobile" style={{ marginBottom: 16 }}>
        <h2 style={{ fontSize: 20, fontWeight: 700 }}>{t('lp.section.documents')}</h2>
        <p style={{ fontSize: 13, color: 'var(--text-muted)', marginTop: 2 }}>{t('lp.documentsSub', { name: FUND.name })}</p>
      </div>

      {/* Search */}
      <div style={{ position: 'relative', marginBottom: 12 }}>
        <span style={{ position: 'absolute', left: 14, top: '50%', transform: 'translateY(-50%)', color: 'var(--text-muted)', fontSize: 14 }}>⌕</span>
        <input
          value={query}
          onChange={e => setQuery(e.target.value)}
          placeholder={t('lp.searchDocs')}
          style={{ width: '100%', padding: '11px 14px 11px 36px', borderRadius: 10, fontSize: 14, border: '1px solid var(--border)', outline: 'none', background: 'white' }}
        />
      </div>

      <div style={{ ...styles.card, padding: 0, overflow: 'hidden', marginBottom: 40 }}>
        {filtered.length === 0 && (
          <div style={{ padding: '28px 20px', textAlign: 'center', fontSize: 13, color: 'var(--text-muted)' }}>{t('lp.noDocs', { q: query })}</div>
        )}
        {filtered.map((doc, i) => {
          const id = doc.title.en
          const isOpen = openDoc === id
          return (
            <div key={id} style={{ borderBottom: i < filtered.length - 1 ? '1px solid #F3F4F6' : 'none' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 14, padding: '16px 20px' }}>
                <div style={{
                  width: 36, height: 36, borderRadius: 8, flexShrink: 0,
                  background: doc.typeKey === 'Notice' ? '#FEF3C7' : doc.typeKey === 'Tax' ? '#EEF3FA' : '#F3F4F6',
                  display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 14,
                }}>
                  {doc.typeKey === 'Notice' ? '!' : doc.typeKey === 'Tax' ? '§' : '≡'}
                </div>
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 8, flexWrap: 'wrap' }}>
                    <span style={{ fontSize: 14, fontWeight: 500 }}>{loc(doc.title, lang)}</span>
                    {doc.isNew && (
                      <span style={{ fontSize: 10, fontWeight: 700, background: '#ECFDF5', color: '#065F46', padding: '2px 7px', borderRadius: 20, letterSpacing: '0.05em' }}>NEW</span>
                    )}
                  </div>
                  <div style={{ fontSize: 12, color: 'var(--text-muted)', marginTop: 2 }}>{loc(doc.type, lang)} · {doc.date}</div>
                </div>
                <button
                  onClick={() => summarize(id, doc.title.en, doc.typeKey)}
                  style={{
                    padding: '7px 12px', borderRadius: 8, fontSize: 12.5, fontWeight: 600,
                    border: `1px solid ${isOpen ? 'var(--accent)' : '#D7E2F2'}`,
                    background: isOpen ? 'var(--accent)' : '#F4F8FE', color: isOpen ? 'white' : 'var(--accent)',
                    cursor: 'pointer', flexShrink: 0, display: 'flex', alignItems: 'center', gap: 5,
                  }}
                >
                  ✦ <span className="hide-mobile">{t('lp.summary')}</span>
                </button>
                <button style={{
                  padding: '7px 14px', borderRadius: 8, fontSize: 12.5, fontWeight: 500,
                  border: '1px solid var(--border)', background: 'white', color: 'var(--text)',
                  cursor: 'pointer', flexShrink: 0,
                }}>
                  <span className="hide-mobile">{t('lp.download')}</span>
                  <span className="show-mobile">↓</span>
                </button>
              </div>

              {isOpen && (
                <div style={{ padding: '0 20px 16px 70px' }}>
                  <div style={{ background: '#F7FAFE', border: '1px solid #E3ECF8', borderRadius: 10, padding: '12px 14px' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginBottom: 8 }}>
                      <span style={{ fontSize: 10, fontWeight: 700, color: 'var(--accent)', letterSpacing: '0.06em', textTransform: 'uppercase' }}>{t('lp.aiSummary')}</span>
                    </div>
                    {loadingDoc === id ? (
                      <div style={{ display: 'flex', gap: 5, alignItems: 'center' }}>
                        {[0, 1, 2].map(k => (
                          <span key={k} style={{ width: 6, height: 6, borderRadius: '50%', background: 'var(--accent)', animation: `clavio-pulse 1.2s ${k * 0.18}s infinite ease-in-out` }} />
                        ))}
                        <span style={{ fontSize: 12, color: 'var(--text-muted)', marginLeft: 4 }}>{t('lp.readingDoc')}</span>
                      </div>
                    ) : errorDoc[id] ? (
                      <div style={{ fontSize: 12.5, color: 'var(--red)' }}>{errorDoc[id]}</div>
                    ) : (
                      <div style={{ fontSize: 13, lineHeight: 1.65, color: '#374151', whiteSpace: 'pre-wrap' }}>{summaries[id]}</div>
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

function AskTab({ isMobile }: { isMobile?: boolean }) {
  const { t, lang } = useLang()
  return (
    <AskPanel
      isMobile={isMobile}
      connectedLabel={t('ask.connected')}
      connectedSub={t('ask.lp.sub', { n: COMPANIES.length, date: loc(FUND.date, lang) })}
      introTitle={t('ask.lp.introTitle')}
      introBody={t('ask.lp.introBody')}
      placeholder={t('ask.lp.placeholder')}
      suggestions={[t('ask.lp.q1'), t('ask.lp.q2'), t('ask.lp.q3'), t('ask.lp.q4')]}
    />
  )
}

// ── Value creation bridge (custom SVG waterfall) ─────────────────────────────

function ValueBridge() {
  const { t } = useLang()
  // £M figures: start at invested cost, build to current gross value
  const steps = [
    { label: t('lp.bridge.invested'), value: 16.9, type: 'total' as const },
    { label: t('lp.bridge.revenue'), value: 4.3, type: 'up' as const },
    { label: t('lp.bridge.margin'), value: 2.1, type: 'up' as const },
    { label: t('lp.bridge.multiple'), value: 1.4, type: 'up' as const },
    { label: t('lp.bridge.debt'), value: 0.9, type: 'up' as const },
    { label: t('lp.bridge.fx'), value: -2.1, type: 'down' as const },
    { label: t('lp.bridge.current'), value: 23.5, type: 'total' as const },
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
  const { t } = useLang()
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
      <text x={x(3)} y={y(1.8) - 8} textAnchor="middle" fontSize="9" fontWeight="700" fill="#10B981">{t('lp.breakeven')}</text>
    </svg>
  )
}

// ── Allocation donut ─────────────────────────────────────────────────────────

function AllocationDonut() {
  const { t, lang } = useLang()
  // Share of fund gross value by sector
  const slices = [
    { label: loc({ en: 'B2B Services', fr: 'Services B2B' }, lang), value: 33, color: '#1E3A5F' },
    { label: loc({ en: 'F&B Distribution', fr: 'Distribution agroalimentaire' }, lang), value: 28, color: '#1652A0' },
    { label: loc({ en: 'Manufacturing', fr: 'Industrie' }, lang), value: 23, color: '#10B981' },
    { label: loc({ en: 'Specialty Mfg', fr: 'Fabrication spécialisée' }, lang), value: 16, color: '#F59E0B' },
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
        <text x="66" y="76" textAnchor="middle" fontSize="9" fill="#9CA3AF">{t('lp.grossValue')}</text>
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
    boxShadow: '0 1px 2px rgba(16,24,40,0.04), 0 1px 3px rgba(16,24,40,0.04)',
  },
}
