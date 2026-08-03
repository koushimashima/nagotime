// Bug Condition Exploration Test + Preservation Tests
// Spec: hashtag-overflow-display-fix
// Validates: Requirements 1.1, 1.2, 3.1, 3.2, 3.3
//
// Property 1 (Bug Condition):
//   - 4件以上のハッシュタグがすべて DOM に描画される
//   - 「+N」のようなオーバーフローインジケーターが表示されない
//   - EXPECTED OUTCOME on UNFIXED code: FAIL
//   - EXPECTED OUTCOME on FIXED code: PASS
//
// Property 2 (Preservation):
//   - 3件以下・0件のハッシュタグでの既存動作が変わらない
//   - ハッシュタグ以外の要素（いいね数・写真・aria-label）が常に正しく表示される
//   - EXPECTED OUTCOME: PASS (confirms baseline behavior to preserve)

import { describe, it, expect, afterEach } from 'vitest'
import * as fc from 'fast-check'
import { render, screen, cleanup, within } from '@testing-library/react'
import { ReviewCard } from './ReviewCard'
import type { Review } from '../../mocks/data/types'

// ---- ヘルパー ----

function makeReview(hashtags: string[], overrides?: Partial<Review>): Review {
  return {
    reviewId: 'test-id',
    userId: 'user-1',
    userName: 'テストユーザー',
    spotId: 'spot-1',
    spotName: 'テストスポット',
    area: '名古屋',
    lat: 35.1815,
    lon: 136.9066,
    text: 'テスト口コミ',
    photoUrls: ['https://example.com/photo.jpg'],
    status: 'PUBLISHED',
    weather: 'SUNNY',
    timeSlot: 'AFTERNOON',
    dayType: 'WEEKDAY',
    likeCount: 0,
    viewCount: 0,
    createdAt: '2024-01-01T00:00:00Z',
    likedUserIds: [],
    hashtags,
    ...overrides,
  }
}

afterEach(() => {
  cleanup()
})

// ---- ジェネレーター ----

/**
 * 4件以上のユニークなハッシュタグ配列を生成する（Bug Condition: hashtags.length >= 4）
 */
const hashtagsOver3Arb = fc
  .integer({ min: 4, max: 8 })
  .map((n) => Array.from({ length: n }, (_, i) => `#hashtag${i + 1}`))

/**
 * 1〜3件のユニークなハッシュタグ配列を生成する（Preservation: hashtags.length in [1, 2, 3]）
 */
const hashtagsUpTo3Arb = fc
  .integer({ min: 1, max: 3 })
  .map((n) => Array.from({ length: n }, (_, i) => `#hashtag${i + 1}`))

/**
 * いいね数のアービタリー（0〜9999）
 */
const likeCountArb = fc.integer({ min: 0, max: 9999 })

/**
 * スポット名のアービタリー
 */
const spotNameArb = fc.constantFrom('テストスポット', 'カフェA', '名古屋城', '大須商店街', 'オアシス21')

/**
 * ユーザー名のアービタリー
 */
const userNameArb = fc.constantFrom('ユーザーA', 'テストユーザー', 'たろう', 'はなこ')

// ---- プロパティテスト ----

describe('ReviewCard.hashtag-overflow.pbt - Bug Condition: 4件以上ハッシュタグの全件表示', () => {
  /**
   * Property 1: Bug Condition
   * 4件以上のハッシュタグを持つレビューに対して:
   *   - すべてのハッシュタグテキストが DOM に存在すること（Expected Behavior）
   *   - 「+」から始まるオーバーフローインジケーターが存在しないこと（Expected Behavior）
   *
   * Bug Condition: hashtags.length >= 4
   * EXPECTED OUTCOME on UNFIXED code: FAIL
   *   カウンターエグザンプル例: 4件目以降のタグが描画されない、+2 というノードが存在する
   *
   * Validates: Requirements 1.1, 1.2
   */
  it(
    'N >= 4 のとき、すべてのハッシュタグが DOM に存在し +N インジケーターが存在しない',
    () => {
      fc.assert(
        fc.property(hashtagsOver3Arb, (hashtags) => {
          const review = makeReview(hashtags)

          render(<ReviewCard review={review} />)

          // ハッシュタグエリアを取得
          const hashtagArea = screen.getByLabelText(
            `ハッシュタグ: ${hashtags.join(', ')}`,
          )
          expect(hashtagArea).toBeInTheDocument()

          // Expected Behavior (Requirement 1.2):
          // 4件目以降を含む、すべてのハッシュタグテキストが DOM に存在すること
          for (const tag of hashtags) {
            const tagElements = within(hashtagArea).queryAllByText(tag)
            expect(tagElements.length).toBeGreaterThan(0)
          }

          // Expected Behavior (Requirement 1.1):
          // 「+」から始まるオーバーフローインジケーターが存在しないこと
          const allSpans = hashtagArea.querySelectorAll('span')
          const indicatorSpans = Array.from(allSpans).filter((span) =>
            span.textContent?.startsWith('+'),
          )
          expect(indicatorSpans).toHaveLength(0)

          cleanup()
        }),
        { numRuns: 50 },
      )
    },
  )
})

