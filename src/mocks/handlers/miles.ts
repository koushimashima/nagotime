// src/mocks/handlers/miles.ts
// マイル系ハンドラー（Requirements 8.1〜8.8）

import { http, HttpResponse, delay } from 'msw'
import { mockUsers } from '../data/users'
import { mockTransactions } from '../data/transactions'
import { mockCoupons } from '../data/coupons'
import type { MileTransaction, Coupon } from '../data/types'

// ---- メモリ上のミュータブルなデータ ----
// ユーザーのマイル残高（userId → 残高）
const userBalances = new Map<string, number>(
  mockUsers.map((u) => [u.userId, u.mileBalance]),
)

// 取引履歴（userId → 取引履歴配列）
const userTransactions = new Map<string, MileTransaction[]>()
mockTransactions.forEach((tx) => {
  const list = userTransactions.get(tx.userId) ?? []
  userTransactions.set(tx.userId, [...list, tx])
})

// クーポン（redeemedCount / status が更新される）
let coupons: Coupon[] = [...mockCoupons]

// ---- ヘルパー関数 ----

/** Authorization ヘッダーからユーザーIDを抽出する（デモ用） */
function extractUserId(authHeader: string | null): string | null {
  if (!authHeader || !authHeader.startsWith('Bearer ')) return null
  const token = authHeader.slice(7)
  const match = token.match(/^mock-jwt-token-(.+)-\d+$/)
  return match ? match[1] : 'user-unknown'
}

/**
 * クーポンコードを生成する。
 * 英数字 [a-zA-Z0-9] のランダム16文字（Requirements 8.6）
 */
function generateCouponCode(): string {
  const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789'
  let code = ''
  for (let i = 0; i < 16; i++) {
    code += chars.charAt(Math.floor(Math.random() * chars.length))
  }
  return code
}

/** 401 レスポンスを生成する */
function unauthorizedResponse() {
  return HttpResponse.json(
    {
      error: {
        code: 'UNAUTHORIZED',
        message: '認証が必要です',
        fields: [],
      },
    },
    { status: 401 },
  )
}

/** 404 レスポンスを生成する */
function userNotFoundResponse() {
  return HttpResponse.json(
    {
      error: {
        code: 'NOT_FOUND',
        message: '指定されたユーザーが見つかりません',
        fields: [],
      },
    },
    { status: 404 },
  )
}

