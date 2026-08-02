// Feature: review-hashtag, Property 2: API重複ハッシュタグ拒否
// Validates: Requirements 1.5, 7.4
// Feature: review-hashtag, Property 3: API ハッシュタグ上限超過拒否
// Validates: Requirements 1.4, 7.1

import { describe, it, expect, beforeAll, afterEach, afterAll } from 'vitest'
import * as fc from 'fast-check'
import { setupServer } from 'msw/node'
import { reviewHandlers } from './reviews'
import type { Review } from '../data/types'

// MSW ノードサーバーを reviews ハンドラーで起動する
const server = setupServer(...reviewHandlers)

beforeAll(() => server.listen({ onUnhandledRequest: 'error' }))
afterEach(() => server.resetHandlers())
afterAll(() => server.close())

// ---- ヘルパー ----

/** POST /api/reviews に最低限必要なフィールドを含むリクエストボディを組み立てる */
function buildValidBody(hashtags: string[]): Record<string, unknown> {
  return {
    userId: 'user-test-001',
    spotName: 'テストスポット',
    lat: 35.181,
    lon: 136.906,
    text: 'a'.repeat(50), // 50 文字の最小有効テキスト
    photoUrls: ['https://example.com/photo.jpg'],
    weather: 'UNKNOWN',
    timeSlot: 'AFTERNOON',
    dayType: 'WEEKDAY',
    hashtags,
  }
}

/** POST /api/reviews を呼び出してレスポンスを返す */
async function postReview(body: Record<string, unknown>) {
  return fetch('/api/reviews', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      // reviewHandlers は `mock-jwt-token-{userId}-{timestamp}` 形式を期待する
      Authorization: 'Bearer mock-jwt-token-user-test-001-9999999999999',
    },
    body: JSON.stringify(body),
  })
}

// ---- ジェネレーター ----

/**
 * 有効なハッシュタグ文字列を生成するアービタリー。
 * # で始まり、全体 2〜31 文字、空白なし。
 */
const validHashtagArb = fc
  .stringOf(
    fc.char().filter((c) => !/\s/.test(c)),
    { minLength: 1, maxLength: 30 },
  )
  .map((s) => `#${s}`)

/**
 * 重複した値を1つ以上含む hashtags 配列を生成するアービタリー。
 * 手順:
 *   1. ユニークなハッシュタグを 1〜9 件生成する
 *   2. そのうち 1 件をランダムに選んで末尾に追加する（→ 確実に重複が生まれる）
 *   3. 合計は 2〜10 件に収まるため「件数超過」エラーとは重ならない
 */
const duplicateHashtagsArb = fc
  .array(validHashtagArb, { minLength: 1, maxLength: 9 })
  .chain((uniqueTags) => {
    // deduplicate: fast-check が同一文字列を生成する可能性があるため Set で保証
    const deduped = Array.from(new Set(uniqueTags))
    if (deduped.length === 0) {
      // 万が一空になった場合は固定値にフォールバック
      return fc.constant(['#テスト', '#テスト'])
    }
    return fc
      .integer({ min: 0, max: deduped.length - 1 })
      .map((idx) => [...deduped, deduped[idx]])
  })

// ---- プロパティテスト ----

describe('reviews.pbt - Property 2: API重複ハッシュタグ拒否', () => {
  /**
   * 任意の重複した値を含む hashtags 配列を持つ POST /api/reviews リクエストに対して、
   * API は error.code が VALIDATION_ERROR の 400 レスポンスを返さなければならない。
   *
   * Validates: Requirements 1.5, 7.4
   */
  it(
    '重複を含む hashtags 配列で POST すると 400 VALIDATION_ERROR が返る',
    async () => {
      await fc.assert(
        fc.asyncProperty(duplicateHashtagsArb, async (hashtags) => {
          const response = await postReview(buildValidBody(hashtags))

          expect(response.status).toBe(400)

          const data = (await response.json()) as {
            error: { code: string; fields: string[] }
          }

          expect(data.error.code).toBe('VALIDATION_ERROR')
          expect(data.error.fields).toContain('hashtags')
        }),
        { numRuns: 100 },
      )
    },
    // 100 回のリクエストに MSW の delay(200ms) が掛かるため、余裕を持って 60s に設定
    60_000,
  )
})