describe('ReviewCard.hashtag-overflow.pbt - Preservation: 3件以下・0件のハッシュタグでの既存動作', () => {
  /**
   * Property 2a: Preservation - 1〜3件のハッシュタグはすべて表示され、インジケーターが存在しない
   *
   * hashtags.length in [1, 2, 3] の任意値に対して:
   *   - すべてのハッシュタグテキストが DOM に存在すること
   *   - 「+」から始まるオーバーフローインジケーターが存在しないこと
   *   - ハッシュタグエリアの aria-label が正しいこと
   *
   * EXPECTED OUTCOME: PASS (confirms baseline behavior to preserve)
   *
   * Validates: Requirements 3.1
   */
  it(
    'N in [1, 2, 3] のとき、すべてのハッシュタグが DOM に存在し +N インジケーターが存在しない',
    () => {
      fc.assert(
        fc.property(hashtagsUpTo3Arb, (hashtags) => {
          const review = makeReview(hashtags)

          render(<ReviewCard review={review} />)

          // ハッシュタグエリアが描画されていること（Requirement 3.1）
          const hashtagArea = screen.getByLabelText(
            `ハッシュタグ: ${hashtags.join(', ')}`,
          )
          expect(hashtagArea).toBeInTheDocument()

          // すべてのハッシュタグテキストが DOM に存在すること（Requirement 3.1）
          for (const tag of hashtags) {
            const tagElements = within(hashtagArea).queryAllByText(tag)
            expect(tagElements.length).toBeGreaterThan(0)
          }

          // 「+」から始まるインジケーターが存在しないこと
          const allSpans = hashtagArea.querySelectorAll('span')
          const indicatorSpans = Array.from(allSpans).filter((span) =>
            span.textContent?.startsWith('+'),
          )
          expect(indicatorSpans).toHaveLength(0)

          cleanup()
        }),
        { numRuns: 50 },
      )
    },
  )

  /**
   * Property 2b: Preservation - 0件のときハッシュタグエリアが描画されない
   *
   * hashtags.length === 0 のとき:
   *   - ハッシュタグ aria-label を持つ要素が DOM に存在しないこと
   *   - ハッシュタグエリアが一切描画されないこと
   *
   * EXPECTED OUTCOME: PASS (confirms baseline behavior to preserve)
   *
   * Validates: Requirements 3.2
   */
  it(
    'ハッシュタグが0件のとき、ハッシュタグエリアが描画されない',
    () => {
      fc.assert(
        fc.property(fc.constant([]), (_hashtags) => {
          const review = makeReview([])

          render(<ReviewCard review={review} />)

          // ハッシュタグエリアが描画されていないこと（Requirement 3.2）
          const hashtagArea = screen.queryByLabelText(/^ハッシュタグ:/)
          expect(hashtagArea).toBeNull()

          cleanup()
        }),
        { numRuns: 10 },
      )
    },
  )

  /**
   * Property 2c: Preservation - ハッシュタグ以外のレビュー情報が常に正しく描画される
   *
   * 任意のハッシュタグ数（0〜3件）・任意のいいね数・任意のスポット名/ユーザー名に対して:
   *   - aria-label が「{spotName} の口コミ by {userName}」の形式で存在すること
   *   - いいね数が DOM に表示されていること
   *   - サムネイル画像が DOM に存在すること
   *
   * EXPECTED OUTCOME: PASS (confirms baseline behavior to preserve)
   *
   * Validates: Requirements 3.3
   */
  it(
    'ハッシュタグ数に関わらず、いいね数・写真・aria-label などハッシュタグ以外の要素が正しく描画される',
    () => {
      fc.assert(
        fc.property(
          fc.oneof(fc.constant([]), hashtagsUpTo3Arb),
          likeCountArb,
          spotNameArb,
          userNameArb,
          (hashtags, likeCount, spotName, userName) => {
            const review = makeReview(hashtags, { likeCount, spotName, userName })

            render(<ReviewCard review={review} />)

            // aria-label が正しいこと（Requirement 3.3）
            const article = screen.getByRole('article')
            expect(article).toBeInTheDocument()
            expect(article).toHaveAttribute(
              'aria-label',
              `${spotName} の口コミ by ${userName}`,
            )

            // いいね数エリアの aria-label が存在すること（Requirement 3.3）
            const likeArea = screen.getByLabelText(/^いいね/)
            expect(likeArea).toBeInTheDocument()

            // サムネイル画像が存在すること（Requirement 3.3）
            const img = screen.getByAltText(`${spotName} のサムネイル`)
            expect(img).toBeInTheDocument()

            cleanup()
          },
        ),
        { numRuns: 50 },
      )
    },
  )
})
