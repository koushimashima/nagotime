// src/mocks/handlers/reviews.ts
// 口コミ系ハンドラー（Requirements 1.1〜1.14, 3.1〜3.9, 4.1〜4.10, 5.1〜5.5, 7.1〜7.6）

import { http, HttpResponse, delay } from 'msw'
import { mockReviews as initialMockReviews } from '../data/reviews'
import type { Review, Weather, TimeSlot, DayType } from '../data/types'

// ---- メモリ上のミュータブルな口コミ配列 ----
// POST /api/reviews で追加されると GET /api/reviews にも反映される
let reviews: Review[] = [...initialMockReviews]

// ---- いいね重複チェック用 Set ----
// キー: `${userId}-${reviewId}`
const likedSet = new Set<string>()

// 初期データのいいね済み状態を likedSet に反映する
initialMockReviews.forEach((r) => {
  r.likedUserIds.forEach((uid) => {
    likedSet.add(`${uid}-${r.reviewId}`)
  })
})

// ---- ヘルパー関数 ----

/** Authorization ヘッダーからユーザーIDを抽出する（デモ用: トークンから取得） */
function extractUserId(authHeader: string | null): string | null {
  if (!authHeader || !authHeader.startsWith('Bearer ')) return null
  // トークン形式: mock-jwt-token-{userId}-{timestamp}
  const token = authHeader.slice(7)
  const match = token.match(/^mock-jwt-token-(.+)-\d+$/)
  return match ? match[1] : 'user-unknown'
}

/** 現在時刻から時間帯を判定する */
function getTimeSlot(date: Date): TimeSlot {
  const hour = date.getHours()
  if (hour >= 5 && hour <= 9) return 'MORNING'
  if (hour >= 10 && hour <= 16) return 'AFTERNOON'
  if (hour >= 17 && hour <= 20) return 'EVENING'
  return 'NIGHT'
}

/** 現在日付から平日/休日を判定する */
function getDayType(date: Date): DayType {
  const day = date.getDay()
  return day === 0 || day === 6 ? 'HOLIDAY' : 'WEEKDAY'
}

/** Haversine 距離計算（メートル単位） */
function haversine(lat1: number, lon1: number, lat2: number, lon2: number): number {
  const R = 6371000
  const toRad = (deg: number) => (deg * Math.PI) / 180
  const dLat = toRad(lat2 - lat1)
  const dLon = toRad(lon2 - lon1)
  const a =
    Math.sin(dLat / 2) ** 2 +
    Math.cos(toRad(lat1)) * Math.cos(toRad(lat2)) * Math.sin(dLon / 2) ** 2
  return R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a))
}

/** 天気スコア: 一致 → 1.0、不一致 → 0.0 */
function calcWeatherScore(reviewWeather: Weather, currentWeather: Weather): number {
  return reviewWeather === currentWeather ? 1.0 : 0.0
}

/** 時間帯スコア: 完全一致 → 1.0、隣接 → 0.5、それ以外 → 0.0 */
function calcTimeSlotScore(reviewSlot: TimeSlot, currentSlot: TimeSlot): number {
  if (reviewSlot === currentSlot) return 1.0
  const order: TimeSlot[] = ['MORNING', 'AFTERNOON', 'EVENING', 'NIGHT']
  const reviewIdx = order.indexOf(reviewSlot)
  const currentIdx = order.indexOf(currentSlot)
  return Math.abs(reviewIdx - currentIdx) === 1 ? 0.5 : 0.0
}

/** 距離スコア: Math.max(0, 1 - distanceM / 5000) */
function calcDistanceScore(distanceM: number): number {
  return Math.max(0, 1 - distanceM / 5000)
}

/** いいねスコア: Math.min(1.0, likeCount / 100) */
function calcLikeScore(likeCount: number): number {
  return Math.min(1.0, likeCount / 100)
}

/** 合計スコア: 天気×0.30 + 時間帯×0.25 + 距離×0.30 + いいね×0.15 */
function calcTotalScore(
  weatherScore: number,
  timeScore: number,
  distanceScore: number,
  likeScore: number,
): number {
  return weatherScore * 0.3 + timeScore * 0.25 + distanceScore * 0.3 + likeScore * 0.15
}

