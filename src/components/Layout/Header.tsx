// src/components/Layout/Header.tsx
// デスクトップ向けヘッダー（アプリ名・ナビゲーション・アイコン群）
//
// 右端アイコン配置:
//   [ マイル（Ticket） ]  [ ユーザー（UserCircle） ]

import { NavLink, useNavigate } from 'react-router-dom'
import { Ticket, UserCircle } from 'lucide-react'
import { useAuth } from '../../contexts/AuthContext'

/**
 * NavLink の isActive に応じたクラス文字列を返すヘルパー。
 * デスクトップナビゲーション用。
 */
function navLinkClass({ isActive }: { isActive: boolean }): string {
  const base = 'px-3 py-1.5 rounded-md text-sm font-medium transition-colors'
  return isActive
    ? `${base} bg-orange-100 text-orange-600`
    : `${base} text-gray-600 hover:text-orange-600 hover:bg-orange-50`
}

export function Header() {
  const { isAuthenticated, logout } = useAuth()
  const navigate = useNavigate()

  function handleUserClick() {
    if (isAuthenticated) {
      logout()
    } else {
      navigate('/login')
    }
  }

  return (
    <header className="bg-white border-b border-gray-200 sticky top-0 z-50">
      <div className="max-w-5xl mx-auto px-4 h-14 flex items-center justify-between gap-4">

        {/* ---- ロゴ ---- */}
        <NavLink
          to="/"
          className="flex items-center shrink-0"
          aria-label="NagoTime ホーム"
        >
          <span className="text-lg font-bold text-orange-500 tracking-tight">
            NagoTime
          </span>
        </NavLink>

        {/* ---- デスクトップナビゲーション（モバイルでは非表示） ---- */}
        <nav className="hidden md:flex items-center gap-1" aria-label="メインナビゲーション">
          <NavLink to="/" end className={navLinkClass}>
            フィード
          </NavLink>
          <NavLink to="/map" className={navLinkClass}>
            マップ
          </NavLink>
          <NavLink to="/submit" className={navLinkClass}>
            投稿
          </NavLink>
        </nav>

        {/* ---- 右端アイコン群 ---- */}
        <div className="flex items-center gap-1 shrink-0">

          {/* マイルアイコン */}
          <NavLink
            to="/miles"
            aria-label="マイル"
            className={({ isActive }) =>
              [
                'p-2 rounded-full transition-colors',
                isActive
                  ? 'text-orange-500 bg-orange-50'
                  : 'text-gray-500 hover:text-orange-500 hover:bg-orange-50',
              ].join(' ')
            }
          >
            <Ticket className="w-5 h-5" aria-hidden="true" />
          </NavLink>

          {/* ユーザーアイコン（ログイン/ログアウト） */}
          <button
            type="button"
            onClick={handleUserClick}
            aria-label={isAuthenticated ? 'ログアウト' : 'ログイン'}
            className={[
              'p-2 rounded-full transition-colors',
              isAuthenticated
                ? 'text-orange-500 hover:bg-orange-50'
                : 'text-gray-500 hover:text-orange-500 hover:bg-orange-50',
            ].join(' ')}
          >
            <UserCircle className="w-5 h-5" aria-hidden="true" />
          </button>

        </div>
      </div>
    </header>
  )
}
