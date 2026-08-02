// Feature: review-hashtag, Property 9: 詳細画面でのハッシュタグチップ表示
// Validates: Requirements 5.1, 5.3

import { describe, it, expect, beforeAll, afterEach, afterAll } from 'vitest'
import * as fc from 'fast-check'
import { render, screen, waitFor, cleanup } from '@testing-library/react'
import { http, HttpResponse } from 'msw'
import { setupServer } from 'msw/node'
import { MemoryRouter, Route, Routes } from 'react-router-dom'
import { ReviewDetailPage } from './ReviewDetailPage'
import { AuthProvider } from '../../contexts/AuthContext'
import { MileProvider } from '../../contexts/MileContext'
import type { Review } from '../../mocks/data/types'

// ---- テスト用ユーザーのローカルストレージ設定 ----

const TEST_USER = {
  userId: 'user-pbt9-001',
  email: 'pbt9@example.com',
  displayName: 'PBT9テストユーザー',
  role: 'user',
  mileBalance: 100,
}

// ---- MSW サーバー（各テスト内で動的にハンドラーを登録する） ----

const server = setupServer()

beforeAll(() => server.listen({ onUnhandledRequest: 'warn' }))
afterEach(() => {
  server.resetHandlers()
  localStorage.clear()
  cleanup()
})
afterAll(() => server.close())

// ---- ヘルパー ----

/**
 * ReviewDetailPage をテスト用のプロバイダーと MemoryRouter でラップしてレンダリングする。
 * 認証状態のセットアップもここで行う。
 */
function renderReviewDetailPage(reviewId: string) {
  localStorage.setItem('nagotime_auth_user', JSON.stringify(TEST_USER))

  return render(
    <MemoryRouter initialEntries={[`/reviews/${reviewId}`]}>
      <AuthProvider>
        <MileProvider>
          <Routes>
            <Route path="/reviews/:id" element={<ReviewDetailPage />} />
          </Routes>
        </MileProvider>
      </AuthProvider>
    </MemoryRouter>,
  )
}

// ---- ジェネレーター ----

/**
 * 有効なハッシュタグ本文（# を含まない・空白なし・1〜30 文字）を生成するアービタリー。
 * 最終的には # プレフィックスを付与して有効なハッシュタグにする。
 */
const validHashtagArb = fc
  .stringOf(
    fc.char().filter((c) => !/\s/.test(c) && c !== '#'),
    { minLength: 1, maxLength: 30 },
  )
  .map((body) => `#${body}`)

/**
 * 1〜10 件の重複なし有効ハッシュタグ配列を生成するアービタリー。
 * Property 9 の対象: 1件以上のハッシュタグを持つレビュー
 */
const hashtagsArb = fc.uniqueArray(validHashtagArb, { minLength: 1, maxLength: 10 })

/**
 * 任意の hashtags 配列を持つ Review オブジェクトを生成するアービタリー。
 */
function buildReviewWithHashtags(hashtags: string[]): Review {
  return {
    reviewId: 'rev-pbt9-001',
    userId: 'user-pbt9-001',
    userName: 'PBT9テストユーザー',
    spotId: 'spot-pbt9-001',
    spotName: 'プロパティ9テストスポット',
    area: '栄',
    lat: 35.17,
    lon: 136.9,
    text: 'プロパティ9テスト用のレビューテキストです。ハッシュタグチップ表示のテストに使用します。',
    photoUrls: ['https://picsum.photos/seed/pbt9/400/300'],
    status: 'PUBLISHED',
    weather: 'SUNNY',
    timeSlot: 'AFTERNOON',
    dayType: 'WEEKDAY',
    likeCount: 5,
    viewCount: 50,
    createdAt: '2025-06-15T12:00:00+09:00',
    likedUserIds: [],
    hashtags,
  }
}

// ---- プロパティテスト ----

describe('ReviewDetailPage.pbt - Property 9: 詳細画面でのハッシュタグチップ表示', () => {
  /**
   * Property 9: 詳細画面でのハッシュタグチップ表示
   *
   * 任意の 1件以上のハッシュタグを持つレビューに対して、
   * ReviewDetailPage はそれぞれのハッシュタグに対応するチップを
   * # プレフィックス付きで表示しなければならない。
   *
   * 検証戦略:
   *   1. 1〜10件の有効なハッシュタグ配列を任意に生成する
   *   2. MSW でそのハッシュタグを含むレビューを返すハンドラーを設定する
   *   3. ReviewDetailPage をレンダリングし、データ取得完了を待つ
   *   4. 各ハッシュタグが # プレフィックス付きで DOM に表示されていることを確認する
   *
   * Validates: Requirements 5.1, 5.3
   */
  it(
    '任意の 1件以上のハッシュタグを持つレビューの詳細画面で、各ハッシュタグが # プレフィックス付きで表示される',
    async () => {
      await fc.assert(
        fc.asyncProperty(hashtagsArb, async (hashtags) => {
          const review = buildReviewWithHashtags(hashtags)

          // MSW ハンドラーを設定: このイテレーションのレビューデータを返す
          server.use(
            http.get(`/api/reviews/${review.reviewId}`, () => {
              return HttpResponse.json(review)
            }),
            // いいね API も設定しておく（コンポーネントが呼ぶ可能性があるため）
            http.post(`/api/reviews/${review.reviewId}/like`, () => {
              return HttpResponse.json({ likeCount: review.likeCount + 1 })
            }),
          )

          // コンポーネントをレンダリング
          renderReviewDetailPage(review.reviewId)

          // データ取得完了を待つ（スポット名が表示されるまで）
          await waitFor(
            () => {
              expect(screen.getByText('プロパティ9テストスポット')).toBeInTheDocument()
            },
            { timeout: 5000 },
          )

          // Requirement 5.1: 各ハッシュタグに対応するチップが表示されていること
          // Requirement 5.3: 各チップが # プレフィックス付きで表示されていること
          for (const tag of hashtags) {
            // # で始まるハッシュタグテキストが DOM に存在することを確認
            expect(tag.startsWith('#')).toBe(true)
            const chipElement = screen.getByText(tag)
            expect(chipElement).toBeInTheDocument()
          }

          // クリーンアップ
          cleanup()
          server.resetHandlers()
        }),
        { numRuns: 100 },
      )
    },
    // 100 回のレンダリング + データ取得のため、十分なタイムアウトを設定
    120_000,
  )
})
