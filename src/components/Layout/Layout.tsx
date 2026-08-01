// src/components/Layout/Layout.tsx
// Header + Outlet + BottomNav を組み合わせたシェルレイアウト

import { Outlet } from 'react-router-dom'
import { Header } from './Header'
import { BottomNav } from './BottomNav'

/**
 * アプリ共通レイアウト。
 * - Header: 上部固定（sticky）
 * - Outlet: ページコンテンツ
 * - BottomNav: モバイル向け下部固定（md 以上では非表示）
 *
 * モバイルでは BottomNav 分（h-16 = 4rem）の padding-bottom を確保する。
 */
export function Layout() {
  return (
    <div className="min-h-screen flex flex-col bg-gray-50">
      {/* 上部ヘッダー */}
      <Header />

      {/* ページコンテンツ */}
      <main className="flex-1 pb-16 md:pb-0">
        <Outlet />
      </main>

      {/* モバイルボトムナビ */}
      <BottomNav />
    </div>
  )
}