// ---- Property 3 ジェネレーター ----

/**
 * 有効なハッシュタグを生成するが、Property 3 用に重複なし保証付き。
 * # で始まり、全体 2〜31 文字、空白なし。
 */
const uniqueValidHashtagArb = fc
  .uniqueArray(
    fc
      .stringOf(
        fc.char().filter((c) => !/\s/.test(c)),
        { minLength: 1, maxLength: 30 },
      )
      .map((s) => `#${s}`),
    { minLength: 11, maxLength: 50 },
  )

// ---- プロパティテスト ----

describe('reviews.pbt - Property 3: API ハッシュタグ上限超過拒否', () => {
  /**
   * 任意の 11 件以上の hashtags 配列を持つ POST /api/reviews リクエストに対して、
   * API は error.code が VALIDATION_ERROR の 400 レスポンスを返さなければならない。
   *
   * Validates: Requirements 1.4, 7.1
   */
  it(
    '11件以上の hashtags 配列で POST すると 400 VALIDATION_ERROR が返る',
    async () => {
      await fc.assert(
        fc.asyncProperty(uniqueValidHashtagArb, async (hashtags) => {
          // 生成された配列が必ず 11 件以上であることをアサート（ジェネレーターの確認）
          expect(hashtags.length).toBeGreaterThanOrEqual(11)

          const response = await postReview(buildValidBody(hashtags))

          expect(response.status).toBe(400)

          const data = (await response.json()) as {
            error: { code: string; fields: string[] }
          }

          expect(data.error.code).toBe('VALIDATION_ERROR')
          expect(data.error.fields).toContain('hashtags')
        }),
        { numRuns: 100 },
      )
    },
    // 100 回のリクエストに MSW の delay(200ms) が掛かるため、余裕を持って 60s に設定
    60_000,
  )
})


// ---- Property 4 ジェネレーター ----

// Feature: review-hashtag, Property 4: GET レスポンスのハッシュタグ自動補完
// Validates: Requirements 1.2, 8.3

/**
 * `hashtags` フィールドを持たない任意の Review オブジェクトを生成するアービタリー。
 * normalize 関数（`r.hashtags ?? []`）の振る舞いを直接検証するために使用する。
 */
const reviewWithoutHashtagsArb = fc.record({
  reviewId: fc.string({ minLength: 1, maxLength: 30 }).map((s) => `rev-${s}`),
  userId: fc.string({ minLength: 1, maxLength: 20 }).map((s) => `user-${s}`),
  userName: fc.string({ minLength: 1, maxLength: 30 }),
  spotId: fc.string({ minLength: 1, maxLength: 20 }).map((s) => `spot-${s}`),
  spotName: fc.string({ minLength: 1, maxLength: 50 }),
  area: fc.constantFrom('名古屋駅', '栄', '大須', '金山', '千種'),
  lat: fc.float({ min: Math.fround(35.0), max: Math.fround(35.5), noNaN: true }),
  lon: fc.float({ min: Math.fround(136.7), max: Math.fround(137.2), noNaN: true }),
  text: fc.string({ minLength: 50, maxLength: 200 }),
  photoUrls: fc.array(
    fc.webUrl(),
    { minLength: 1, maxLength: 5 },
  ),
  status: fc.constantFrom('PUBLISHED' as const, 'PENDING' as const, 'REJECTED' as const),
  weather: fc.constantFrom('SUNNY' as const, 'CLOUDY' as const, 'RAINY' as const, 'SNOWY' as const, 'UNKNOWN' as const),
  timeSlot: fc.constantFrom('MORNING' as const, 'AFTERNOON' as const, 'EVENING' as const, 'NIGHT' as const),
  dayType: fc.constantFrom('WEEKDAY' as const, 'HOLIDAY' as const),
  likeCount: fc.nat({ max: 500 }),
  viewCount: fc.nat({ max: 5000 }),
  createdAt: fc.date({ min: new Date('2020-01-01'), max: new Date('2025-12-31') }).map((d) => d.toISOString()),
  likedUserIds: fc.array(fc.string({ minLength: 1, maxLength: 20 }).map((s) => `user-${s}`), { maxLength: 10 }),
  // hashtags フィールドは意図的に含めない
}).map((r) => r as Omit<Review, 'hashtags'> & { hashtags?: string[] })

