// src/components/Layout/Header.tsx
// デスクトップ向けヘッダー（アプリ名・ナビゲーション・アイコン群）
//
// 右端アイコン配置:
//   [ マイル（Ticket） ]  [ アバター or UserCircle ]
//
// ログイン中にアバターをタップするとアカウント情報パネルが開く

import { useState } from 'react'
import { NavLink, useNavigate } from 'react-router-dom'
import { Ticket, UserCircle, LogOut, Mail, Coins, ShieldCheck } from 'lucide-react'
import { useAuth } from '../../contexts/AuthContext'
import type { User } from '../../mocks/data/types'

// ---- アバターバッジ ----

function AvatarBadge({ displayName }: { displayName: string }) {
  const seed = encodeURIComponent(displayName)
  const avatarUrl = `https://api.dicebear.com/9.x/adventurer/svg?seed=${seed}&backgroundColor=ffedd5`

  return (
    <img
      src={avatarUrl}
      alt={displayName}
      className="w-8 h-8 rounded-full object-cover ring-2 ring-orange-300 bg-orange-50"
    />
  )
}

// ---- アカウント情報パネル ----

interface AccountPanelProps {
  user: User
  onClose: () => void
  onLogout: () => void
}

function AccountPanel({ user, onClose, onLogout }: AccountPanelProps) {
  const seed = encodeURIComponent(user.displayName)
  const avatarUrl = `https://api.dicebear.com/9.x/adventurer/svg?seed=${seed}&backgroundColor=ffedd5`

  return (
    <>
      {/* オーバーレイ */}
      <div
        className="fixed inset-0 z-40"
        onClick={onClose}
        aria-hidden="true"
      />

      {/* パネル本体（ヘッダー右端から下にドロップ） */}
      <div
        className="absolute right-0 top-full mt-2 w-72 bg-white rounded-2xl shadow-xl border border-gray-100 z-50 overflow-hidden"
        role="dialog"
        aria-label="アカウント情報"
      >
        {/* アバター + 名前 */}
        <div className="flex flex-col items-center gap-3 px-6 py-6 bg-orange-50">
          <img
            src={avatarUrl}
            alt={user.displayName}
            className="w-16 h-16 rounded-full object-cover ring-4 ring-white shadow-md bg-orange-100"
          />
          <div className="text-center">
            <p className="text-base font-bold text-gray-900">{user.displayName}</p>
            {user.role === 'sponsor-admin' && (
              <span className="inline-flex items-center gap-1 mt-1 text-xs font-medium text-purple-600 bg-purple-100 px-2 py-0.5 rounded-full">
                <ShieldCheck className="w-3 h-3" aria-hidden="true" />
                スポンサー管理者
              </span>
            )}
          </div>
        </div>

        {/* 情報リスト */}
        <ul className="divide-y divide-gray-100 px-4 py-2">
          <li className="flex items-center gap-3 py-3 text-sm text-gray-700">
            <Mail className="w-4 h-4 text-gray-400 shrink-0" aria-hidden="true" />
            <span className="truncate">{user.email}</span>
          </li>
          <li className="flex items-center gap-3 py-3 text-sm text-gray-700">
            <Coins className="w-4 h-4 text-orange-400 shrink-0" aria-hidden="true" />
            <span>
              マイル残高：
              <span className="font-semibold text-orange-500">
                {user.mileBalance.toLocaleString()} mile
              </span>
            </span>
          </li>
        </ul>

        {/* ログアウトボタン */}
        <div className="px-4 pb-4 pt-1">
          <button
            type="button"
            onClick={onLogout}
            className="w-full flex items-center justify-center gap-2 py-2.5 rounded-xl
                       text-sm font-medium text-red-500 border border-red-200
                       hover:bg-red-50 transition-colors"
          >
            <LogOut className="w-4 h-4" aria-hidden="true" />
            ログアウト
          </button>
        </div>
      </div>
    </>
  )
}

// ---- ナビリンク用ヘルパー ----

function navLinkClass({ isActive }: { isActive: boolean }): string {
  const base = 'px-3 py-1.5 rounded-md text-sm font-medium transition-colors'
  return isActive
    ? `${base} bg-orange-100 text-orange-600`
    : `${base} text-gray-600 hover:text-orange-600 hover:bg-orange-50`
}

// ---- Header 本体 ----

export function Header() {
  const { user, isAuthenticated, logout } = useAuth()
  const navigate = useNavigate()
  const [accountOpen, setAccountOpen] = useState(false)

  function handleUserClick() {
    if (isAuthenticated) {
      setAccountOpen(prev => !prev)
    } else {
      navigate('/login')
    }
  }

  function handleLogout() {
    setAccountOpen(false)
    logout()
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
          <NavLink to="/" end className={navLinkClass}>フィード</NavLink>
          <NavLink to="/map" className={navLinkClass}>マップ</NavLink>
          <NavLink to="/submit" className={navLinkClass}>投稿</NavLink>
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
            <Ticket className="w-6 h-6" aria-hidden="true" />
          </NavLink>

          {/* ユーザーボタン + アカウントパネル */}
          <div className="relative">
            <button
              type="button"
              onClick={handleUserClick}
              aria-label={isAuthenticated ? 'アカウント情報' : 'ログイン'}
              aria-expanded={accountOpen}
              className="p-1.5 rounded-full transition-colors hover:bg-orange-50"
            >
              {isAuthenticated && user ? (
                <AvatarBadge displayName={user.displayName} />
              ) : (
                <UserCircle className="w-6 h-6 text-gray-400" aria-hidden="true" />
              )}
            </button>

            {/* アカウント情報パネル（ログイン中のみ） */}
            {accountOpen && isAuthenticated && user && (
              <AccountPanel
                user={user}
                onClose={() => setAccountOpen(false)}
                onLogout={handleLogout}
              />
            )}
          </div>

        </div>
      </div>
    </header>
  )
}
