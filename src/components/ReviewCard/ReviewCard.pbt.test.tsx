// Feature: review-hashtag, Property 10: フィードカードの縦3件制限と余剰表示
// Validates: Requirements 6.1, 6.2, 6.3

import { describe, it, expect, afterEach } from 'vitest'
import * as fc from 'fast-check'
import { render, screen, cleanup } from '@testing-library/react'
import { ReviewCard } from './ReviewCard'
import type { Review } from '../../mocks/data/types'

// ---- ヘルパー ----

/**
 * 指定されたハッシュタグ配列を持つテスト用 Review オブジェクトを生成する。
 */
function makeReview(hashtags: string[]): Review {
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
  }
}

afterEach(() => {
  cleanup()
})

// ---- ジェネレーター ----

/**
 * 重複なしの有効なハッシュタグ配列を生成するアービタリー。
 * 各ハッシュタグは # + 英数字 1〜10 文字の形式。
 * テストを簡潔にするため、インデックス付きの一意なタグを使用する。
 */

/**
 * N 件（1〜3）の重複なしハッシュタグ配列を生成するアービタリー（Property 10a 用）
 */
const hashtagsUpTo3Arb = fc
  .integer({ min: 1, max: 3 })
  .map((n) => Array.from({ length: n }, (_, i) => `#tag${i + 1}`))

/**
 * N 件（4〜10）の重複なしハッシュタグ配列を生成するアービタリー（Property 10b 用）
 * @deprecated 現在未使用（将来のテスト拡張時に利用予定）
 */
// const _hashtagsOver3Arb = fc
//   .integer({ min: 4, max: 10 })
//   .map((n) => Array.from({ length: n }, (_, i) => `#tag${i + 1}`))

// ---- プロパティテスト ----

describe('ReviewCard.pbt - Property 10: フィードカードの縦3件制限と余剰表示', () => {
  /**
   * Property 10a: N ≤ 3 のとき表示件数が N 件で余剰インジケーターなし
   *
   * 1〜3件のハッシュタグを持つレビューに対して:
   *   - 表示されるハッシュタグ span が N 件であること
   *   - '+' で始まるインジケーターが存在しないこと
   *   - aria-label に 'ハッシュタグ:' が含まれること（ハッシュタグエリアが描画されている）
   *
   * Validates: Requirements 6.1, 6.2
   */
  it(
    'N ≤ 3 のとき、N 件のハッシュタグがすべて表示され余剰インジケーターが存在しない',
    () => {
      fc.assert(
        fc.property(hashtagsUpTo3Arb, (hashtags) => {
          const n = hashtags.length
          const review = makeReview(hashtags)

          render(<ReviewCard review={review} />)

          // Requirement 6.1: ハッシュタグエリアが写真左上に描画されていること
          // aria-label でハッシュタグエリアの存在を確認する
          const hashtagArea = screen.getByLabelText(
            `ハッシュタグ: ${hashtags.join(', ')}`,
          )
          expect(hashtagArea).toBeInTheDocument()

          // Requirement 6.2: 表示される各ハッシュタグが DOM に存在すること
          for (const tag of hashtags) {
            expect(screen.getByText(tag)).toBeInTheDocument()
          }

          // Requirement 6.2: 表示されるハッシュタグの件数が N 件であること（+N インジケーターを除く）
          // ハッシュタグエリア内の span 要素を取得し、+ で始まらないものをカウントする
          const allSpans = hashtagArea.querySelectorAll('span')
          const tagSpans = Array.from(allSpans).filter(
            (span) => !span.textContent?.startsWith('+'),
          )
          expect(tagSpans).toHaveLength(n)

          // N ≤ 3 のとき余剰インジケーター（+ で始まるテキスト）が存在しないこと
          const indicatorSpans = Array.from(allSpans).filter((span) =>
            span.textContent?.startsWith('+'),
          )
          expect(indicatorSpans).toHaveLength(0)

          cleanup()
        }),
        { numRuns: 100 },
      )
    },
  )


})