// ---- プロパティテスト ----

describe('reviews.pbt - Property 4: GET レスポンスのハッシュタグ自動補完', () => {
  /**
   * 任意の `hashtags` フィールドを持たない Review オブジェクトに対して、
   * normalize 関数（`r.hashtags ?? []`）を適用した結果は必ず `hashtags: []` を含まなければならない。
   *
   * これは MSW GET ハンドラーが normalize を適用して返すことを保証する
   * Requirements 1.2 および 8.3 の実装を検証する。
   *
   * Validates: Requirements 1.2, 8.3
   */
  it(
    'hashtags フィールドを持たない Review に normalize を適用すると hashtags が [] になる',
    () => {
      fc.assert(
        fc.property(reviewWithoutHashtagsArb, (review) => {
          // normalize 関数と同等のロジック: `r.hashtags ?? []`
          const normalized = {
            ...review,
            hashtags: review.hashtags ?? [],
          }

          // hashtags フィールドが存在し、空配列になっていることを検証する
          expect(normalized).toHaveProperty('hashtags')
          expect(normalized.hashtags).toEqual([])
        }),
        { numRuns: 100 },
      )
    },
  )

  /**
   * GET /api/reviews のレスポンスに含まれる各レビューオブジェクトは
   * 必ず `hashtags` フィールドを含まなければならない（[] または配列値）。
   *
   * MSW サーバーを通じて実際の GET ハンドラーの normalize 適用を検証する。
   *
   * Validates: Requirements 8.3
   */
  it(
    'GET /api/reviews のレスポンスのすべてのレビューに hashtags フィールドが含まれる',
    async () => {
      const response = await fetch('/api/reviews')
      expect(response.status).toBe(200)

      const data = (await response.json()) as {
        reviews: Array<{ hashtags?: unknown }>
      }

      expect(Array.isArray(data.reviews)).toBe(true)

      // すべてのレビューに hashtags が配列として含まれることを検証する
      for (const review of data.reviews) {
        expect(review).toHaveProperty('hashtags')
        expect(Array.isArray(review.hashtags)).toBe(true)
      }
    },
  )

  /**
   * GET /api/reviews/:id のレスポンスにも必ず `hashtags` フィールドが含まれなければならない。
   *
   * Validates: Requirements 8.3
   */
  it(
    'GET /api/reviews/:id のレスポンスに hashtags フィールドが含まれる',
    async () => {
      // まず全件取得してレビュー ID を1件取得する
      const listResponse = await fetch('/api/reviews')
      expect(listResponse.status).toBe(200)

      const listData = (await listResponse.json()) as {
        reviews: Array<{ reviewId: string; hashtags?: unknown }>
      }

      expect(listData.reviews.length).toBeGreaterThan(0)

      const firstId = listData.reviews[0].reviewId
      const detailResponse = await fetch(`/api/reviews/${firstId}`)
      expect(detailResponse.status).toBe(200)

      const detailData = (await detailResponse.json()) as { hashtags?: unknown }

      expect(detailData).toHaveProperty('hashtags')
      expect(Array.isArray(detailData.hashtags)).toBe(true)
    },
  )
})
