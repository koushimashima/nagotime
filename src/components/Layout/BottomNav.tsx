// src/components/Layout/BottomNav.tsx
// モバイル向けボトムナビゲーション（大画面では非表示）

import { NavLink } from 'react-router-dom'

interface NavItem {
  to: string
  label: string
  icon: string
  end?: boolean
}

const NAV_ITEMS: NavItem[] = [
  { to: '/', label: 'フィード', icon: '🏠', end: true },
  { to: '/submit', label: '投稿', icon: '✏️' },
  { to: '/map', label: 'マップ', icon: '🗺️' },
  { to: '/miles', label: 'マイル', icon: '🎟️' },
]

export function BottomNav() {
  return (
    <nav
      className="md:hidden fixed bottom-0 inset-x-0 bg-white border-t border-gray-200 z-50"
      aria-label="ボトムナビゲーション"
    >
      <ul className="flex h-16">
        {NAV_ITEMS.map(({ to, label, icon, end }) => (
          <li key={to} className="flex-1">
            <NavLink
              to={to}
              end={end}
              className={({ isActive }) =>
                [
                  'flex flex-col items-center justify-center h-full gap-0.5 text-xs font-medium transition-colors',
                  isActive ? 'text-orange-500' : 'text-gray-500 hover:text-orange-500',
                ].join(' ')
              }
              aria-label={label}
            >
              {/* アイコン */}
              <span className="text-xl leading-none" aria-hidden="true">
                {icon}
              </span>
              {/* ラベル */}
              <span>{label}</span>
            </NavLink>
          </li>
        ))}
      </ul>
    </nav>
  )
}
