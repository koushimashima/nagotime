// src/mocks/handlers/auth.ts
// 認証ハンドラー（Requirements 11.1〜11.5）

import { http, HttpResponse, delay } from 'msw'
import { findUserByEmail } from '../data/users'

/** デモ版で受け付けるパスワード（モック固定値） */
const DEMO_PASSWORD = 'password'

/** モック用 JWT トークン（実際には検証しない） */
function generateMockToken(userId: string): string {
  return `mock-jwt-token-${userId}-${Date.now()}`
}

export const authHandlers = [
  /**
   * POST /api/auth/login
   * メール/パスワードを照合し、成功時は User オブジェクトと token を返す。
   * 失敗時は 401 とエラーオブジェクトを返す。
   * Requirements: 11.1, 11.3, 11.4, 11.5
   */
  http.post('/api/auth/login', async ({ request }) => {
    await delay(200)

    let body: { email?: string; password?: string }
    try {
      body = (await request.json()) as { email?: string; password?: string }
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

    const { email, password } = body

    if (!email || !password) {
      return HttpResponse.json(
        {
          error: {
            code: 'VALIDATION_ERROR',
            message: 'メールアドレスとパスワードを入力してください',
            fields: [!email ? 'email' : null, !password ? 'password' : null].filter(
              Boolean,
            ) as string[],
          },
        },
        { status: 400 },
      )
    }

    const user = findUserByEmail(email)

    if (!user || password !== DEMO_PASSWORD) {
      return HttpResponse.json(
        {
          error: {
            code: 'UNAUTHORIZED',
            message: 'メールアドレスまたはパスワードが正しくありません',
            fields: [],
          },
        },
        { status: 401 },
      )
    }

    const token = generateMockToken(user.userId)

    return HttpResponse.json(
      {
        user,
        token,
      },
      { status: 200 },
    )
  }),

  /**
   * POST /api/auth/logout
   * Authorization ヘッダーを確認し、成功レスポンスを返す。
   * ヘッダーが無い場合は 401 を返す。
   * Requirements: 11.1, 11.3
   */
  http.post('/api/auth/logout', async ({ request }) => {
    await delay(200)

    const authHeader = request.headers.get('Authorization')

    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return HttpResponse.json(
        {
          error: {
            code: 'UNAUTHORIZED',
            message: '認証トークンが必要です',
            fields: [],
          },
        },
        { status: 401 },
      )
    }

    return HttpResponse.json({ success: true }, { status: 200 })
  }),
]
