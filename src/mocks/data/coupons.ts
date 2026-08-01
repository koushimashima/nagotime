// src/mocks/data/coupons.ts
// クーポンサンプルデータ（Requirements 9.1〜9.5）
// ACTIVE / SOLD_OUT / EXPIRED の各ステータスを混在

import type { Coupon } from './types'

export const mockCoupons: Coupon[] = [
  // ---- ACTIVE（有効） ----
  {
    couponId: 'coupon-001',
    sponsorId: 'sponsor-001',
    sponsorName: '矢場とん',
    name: 'みそかつ定食 100マイル割引',
    description: '名古屋名物みそかつ定食を100マイルでワンドリンクサービス！ランチ・ディナー両方OK。',
    requiredMiles: 100,
    expiresAt: '2026-12-31T23:59:59+09:00',
    issueLimit: 200,
    redeemedCount: 58,
    status: 'ACTIVE',
    thumbnailUrl: 'https://picsum.photos/seed/coupon-001/400/300',
  },
  {
    couponId: 'coupon-002',
    sponsorId: 'sponsor-002',
    sponsorName: '覚王山カフェ「月の庭」',
    name: 'ハンドドリップコーヒー 無料券',
    description: '自家焙煎のスペシャルティコーヒーを1杯無料でご提供。ケーキとのセットもおすすめ。',
    requiredMiles: 150,
    expiresAt: '2026-09-30T23:59:59+09:00',
    issueLimit: 100,
    redeemedCount: 34,
    status: 'ACTIVE',
    thumbnailUrl: 'https://picsum.photos/seed/coupon-002/400/300',
  },
  {
    couponId: 'coupon-003',
    sponsorId: 'sponsor-003',
    sponsorName: '東山動植物園',
    name: '入園料 200マイル割引チケット',
    description: '大人入園料から200マイル分を割引。家族での来園にも使えます（1枚1名様）。',
    requiredMiles: 200,
    expiresAt: '2026-11-30T23:59:59+09:00',
    issueLimit: 500,
    redeemedCount: 122,
    status: 'ACTIVE',
    thumbnailUrl: 'https://picsum.photos/seed/coupon-003/400/300',
  },

  // ---- SOLD_OUT（売り切れ） ----
  {
    couponId: 'coupon-004',
    sponsorId: 'sponsor-004',
    sponsorName: '大須商店街 たこ焼き「浪速屋」',
    name: 'たこ焼き8個 50マイル引換券',
    description: 'ふわとろ大粒たこ焼き8個セットを50マイルで引換。人気のため完売しました。',
    requiredMiles: 50,
    expiresAt: '2026-08-31T23:59:59+09:00',
    issueLimit: 150,
    redeemedCount: 150,
    status: 'SOLD_OUT',
    thumbnailUrl: 'https://picsum.photos/seed/coupon-004/400/300',
  },

  // ---- EXPIRED（期限切れ） ----
  {
    couponId: 'coupon-005',
    sponsorId: 'sponsor-005',
    sponsorName: '名古屋城ミュージアムショップ',
    name: '限定グッズ 10%OFF クーポン',
    description: '名古屋城オリジナルグッズを10%オフで購入できたキャンペーンクーポン（終了済み）。',
    requiredMiles: 80,
    expiresAt: '2025-03-31T23:59:59+09:00',
    issueLimit: 300,
    redeemedCount: 217,
    status: 'EXPIRED',
    thumbnailUrl: 'https://picsum.photos/seed/coupon-005/400/300',
  },
]
