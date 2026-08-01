// src/mocks/handlers/coupons.ts
// クーポン管理ハンドラー（Requirements 9.1〜9.5）

import { http, HttpResponse, delay } from 'msw'
import { getCoupons, setCoupons } from './miles'
import type { Coupon } from '../data/types'

// ---- ヘルパー関数 ----

/** Authorization ヘッダーからユーザーIDとロールを抽出する（デモ用） */
function extractAuth(authHeader: string | null): { userId: string | null; role: string | null } {
  if (!authHeader || !authHeader.startsWith('Bearer ')) return { userId: null, role: null }
  // トークン形式: mock-jwt-token-{userId}-{timestamp}
  const token = authHeader.slice(7)
  const match = token.match(/^mock-jwt-token-(.+)-\d+$/)
  if (!match) return { userId: 'user-unknown', role: 'user' }
  const userId = match[1]
  // admin-001 は sponsor-admin ロールとして扱う
  const role = userId.startsWith('admin') ? 'sponsor-admin' : 'user'
  return { userId, role }
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

/** 403 レスポンスを生成する */
function forbiddenResponse() {
  return HttpResponse.json(
    {
      error: {
        code: 'FORBIDDEN',
        message: 'この操作にはsponsor-adminロールが必要です',
        fields: [],
      },
    },
    { status: 403 },
  )
}

export const couponHandlers = [
  /**
   * GET /api/coupons
   * sponsor-admin ロールのみ許可。クーポン一覧を返す。
   * - Authorization ヘッダーなし → 401
   * - sponsor-admin 以外 → 403
   * Requirements: 9.1〜9.5
   */
  http.get('/api/coupons', async ({ request }) => {
    await delay(300)

    // 認証チェック
    const authHeader = request.headers.get('Authorization')
    const { userId, role } = extractAuth(authHeader)

    if (!userId) {
      return unauthorizedResponse()
    }

    // ロールチェック（Requirements 9.3 + セキュリティ要件）
    if (role !== 'sponsor-admin') {
      return forbiddenResponse()
    }

    const coupons = getCoupons()

    // 期限切れチェックを実行してステータスを最新化（Requirements 9.5）
    const now = new Date()
    const updatedCoupons = coupons.map((coupon) => {
      if (coupon.status === 'ACTIVE' && new Date(coupon.expiresAt) < now) {
        return { ...coupon, status: 'EXPIRED' as const }
      }
      return coupon
    })

    // 変更があれば保存
    const hasChanges = updatedCoupons.some(
      (c, i) => c.status !== coupons[i].status,
    )
    if (hasChanges) {
      setCoupons(updatedCoupons)
    }

    return HttpResponse.json({
      coupons: updatedCoupons,
      total: updatedCoupons.length,
    })
  }),

  /**
   * POST /api/coupons
   * クーポン登録（管理者用）。バリデーション → メモリ配列に追加 → 201。
   * - Authorization ヘッダーなし → 401
   * - sponsor-admin 以外 → 403
   * - バリデーション失敗 → 400
   * Requirements: 9.1, 9.2
   */
  http.post('/api/coupons', async ({ request }) => {
    await delay(300)

    // 認証チェック
    const authHeader = request.headers.get('Authorization')
    const { userId, role } = extractAuth(authHeader)

    if (!userId) {
      return unauthorizedResponse()
    }

    // ロールチェック
    if (role !== 'sponsor-admin') {
      return forbiddenResponse()
    }

    // リクエストボディのパース
    let body: Record<string, unknown>
    try {
      body = (await request.json()) as Record<string, unknown>
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

    // ---- バリデーション（Requirements 9.1, 9.2） ----
    const validationErrors: string[] = []

    // クーポン名: 1〜100文字
    const name = body.name
    if (typeof name !== 'string' || name.length < 1 || name.length > 100) {
      validationErrors.push('name')
    }

    // 説明: 最大500文字（空文字はOK）
    const description = body.description
    if (typeof description !== 'string' || description.length > 500) {
      validationErrors.push('description')
    }

    // 必要マイル数: 1以上の整数
    const requiredMiles = body.requiredMiles
    if (
      typeof requiredMiles !== 'number' ||
      !Number.isInteger(requiredMiles) ||
      requiredMiles < 1
    ) {
      validationErrors.push('requiredMiles')
    }

    // 有効期限: ISO 8601 形式の文字列
    const expiresAt = body.expiresAt
    if (typeof expiresAt !== 'string' || isNaN(Date.parse(expiresAt))) {
      validationErrors.push('expiresAt')
    }

    // 発行枚数上限: 1以上の整数
    const issueLimit = body.issueLimit
    if (
      typeof issueLimit !== 'number' ||
      !Number.isInteger(issueLimit) ||
      issueLimit < 1
    ) {
      validationErrors.push('issueLimit')
    }

    if (validationErrors.length > 0) {
      return HttpResponse.json(
        {
          error: {
            code: 'VALIDATION_ERROR',
            message: `入力内容にエラーがあります: ${validationErrors.join(', ')}`,
            fields: validationErrors,
          },
        },
        { status: 400 },
      )
    }

    // 新しいクーポンを作成してメモリ配列に追加
    const now = new Date()
    const isExpired = new Date(expiresAt as string) < now

    const newCoupon: Coupon = {
      couponId: `coupon-${Date.now()}-${Math.random().toString(36).slice(2, 9)}`,
      sponsorId: userId,
      sponsorName: (body.sponsorName as string) ?? '協賛企業',
      name: name as string,
      description: description as string,
      requiredMiles: requiredMiles as number,
      expiresAt: expiresAt as string,
      issueLimit: issueLimit as number,
      redeemedCount: 0,
      status: isExpired ? 'EXPIRED' : 'ACTIVE',
      thumbnailUrl: (body.thumbnailUrl as string | null) ?? null,
    }

    setCoupons([...getCoupons(), newCoupon])

    return HttpResponse.json(newCoupon, { status: 201 })
  }),
]
