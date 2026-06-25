'use client'
import React from 'react'

export interface BottomTab {
  id: string
  label: string
  icon: React.ReactNode
  activeIcon?: React.ReactNode
}

interface Props {
  tabs: BottomTab[]
  activeTab: string
  onTabChange: (id: string) => void
}

export default function BottomTabBar({ tabs, activeTab, onTabChange }: Props) {
  return (
    <div style={{
      position: 'fixed',
      bottom: 0, left: 0, right: 0,
      background: 'white',
      borderTop: '1px solid #E5E7EB',
      display: 'flex',
      paddingBottom: 'env(safe-area-inset-bottom)',
      zIndex: 90,
      boxShadow: '0 -4px 16px rgba(0,0,0,0.06)',
    }}>
      {tabs.map(tab => {
        const active = tab.id === activeTab
        return (
          <button
            key={tab.id}
            onClick={() => onTabChange(tab.id)}
            style={{
              flex: 1,
              display: 'flex',
              flexDirection: 'column',
              alignItems: 'center',
              padding: '10px 4px 8px',
              border: 'none',
              background: 'none',
              cursor: 'pointer',
              color: active ? '#0A0E1A' : '#9CA3AF',
              transition: 'color 0.15s',
            }}
          >
            <span style={{
              marginBottom: 3,
              color: active ? '#1652A0' : '#9CA3AF',
              transform: active ? 'scale(1.18)' : 'scale(1)',
              transition: 'transform 0.15s ease, color 0.15s',
              display: 'block',
            }}>
              {active && tab.activeIcon ? tab.activeIcon : tab.icon}
            </span>
            <span style={{
              fontSize: 10, fontWeight: active ? 700 : 500,
              letterSpacing: '0.01em',
              color: active ? '#0A0E1A' : '#9CA3AF',
            }}>
              {tab.label}
            </span>
          </button>
        )
      })}
    </div>
  )
}
