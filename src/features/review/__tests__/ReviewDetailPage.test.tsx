// src/features/review/__tests__/ReviewDetailPage.test.tsx
// MSW インテグレーションテスト: 口コミ詳細画面
// - いいねボタンの楽観的 UI 更新（Requirements 7.1）
// - 409 の場合に元の状態に復元される（Requirements 7.3）

import { http, HttpResponse } from 'msw'
import { setupServer } from 'msw/node'
import { render, screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { MemoryRouter, Route, Routes } from 'react-router-dom'
import { ReviewDetailPage } from '../ReviewDetailPage'
import { AuthProvider } from '../../../contexts/AuthContext'
import { MileProvider } from '../../../contexts/MileContext'
import type { Review, User } from '../../../mocks/data/types'

// waitFor のデフォルトタイムアウトを延長（MSW の遅延分を考慮）
const WAIT_OPTIONS = { timeout: 3000 }

// ---- テスト用データ ----

const testReview: Review = {
  reviewId: 'rev-test-001',
  userId: 'user-001',
  userName: '田中 太郎',
  spotId: 'spot-test-001',
  spotName: 'テストスポット栄',
  area: '栄',
  lat: 35.17,
  lon: 136.9,
  text: 'このスポットはとても素晴らしい場所です。名古屋の中心部に位置していて、アクセスも良く、食事も美味しいです。スタッフも親切で、また来たいと思います。',
  photoUrls: [
    'https://picsum.photos/seed/test1/400/300',
    'https://picsum.photos/seed/test2/400/300',
  ],
  status: 'PUBLISHED',
  weather: 'SUNNY',
  timeSlot: 'AFTERNOON',
  dayType: 'WEEKDAY',
  likeCount: 42,
  viewCount: 310,
  createdAt: '2025-06-15T12:30:00+09:00',
  likedUserIds: [],
}

const testUser: User = {
  userId: 'test-user-001',
  email: 'test@example.com',
  displayName: 'テストユーザー',
  role: 'user',
  mileBalance: 100,
}

// ---- MSW サーバー ----

const server = setupServer(
  http.get('/api/reviews/:id', ({ params }) => {
    if (params.id === testReview.reviewId) {
      return HttpResponse.json(testReview)
    }
    return HttpResponse.json(
      { error: { code: 'NOT_FOUND', message: '口コミが見つかりません' } },
      { status: 404 },
    )
  }),
  http.post('/api/reviews/:id/like', () => {
    return HttpResponse.json({ likeCount: testReview.likeCount + 1 })
  }),
)

beforeAll(() => server.listen())
afterEach(() => server.resetHandlers())
afterAll(() => server.close())

// ---- テスト用レンダリングヘルパー ----

function renderReviewDetailPage(reviewId: string = testReview.reviewId) {
  // AuthContext は localStorage からユーザーを読み込むため、ログイン状態をセットアップ
  localStorage.setItem('nagotime_auth_user', JSON.stringify(testUser))

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

afterEach(() => {
  localStorage.clear()
})

// ---- テスト ----

describe('ReviewDetailPage', () => {
  it('口コミの詳細情報が表示される', async () => {
    renderReviewDetailPage()

    // ローディング表示
    expect(screen.getByText('読み込み中…')).toBeInTheDocument()

    // 詳細が表示されるまで待機（スポット名はヘッダーと本体に2か所あるので getAllByText）
    await waitFor(() => {
      expect(screen.getAllByText('テストスポット栄').length).toBeGreaterThanOrEqual(1)
    }, WAIT_OPTIONS)

    expect(screen.getByText('田中 太郎')).toBeInTheDocument()
    expect(screen.getByText(/このスポットはとても素晴らしい場所です/)).toBeInTheDocument()
  })

  it('いいねボタンが表示され、初期いいね数が正しい', async () => {
    renderReviewDetailPage()

    await waitFor(() => {
      expect(screen.getAllByText('テストスポット栄').length).toBeGreaterThanOrEqual(1)
    }, WAIT_OPTIONS)

    // いいね数が表示されている（42件）
    expect(screen.getByText('42')).toBeInTheDocument()
  })

  it('いいねボタンをクリックすると楽観的 UI 更新でカウントが増加する', async () => {
    const user = userEvent.setup()
    renderReviewDetailPage()

    await waitFor(() => {
      expect(screen.getAllByText('テストスポット栄').length).toBeGreaterThanOrEqual(1)
    }, WAIT_OPTIONS)

    // いいね前のカウント
    expect(screen.getByText('42')).toBeInTheDocument()

    // いいねボタンをクリック
    const likeButton = screen.getByRole('button', { name: /いいねする/ })
    await user.click(likeButton)

    // 楽観的 UI: 即座にカウントが 43 に増える
    await waitFor(() => {
      expect(screen.getByText('43')).toBeInTheDocument()
    }, WAIT_OPTIONS)
  })

  it('いいね API が 409 を返した場合、カウントが元に戻る', async () => {
    // 重複いいね: 409 を返すようにオーバーライド
    server.use(
      http.post('/api/reviews/:id/like', () => {
        return HttpResponse.json(
          {
            error: {
              code: 'DUPLICATE_LIKE',
              message: 'すでにいいね済みです',
            },
          },
          { status: 409 },
        )
      }),
    )

    const user = userEvent.setup()
    renderReviewDetailPage()

    await waitFor(() => {
      expect(screen.getAllByText('テストスポット栄').length).toBeGreaterThanOrEqual(1)
    }, WAIT_OPTIONS)

    // 初期カウントを確認
    expect(screen.getByText('42')).toBeInTheDocument()

    // いいねボタンをクリック
    const likeButton = screen.getByRole('button', { name: /いいねする/ })
    await user.click(likeButton)

    // 楽観的 UI で一時的に 43 になる
    // その後 409 で元の 42 に戻ることを確認
    await waitFor(() => {
      expect(screen.getByText('42')).toBeInTheDocument()
    }, WAIT_OPTIONS)

    // いいね済み状態になっていない（ボタンが押せる状態のまま）
    expect(screen.queryByRole('button', { name: /いいね済み/ })).not.toBeInTheDocument()
  })

  it('存在しない口コミ ID の場合は 404 エラー画面が表示される', async () => {
    renderReviewDetailPage('non-existent-id')

    await waitFor(() => {
      expect(screen.getByText('口コミが見つかりませんでした')).toBeInTheDocument()
    }, WAIT_OPTIONS)
  })

  it('写真が複数ある場合、ギャラリーナビゲーションが表示される', async () => {
    renderReviewDetailPage()

    await waitFor(() => {
      expect(screen.getAllByText('テストスポット栄').length).toBeGreaterThanOrEqual(1)
    }, WAIT_OPTIONS)

    // 2枚の写真があるので「次の写真」ボタンが表示される
    expect(screen.getByRole('button', { name: '次の写真' })).toBeInTheDocument()
  })
})