/**
 * レビューオブジェクトを正規化する。
 * `hashtags` フィールドが未定義の場合は `[]` にデフォルトする（Requirements 8.3）。
 */
const normalize = (r: Review): Review => ({
  ...r,
  hashtags: r.hashtags ?? [],
})

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
function notFoundResponse() {
  return HttpResponse.json(
    {
      error: {
        code: 'NOT_FOUND',
        message: '指定された口コミが見つかりません',
        fields: [],
      },
    },
    { status: 404 },
  )
}

// ---- ハンドラー一覧 ----

export const reviewHandlers = [
  /**
   * GET /api/reviews
   * フィルタリング・ページネーション（カーソルベース）・降順ソートを実装。
   * 認証不要。PUBLISHED の口コミのみ返す。
   * Requirements: 3.1〜3.9
   */
  http.get('/api/reviews', async ({ request }) => {
    await delay(200)

    const url = new URL(request.url)
    const area = url.searchParams.get('area')
    const weather = url.searchParams.get('weather') as Weather | null
    const timeSlot = url.searchParams.get('timeSlot') as TimeSlot | null
    const dayType = url.searchParams.get('dayType') as DayType | null
    const cursor = url.searchParams.get('cursor')
    const limitParam = url.searchParams.get('limit')
    const limit = limitParam ? Math.min(parseInt(limitParam, 10) || 20, 20) : 20

    // PUBLISHED のみ（Requirements 3.1）
    let filtered = reviews.filter((r) => r.status === 'PUBLISHED')

    // AND 条件フィルタリング（Requirements 3.5）
    if (area) filtered = filtered.filter((r) => r.area === area)
    if (weather) filtered = filtered.filter((r) => r.weather === weather)
    if (timeSlot) filtered = filtered.filter((r) => r.timeSlot === timeSlot)
    if (dayType) filtered = filtered.filter((r) => r.dayType === dayType)

    // createdAt 降順ソート（Requirements 3.2）
    filtered.sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime())

    const total = filtered.length

    // カーソルベースページネーション（Requirements 3.3, 3.4, 3.9）
    let startIndex = 0
    if (cursor) {
      const cursorIndex = filtered.findIndex((r) => r.reviewId === cursor)
      if (cursorIndex === -1) {
        // 無効なカーソル（Requirements 3.9）
        return HttpResponse.json(
          {
            error: {
              code: 'INVALID_CURSOR',
              message: '無効なページネーションカーソルです',
              fields: [],
            },
          },
          { status: 400 },
        )
      }
      startIndex = cursorIndex + 1
    }

    const page = filtered.slice(startIndex, startIndex + limit)
    const nextCursor = startIndex + limit < total ? page[page.length - 1]?.reviewId ?? null : null

    return HttpResponse.json({
      reviews: page.map(normalize),
      nextCursor,
      total,
    })
  }),

  /**
   * GET /api/reviews/recommend
   * コンテキスト対応レコメンド。
   * 認証不要。スコアリングして降順ソートして最大20件を返す。
   * Requirements: 4.1〜4.10
   *
   * ※ MSW のルートマッチング順序上、`/api/reviews/:id` より先に定義すること。
   */
  http.get('/api/reviews/recommend', async ({ request }) => {
    await delay(200)

    const url = new URL(request.url)
    const latParam = url.searchParams.get('lat')
    const lonParam = url.searchParams.get('lon')
    const weather = (url.searchParams.get('weather') as Weather | null) ?? 'UNKNOWN'
    const timeSlot = (url.searchParams.get('timeSlot') as TimeSlot | null) ?? 'AFTERNOON'

    const lat = latParam !== null ? parseFloat(latParam) : NaN
    const lon = lonParam !== null ? parseFloat(lonParam) : NaN

    // 緯度経度バリデーション（Requirements 4.9）
    if (
      isNaN(lat) ||
      isNaN(lon) ||
      lat < -90 ||
      lat > 90 ||
      lon < -180 ||
      lon > 180
    ) {
      return HttpResponse.json(
        {
          error: {
            code: 'VALIDATION_ERROR',
            message: '緯度は-90〜90、経度は-180〜180の範囲で指定してください',
            fields: ['lat', 'lon'],
          },
        },
        { status: 400 },
      )
    }

    // PUBLISHED のみ（Requirements 4.8）
    const published = reviews.filter((r) => r.status === 'PUBLISHED')

    // スコアリングして降順ソート（Requirements 4.1〜4.10）
    const scored = published.map((r) => {
      const distM = haversine(lat, lon, r.lat, r.lon)
      const weatherScore = calcWeatherScore(r.weather, weather as Weather)
      const timeScore = calcTimeSlotScore(r.timeSlot, timeSlot as TimeSlot)
      const distScore = calcDistanceScore(distM)
      const likeScore = calcLikeScore(r.likeCount)
      const totalScore = calcTotalScore(weatherScore, timeScore, distScore, likeScore)
      return { review: r, score: totalScore }
    })

    scored.sort((a, b) => b.score - a.score)

    const resultReviews = scored.slice(0, 20).map((s) => normalize(s.review))

    return HttpResponse.json({ reviews: resultReviews })
  }),

  /**
   * GET /api/reviews/:id
   * 口コミ詳細を返す。viewCount をインクリメントする。
   * 認証不要。存在しない ID または PUBLISHED 以外は 404。
   * Requirements: 5.1〜5.5
   */
  http.get('/api/reviews/:id', async ({ params }) => {
    await delay(200)

    const { id } = params
    const reviewIndex = reviews.findIndex((r) => r.reviewId === id)

    if (reviewIndex === -1) {
      return notFoundResponse()
    }

    const review = reviews[reviewIndex]

    // PUBLISHED 以外は 404（Requirements 5.2, 5.3）
    if (review.status !== 'PUBLISHED') {
      return notFoundResponse()
    }

    // viewCount をインクリメント（Requirements 5.4, 5.5）
    reviews[reviewIndex] = { ...review, viewCount: review.viewCount + 1 }

    return HttpResponse.json(normalize(reviews[reviewIndex]))
  }),

  /**
   * POST /api/reviews
   * バリデーション → メモリ上の配列に追加 → 201 を返す。
   * 認証必須。
   * Requirements: 1.1〜1.14
   */
  http.post('/api/reviews', async ({ request }) => {
    await delay(200)

    // 認証チェック（Requirements 11.1, 11.3）
    const authHeader = request.headers.get('Authorization')
    const userId = extractUserId(authHeader)
    if (!userId) {
      return unauthorizedResponse()
    }

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

    const validationErrors: string[] = []

    // text バリデーション（Requirements 1.2, 1.8）
    const text = body.text
    if (typeof text !== 'string' || text.length < 50 || text.length > 1000) {
      validationErrors.push('text')
    }

    // photoUrls バリデーション（Requirements 1.3, 1.9）
    const photoUrls = body.photoUrls
    if (
      !Array.isArray(photoUrls) ||
      photoUrls.length < 1 ||
      photoUrls.length > 5
    ) {
      validationErrors.push('photoUrls')
    }

    // spotName バリデーション（Requirements 1.7, 1.10）
    const spotName = body.spotName
    if (typeof spotName !== 'string' || spotName.length < 1 || spotName.length > 100) {
      validationErrors.push('spotName')
    }

    // lat バリデーション（Requirements 1.7, 1.10）
    const lat = body.lat
    if (typeof lat !== 'number' || isNaN(lat) || lat < -90 || lat > 90) {
      validationErrors.push('lat')
    }

    // lon バリデーション（Requirements 1.7, 1.10）
    const lon = body.lon
    if (typeof lon !== 'number' || isNaN(lon) || lon < -180 || lon > 180) {
      validationErrors.push('lon')
    }

    // hashtags バリデーション（Requirements 7.1〜7.5）
    const hashtags = body.hashtags ?? []
    if (Array.isArray(hashtags)) {
      // 上限チェック（Requirements 7.1）
      if (hashtags.length > 10) {
        validationErrors.push('hashtags')
      }
      // 各ハッシュタグの形式チェック（Requirements 7.2, 7.3）
      const hasInvalid = hashtags.some(
        (tag: unknown) =>
          typeof tag !== 'string' ||
          tag.length > 31 ||
          /\s/.test(tag)
      )
      if (hasInvalid) validationErrors.push('hashtags')
      // 重複チェック（Requirements 7.4）
      if (new Set(hashtags).size !== hashtags.length) {
        validationErrors.push('hashtags')
      }
    }

    if (validationErrors.length > 0) {
      // バリデーションエラーの具体的なメッセージを組み立てる
      let message = '入力内容にエラーがあります'
      if (validationErrors.includes('text')) {
        message = 'テキストは50文字以上1000文字以下で入力してください'
      } else if (validationErrors.includes('photoUrls')) {
        message = '写真は1枚以上5枚以下で添付してください'
      } else if (validationErrors.some((f) => ['spotName', 'lat', 'lon'].includes(f))) {
        message = `欠落または無効なフィールドがあります: ${validationErrors.join(', ')}`
      }

      return HttpResponse.json(
        {
          error: {
            code: 'VALIDATION_ERROR',
            message,
            fields: validationErrors,
          },
        },
        { status: 400 },
      )
    }

    // 自動設定フィールドの計算
    const now = new Date()
    const timeSlot = getTimeSlot(now)
    const dayType = getDayType(now)

    const newReview: Review = {
      reviewId: `rev-${Date.now()}-${Math.random().toString(36).slice(2, 9)}`,
      userId,
      userName: body.userName as string ?? 'ゲストユーザー',
      spotId: body.spotId as string ?? `spot-${Date.now()}`,
      spotName: spotName as string,
      area: body.area as string ?? '',
      lat: lat as number,
      lon: lon as number,
      text: text as string,
      photoUrls: photoUrls as string[],
      status: 'PUBLISHED',
      weather: 'UNKNOWN',     // 外部天気 API 非使用のためデフォルト（Requirements 1.11）
      timeSlot,
      dayType,
      likeCount: 0,
      viewCount: 0,
      createdAt: now.toISOString(),
      likedUserIds: [],
      hashtags: Array.isArray(hashtags) ? hashtags as string[] : [],
    }

    // メモリ上の配列の先頭に追加（以降の GET に反映される）
    reviews = [newReview, ...reviews]

    return HttpResponse.json(newReview, { status: 201 })
  }),

  /**
   * POST /api/reviews/:id/like
   * 重複チェック → likeCount インクリメント → 200 を返す。
   * 認証必須。
   * Requirements: 7.1〜7.6
   */
  http.post('/api/reviews/:id/like', async ({ params, request }) => {
    await delay(200)

    // 認証チェック（Requirements 11.3）
    const authHeader = request.headers.get('Authorization')
    const userId = extractUserId(authHeader)
    if (!userId) {
      return unauthorizedResponse()
    }

    const { id } = params
    const reviewIndex = reviews.findIndex((r) => r.reviewId === id)

    // 存在しない ID（Requirements 7.4）
    if (reviewIndex === -1) {
      return notFoundResponse()
    }

    const review = reviews[reviewIndex]
    const likeKey = `${userId}-${review.reviewId}`

    // 重複いいねチェック（Requirements 7.2, 7.3）
    if (likedSet.has(likeKey)) {
      return HttpResponse.json(
        {
          error: {
            code: 'DUPLICATE_LIKE',
            message: 'すでにいいね済みです',
            fields: [],
          },
        },
        { status: 409 },
      )
    }

    // likeCount インクリメント（Requirements 7.1）
    likedSet.add(likeKey)
    const updatedReview: Review = {
      ...review,
      likeCount: review.likeCount + 1,
      likedUserIds: [...review.likedUserIds, userId],
    }
    reviews[reviewIndex] = updatedReview

    return HttpResponse.json({ likeCount: updatedReview.likeCount })
  }),
]
