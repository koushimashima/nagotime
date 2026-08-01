// src/components/Layout/BottomNav.tsx
// モバイル向けボトムナビゲーション（大画面では非表示）
//
// レイアウト:
//   [ Home ]  [ ＋（投稿） ]  [ Map ]
//               ↑ 中央に突出した丸ボタン

import { NavLink } from 'react-router-dom'
import { Home, Plus, Map } from 'lucide-react'

export function BottomNav() {
  return (
    <nav
      className="md:hidden fixed bottom-0 inset-x-0 bg-white border-t border-gray-200 z-50"
      aria-label="ボトムナビゲーション"
    >
      <ul className="flex h-16 items-end overflow-visible">

        {/* ---- フィード ---- */}
        <li className="flex-1">
          <NavLink
            to="/"
            end
            className={({ isActive }) =>
              [
                'flex items-center justify-center h-16 transition-colors',
                isActive ? 'text-orange-500' : 'text-gray-400 hover:text-orange-500',
              ].join(' ')
            }
            aria-label="フィード"
          >
            <Home className="w-6 h-6" aria-hidden="true" />
          </NavLink>
        </li>

        {/* ---- 投稿（中央突出ボタン） ---- */}
        <li className="flex-1 flex items-end justify-center pb-3">
          <NavLink
            to="/submit"
            className={({ isActive }) =>
              [
                'flex items-center justify-center -translate-y-4 transition-transform',
                isActive ? 'scale-95' : 'hover:scale-105',
              ].join(' ')
            }
            aria-label="投稿"
          >
            <span className="w-14 h-14 rounded-full bg-orange-500 shadow-lg flex items-center justify-center ring-4 ring-white">
              <Plus className="w-7 h-7 text-white" strokeWidth={2.5} aria-hidden="true" />
            </span>
          </NavLink>
        </li>

        {/* ---- マップ ---- */}
        <li className="flex-1">
          <NavLink
            to="/map"
            className={({ isActive }) =>
              [
                'flex items-center justify-center h-16 transition-colors',
                isActive ? 'text-orange-500' : 'text-gray-400 hover:text-orange-500',
              ].join(' ')
            }
            aria-label="マップ"
          >
            <Map className="w-6 h-6" aria-hidden="true" />
          </NavLink>
        </li>

      </ul>
    </nav>
  )
}
