// src/features/feed/__tests__/FeedPage.test.tsx
// MSW インテグレーションテスト: 口コミフィード画面（useRecommendFeed 版）
// - レコメンドフィードが表示される（Requirements 2.1, 2.3）
// - エラー時に role="alert" バナーが表示される（Requirements 6.3）

import { http, HttpResponse } from 'msw'
import { setupServer } from 'msw/node'
import { render, screen, waitFor } from '@testing-library/react'
import { MemoryRouter } from 'react-router-dom'
import { FeedPage } from '../FeedPage'
import { AuthProvider } from '../../../contexts/AuthContext'
import { MileProvider } from '../../../contexts/MileContext'
import { RecommendProvider } from '../../../contexts/RecommendContext'
import type { Review } from '../../../mocks/data/types'

// ---- テスト用口コミデータ ----

const makeReview = (id: string): Review => ({
  reviewId: id,
  userId: 'user-001',
  userName: 'テストユーザー',
  spotId: `spot-${id}`,
  spotName: `テストスポット ${id}`,
  area: '栄',
  lat: 35.17,
  lon: 136.9,
  text: 'このスポットはとても素晴らしい場所です。名古屋の中心部に位置していて、アクセスも良く、食事も美味しいです。',
  photoUrls: [`https://picsum.photos/seed/${id}/400/300`],
  status: 'PUBLISHED',
  weather: 'SUNNY',
  timeSlot: 'AFTERNOON',
  dayType: 'WEEKDAY',
  likeCount: 10,
  viewCount: 100,
  createdAt: '2025-06-15T12:00:00+09:00',
  likedUserIds: [],
})

const review1 = makeReview('rev-001')
const review2 = makeReview('rev-002')
const review3 = makeReview('rev-003')

// ---- MSW サーバー ----

const server = setupServer(
  // レコメンド API（新しいエンドポイント）
  http.get('/api/reviews/recommend', () => {
    return HttpResponse.json({ reviews: [review1, review2, review3] })
  }),
)

beforeAll(() => server.listen())
afterEach(() => server.resetHandlers())
afterAll(() => server.close())

// ---- Geolocation モック ----

beforeEach(() => {
  Object.defineProperty(global.navigator, 'geolocation', {
    value: {
      getCurrentPosition: vi.fn((success) => {
        success({ coords: { latitude: 35.1815, longitude: 136.9066 } })
      }),
    },
    configurable: true,
    writable: true,
  })
})

// ---- テスト用レンダリングヘルパー ----

function renderFeedPage() {
  return render(
    <MemoryRouter>
      <AuthProvider>
        <MileProvider>
          <RecommendProvider>
            <FeedPage />
          </RecommendProvider>
        </MileProvider>
      </AuthProvider>
    </MemoryRouter>,
  )
}

// ---- テスト ----

describe('FeedPage', () => {
  it('口コミ一覧が表示される', async () => {
    renderFeedPage()

    // 初回ローディング中
    expect(screen.getByText('口コミを読み込み中…')).toBeInTheDocument()

    // 口コミが表示されるまで待機
    await waitFor(() => {
      expect(screen.getByRole('button', { name: /テストスポット rev-001/ })).toBeInTheDocument()
    })

    expect(screen.getByRole('button', { name: /テストスポット rev-002/ })).toBeInTheDocument()
    expect(screen.getByRole('button', { name: /テストスポット rev-003/ })).toBeInTheDocument()
  })

  it('フィルタ結果が0件の場合「口コミが見つかりませんでした」が表示される', async () => {
    server.use(
      http.get('/api/reviews/recommend', () => {
        return HttpResponse.json({ reviews: [] })
      }),
    )

    renderFeedPage()

    await waitFor(() => {
      expect(screen.getByText('口コミが見つかりませんでした')).toBeInTheDocument()
    })
  })

  it('APIエラーの場合にエラーメッセージが表示される', async () => {
    server.use(
      http.get('/api/reviews/recommend', () => {
        return HttpResponse.json(
          { error: { code: 'SERVER_ERROR', message: 'サーバーエラー' } },
          { status: 500 },
        )
      }),
    )

    renderFeedPage()

    await waitFor(() => {
      expect(screen.getByRole('alert')).toBeInTheDocument()
    })
  })

  it('reviews 取得後に件数が表示される', async () => {
    renderFeedPage()

    await waitFor(() => {
      expect(screen.getByText('3 件の口コミを表示中')).toBeInTheDocument()
    })
  })
})