export const mileHandlers = [
  /**
   * GET /api/miles
   * 認証済みユーザーのマイル残高と直近10件の取引履歴を返す。
   * Authorization ヘッダーなしで 401。
   * Requirements: 8.1, 8.2, 8.8, 11.2, 11.3
   */
  http.get('/api/miles', async ({ request }) => {
    await delay(300)

    // 認証チェック（Requirements 11.2, 11.3）
    const authHeader = request.headers.get('Authorization')
    const userId = extractUserId(authHeader)
    if (!userId) {
      return unauthorizedResponse()
    }

    // ユーザー存在チェック（Requirements 8.8）
    const balance = userBalances.get(userId)
    if (balance === undefined) {
      return userNotFoundResponse()
    }

    // 直近10件の取引履歴（createdAt 降順）（Requirements 8.2）
    const transactions = (userTransactions.get(userId) ?? [])
      .slice()
      .sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime())
      .slice(0, 10)

    return HttpResponse.json({
      balance,
      transactions,
    })
  }),

  /**
   * POST /api/miles/redeem
   * クーポンとマイルを交換する。
   * - 残高不足 → 409 INSUFFICIENT_MILES
   * - クーポン売り切れ → 409 COUPON_SOLD_OUT
   * - クーポン期限切れ → 409 COUPON_EXPIRED
   * - 成功 → クーポンコードを返す
   * Requirements: 8.3〜8.6, 9.4, 9.5
   */
  http.post('/api/miles/redeem', async ({ request }) => {
    await delay(300)

    // 認証チェック（Requirements 11.2, 11.3）
    const authHeader = request.headers.get('Authorization')
    const userId = extractUserId(authHeader)
    if (!userId) {
      return unauthorizedResponse()
    }

    // リクエストボディのパース
    let body: { couponId?: string }
    try {
      body = (await request.json()) as { couponId?: string }
    } catch {
      return HttpResponse.json(
        {
          error: {
            code: 'VALIDATION_ERROR',
            message: 'リクエストボディが不正です',
            fields: [],
          },
        },
        { status: 400 },
      )
    }

    const { couponId } = body

    if (!couponId) {
      return HttpResponse.json(
        {
          error: {
            code: 'VALIDATION_ERROR',
            message: 'couponId は必須です',
            fields: ['couponId'],
          },
        },
        { status: 400 },
      )
    }

    // ユーザー存在チェック（Requirements 8.8）
    const balance = userBalances.get(userId)
    if (balance === undefined) {
      return userNotFoundResponse()
    }

    // クーポン存在チェック
    const couponIndex = coupons.findIndex((c) => c.couponId === couponId)
    if (couponIndex === -1) {
      return HttpResponse.json(
        {
          error: {
            code: 'NOT_FOUND',
            message: '指定されたクーポンが見つかりません',
            fields: ['couponId'],
          },
        },
        { status: 404 },
      )
    }

    const coupon = coupons[couponIndex]

    // クーポン期限切れチェック（Requirements 9.5）
    if (coupon.status === 'EXPIRED' || new Date(coupon.expiresAt) < new Date()) {
      return HttpResponse.json(
        {
          error: {
            code: 'COUPON_EXPIRED',
            message: 'このクーポンは有効期限が切れています',
            fields: [],
          },
        },
        { status: 409 },
      )
    }

    // クーポン売り切れチェック（Requirements 9.4）
    if (coupon.status === 'SOLD_OUT' || coupon.redeemedCount >= coupon.issueLimit) {
      return HttpResponse.json(
        {
          error: {
            code: 'COUPON_SOLD_OUT',
            message: 'このクーポンは売り切れです',
            fields: [],
          },
        },
        { status: 409 },
      )
    }

    // 残高不足チェック（Requirements 8.5）
    if (balance < coupon.requiredMiles) {
      return HttpResponse.json(
        {
          error: {
            code: 'INSUFFICIENT_MILES',
            message: `マイルが不足しています。現在の残高: ${balance}マイル、必要マイル: ${coupon.requiredMiles}マイル（あと${coupon.requiredMiles - balance}マイル必要です）`,
            fields: [],
            currentBalance: balance,
            requiredMiles: coupon.requiredMiles,
            shortfall: coupon.requiredMiles - balance,
          },
        },
        { status: 409 },
      )
    }

    // ---- 交換処理 ----

    // マイルを差し引く（Requirements 8.4）
    const newBalance = balance - coupon.requiredMiles
    userBalances.set(userId, newBalance)

    // 取引履歴に追加（Requirements 8.1, 8.3）
    const newTransaction: MileTransaction = {
      transactionId: `tx-${Date.now()}-${Math.random().toString(36).slice(2, 9)}`,
      userId,
      type: 'REDEEM_COUPON',
      amount: -coupon.requiredMiles,
      balanceAfter: newBalance,
      relatedId: couponId,
      createdAt: new Date().toISOString(),
    }
    const existingTx = userTransactions.get(userId) ?? []
    userTransactions.set(userId, [...existingTx, newTransaction])

    // クーポンの redeemedCount をインクリメントし、上限に達したら SOLD_OUT に更新
    const newRedeemedCount = coupon.redeemedCount + 1
    const newStatus =
      newRedeemedCount >= coupon.issueLimit ? 'SOLD_OUT' : coupon.status
    coupons[couponIndex] = {
      ...coupon,
      redeemedCount: newRedeemedCount,
      status: newStatus,
    }

    // クーポンコードを生成（Requirements 8.6）
    const couponCode = generateCouponCode()

    return HttpResponse.json(
      {
        couponCode,
        couponName: coupon.name,
        newBalance,
        transaction: newTransaction,
      },
      { status: 200 },
    )
  }),

  /**
   * GET /api/coupons/active
   * 一般ユーザー向けの有効クーポン一覧を返す（認証不要）。
   * ACTIVE かつ有効期限内・在庫あり のクーポンのみを返す。
   * Requirements: 8.2
   */
  http.get('/api/coupons/active', async () => {
    await delay(200)

    const now = new Date()
    const activeCoupons = coupons.filter(
      (c) =>
        c.status === 'ACTIVE' &&
        new Date(c.expiresAt) >= now &&
        c.redeemedCount < c.issueLimit,
    )

    return HttpResponse.json({
      coupons: activeCoupons,
      total: activeCoupons.length,
    })
  }),
]

// メモリ上のクーポン配列を他モジュール（coupons.ts ハンドラー）と共有するためのアクセサ
export function getCoupons(): Coupon[] {
  return coupons
}

export function setCoupons(updated: Coupon[]): void {
  coupons = updated
}
