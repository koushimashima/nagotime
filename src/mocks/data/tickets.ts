// src/mocks/data/tickets.ts
// チケットサンプルデータ（Requirements 9.1〜9.5）

import type { Ticket } from './types'

export const mockTickets: Ticket[] = [
  // ---- ACTIVE（有効） ----
  {
    ticketId: 'ticket-001',
    sponsorId: 'sponsor-001',
    sponsorName: '矢場とん',
    name: 'みそかつ定食 100マイル割引',
    description: '名古屋名物みそかつ定食を100マイルでワンドリンクサービス！ランチ・ディナー両方OK。',
    requiredMiles: 100,
    expiresAt: '2026-12-31T23:59:59+09:00',
    issueLimit: 200,
    redeemedCount: 58,
    status: 'ACTIVE',
    // みそかつ・とんかつ料理
    thumbnailUrl: 'https://images.unsplash.com/photo-1569050467447-ce54b3bbc37d?w=400&h=300&fit=crop',
  },
  {
    ticketId: 'ticket-002',
    sponsorId: 'sponsor-002',
    sponsorName: '覚王山カフェ「月の庭」',
    name: 'ハンドドリップコーヒー 無料券',
    description: '自家焙煎のスペシャルティコーヒーを1杯無料でご提供。ケーキとのセットもおすすめ。',
    requiredMiles: 150,
    expiresAt: '2026-09-30T23:59:59+09:00',
    issueLimit: 100,
    redeemedCount: 34,
    status: 'ACTIVE',
    // ハンドドリップコーヒー
    thumbnailUrl: 'https://images.unsplash.com/photo-1495474472287-4d71bcdd2085?w=400&h=300&fit=crop',
  },
  {
    ticketId: 'ticket-003',
    sponsorId: 'sponsor-003',
    sponsorName: '東山動植物園',
    name: '1Day入園券（大人）',
    description: '東山動植物園の大人1Day入園券と交換できます。動物園・植物園どちらもご利用いただけます（1枚1名様）。',
    requiredMiles: 500,
    expiresAt: '2026-11-30T23:59:59+09:00',
    issueLimit: 500,
    redeemedCount: 122,
    status: 'ACTIVE',
    // 動物園・ゾウ
    thumbnailUrl: 'https://images.unsplash.com/photo-1503919545889-aef636e10ad4?w=400&h=300&fit=crop',
  },
  {
    ticketId: 'ticket-006',
    sponsorId: 'sponsor-006',
    sponsorName: 'ミッドランドシネマ名古屋',
    name: '映画鑑賞チケット 1枚',
    description: '映画鑑賞チケット1枚と交換。一般・3D作品もOK。座席指定はスタッフへお声がけください。',
    requiredMiles: 1000,
    expiresAt: '2026-12-31T23:59:59+09:00',
    issueLimit: 200,
    redeemedCount: 15,
    status: 'ACTIVE',
    // 映画館・シアター
    thumbnailUrl: 'https://images.unsplash.com/photo-1489599849927-2ee91cede3ba?w=400&h=300&fit=crop',
  },
  {
    ticketId: 'ticket-007',
    sponsorId: 'sponsor-007',
    sponsorName: 'ボウルナゴヤ',
    name: 'ボウリング1ゲーム無料券',
    description: 'ボウリング1ゲーム無料！シューズレンタル込み。平日・週末どちらでも利用可能（1枚1名様）。',
    requiredMiles: 1000,
    expiresAt: '2026-12-31T23:59:59+09:00',
    issueLimit: 150,
    redeemedCount: 8,
    status: 'ACTIVE',
    // ボウリング
    thumbnailUrl: 'https://images.unsplash.com/photo-1596301588034-4cb610424c81?w=400&h=300&fit=crop',
  },

  // ---- SOLD_OUT（売り切れ） ----
  {
    ticketId: 'ticket-004',
    sponsorId: 'sponsor-004',
    sponsorName: '大須商店街 たこ焼き「浪速屋」',
    name: 'たこ焼き8個 50マイル引換券',
    description: 'ふわとろ大粒たこ焼き8個セットを50マイルで引換。人気のため完売しました。',
    requiredMiles: 50,
    expiresAt: '2026-08-31T23:59:59+09:00',
    issueLimit: 150,
    redeemedCount: 150,
    status: 'SOLD_OUT',
    // たこ焼き
    thumbnailUrl: 'https://images.unsplash.com/photo-1585664811087-47f65abbad64?w=400&h=300&fit=crop',
  },

  // ---- EXPIRED（期限切れ） ----
  {
    ticketId: 'ticket-005',
    sponsorId: 'sponsor-005',
    sponsorName: '名古屋城ミュージアムショップ',
    name: '限定グッズ 10%OFF チケット',
    description: '名古屋城オリジナルグッズを10%オフで購入できたキャンペーンチケット（終了済み）。',
    requiredMiles: 80,
    expiresAt: '2025-03-31T23:59:59+09:00',
    issueLimit: 300,
    redeemedCount: 217,
    status: 'EXPIRED',
    // 日本のお城・ミュージアムショップ
    thumbnailUrl: 'https://images.unsplash.com/photo-1581090700227-1e37b190418e?w=400&h=300&fit=crop',
  },
]
