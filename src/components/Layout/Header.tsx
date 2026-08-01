// src/components/Layout/Header.tsx
// デスクトップ向けヘッダー（アプリ名・ナビゲーション・認証ボタン）

import { NavLink, useNavigate } from 'react-router-dom'
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

  function handleAuthClick() {
    if (isAuthenticated) {
      logout()
    } else {
      navigate('/login')
    }
  }

  return (
    <header className="bg-white border-b border-gray-200 sticky top-0 z-50">
      <div className="max-w-5xl mx-auto px-4 h-14 flex items-center justify-between gap-4">

        {/* ロゴ */}
        <NavLink
          to="/"
          className="flex items-center gap-1.5 shrink-0"
          aria-label="NagoTime ホーム"
        >
          <span className="text-xl" aria-hidden="true">🍜</span>
          <span className="text-lg font-bold text-orange-500 tracking-tight">
            NagoTime
          </span>
        </NavLink>

        {/* デスクトップナビゲーション（モバイルでは非表示） */}
        <nav className="hidden md:flex items-center gap-1" aria-label="メインナビゲーション">
          <NavLink to="/" end className={navLinkClass}>
            フィード
          </NavLink>
          <NavLink to="/map" className={navLinkClass}>
            マップ
          </NavLink>
          <NavLink to="/miles" className={navLinkClass}>
            マイル
          </NavLink>
        </nav>

        {/* 認証ボタン */}
        <button
          type="button"
          onClick={handleAuthClick}
          className="shrink-0 px-4 py-1.5 rounded-full text-sm font-medium border transition-colors
                     border-orange-400 text-orange-500 hover:bg-orange-500 hover:text-white"
        >
          {isAuthenticated ? 'ログアウト' : 'ログイン'}
        </button>

      </div>
    </header>
  )
}
