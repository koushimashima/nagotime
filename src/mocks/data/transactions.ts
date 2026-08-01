// src/mocks/data/transactions.ts
// マイル取引履歴サンプルデータ（Requirements 8.1〜8.8）
// GRANT_REVIEW / GRANT_LIKES / GRANT_VIEWS / REDEEM_COUPON の各タイプを含む
// balanceAfter は時系列順に累積計算（残高が常に 0 以上）

import type { MileTransaction } from './types'

export const mockTransactions: MileTransaction[] = [
  // #1 — 口コミ投稿でマイル付与
  {
    transactionId: 'tx-001',
    userId: 'user-001',
    type: 'GRANT_REVIEW',
    amount: 100,
    balanceAfter: 100,
    relatedId: 'rev-001',
    createdAt: '2025-06-15T12:35:00+09:00',
  },
  // #2 — 口コミへのいいね数に応じてマイル付与
  {
    transactionId: 'tx-002',
    userId: 'user-001',
    type: 'GRANT_LIKES',
    amount: 42,
    balanceAfter: 142,
    relatedId: 'rev-001',
    createdAt: '2025-06-16T09:00:00+09:00',
  },
  // #3 — 口コミ閲覧数に応じてマイル付与
  {
    transactionId: 'tx-003',
    userId: 'user-001',
    type: 'GRANT_VIEWS',
    amount: 31,
    balanceAfter: 173,
    relatedId: 'rev-001',
    createdAt: '2025-06-17T09:00:00+09:00',
  },
  // #4 — 新しい口コミ投稿でマイル付与
  {
    transactionId: 'tx-004',
    userId: 'user-001',
    type: 'GRANT_REVIEW',
    amount: 100,
    balanceAfter: 273,
    relatedId: 'rev-007',
    createdAt: '2025-05-10T15:40:00+09:00',
  },
  // #5 — クーポン交換でマイル消費
  {
    transactionId: 'tx-005',
    userId: 'user-001',
    type: 'REDEEM_COUPON',
    amount: -80,
    balanceAfter: 193,
    relatedId: 'coupon-005',
    createdAt: '2025-05-12T11:00:00+09:00',
  },
  // #6 — 口コミへのいいね数に応じてマイル付与
  {
    transactionId: 'tx-006',
    userId: 'user-001',
    type: 'GRANT_LIKES',
    amount: 178,
    balanceAfter: 371,
    relatedId: 'rev-007',
    createdAt: '2025-05-20T09:00:00+09:00',
  },
  // #7 — 口コミ閲覧数に応じてマイル付与
  {
    transactionId: 'tx-007',
    userId: 'user-001',
    type: 'GRANT_VIEWS',
    amount: 105,
    balanceAfter: 476,
    relatedId: 'rev-007',
    createdAt: '2025-05-25T09:00:00+09:00',
  },
  // #8 — クーポン交換でマイル消費
  {
    transactionId: 'tx-008',
    userId: 'user-001',
    type: 'REDEEM_COUPON',
    amount: -150,
    balanceAfter: 326,
    relatedId: 'coupon-002',
    createdAt: '2025-06-01T14:30:00+09:00',
  },
  // #9 — 新しい口コミ投稿でマイル付与
  {
    transactionId: 'tx-009',
    userId: 'user-001',
    type: 'GRANT_REVIEW',
    amount: 100,
    balanceAfter: 426,
    relatedId: 'rev-019',
    createdAt: '2025-02-08T09:40:00+09:00',
  },
  // #10 — 口コミ閲覧数に応じてマイル付与
  {
    transactionId: 'tx-010',
    userId: 'user-001',
    type: 'GRANT_VIEWS',
    amount: 205,
    balanceAfter: 631,
    relatedId: 'rev-019',
    createdAt: '2025-03-01T09:00:00+09:00',
  },
]
