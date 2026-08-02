// src/features/feed/__tests__/FeedPage.test.tsx
// MSW インテグレーションテスト: 口コミフィード画面
// - 口コミが表示される（Requirements 3.1）
// - フィルタが機能する（Requirements 3.5）

import { http, HttpResponse } from 'msw'
import { setupServer } from 'msw/node'
import { render, screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { MemoryRouter } from 'react-router-dom'
import { FeedPage } from '../FeedPage'
import { AuthProvider } from '../../../contexts/AuthContext'
import { MileProvider } from '../../../contexts/MileContext'
import type { Review } from '../../../mocks/data/types'

// ---- テスト用口コミデータ ----

const makeReview = (id: string, area: string, weather: string): Review => ({
  reviewId: id,
  userId: 'user-001',
  userName: 'テストユーザー',
  spotId: `spot-${id}`,
  spotName: `テストスポット ${id}`,
  area,
  lat: 35.17,
  lon: 136.9,
  text: 'このスポットはとても素晴らしい場所です。名古屋の中心部に位置していて、アクセスも良く、食事も美味しいです。',
  photoUrls: [`https://picsum.photos/seed/${id}/400/300`],
  status: 'PUBLISHED',
  weather: weather as Review['weather'],
  timeSlot: 'AFTERNOON',
  dayType: 'WEEKDAY',
  likeCount: 10,
  viewCount: 100,
  createdAt: '2025-06-15T12:00:00+09:00',
  likedUserIds: [],
})

const sakaeReview = makeReview('rev-sakae-1', '栄', 'SUNNY')
const nagoyaReview = makeReview('rev-nagoya-1', '名古屋駅', 'CLOUDY')
const osuReview = makeReview('rev-osu-1', '大須', 'SUNNY')

// ---- MSW サーバー ----

const server = setupServer(
  http.get('/api/reviews', ({ request }) => {
    const url = new URL(request.url)
    const area = url.searchParams.get('area')
    const weather = url.searchParams.get('weather')

    let reviews = [sakaeReview, nagoyaReview, osuReview]

    if (area) {
      reviews = reviews.filter((r) => r.area === area)
    }
    if (weather) {
      reviews = reviews.filter((r) => r.weather === weather)
    }

    return HttpResponse.json({
      reviews,
      nextCursor: null,
      total: reviews.length,
    })
  }),
)

beforeAll(() => server.listen())
afterEach(() => server.resetHandlers())
afterAll(() => server.close())

// ---- テスト用レンダリングヘルパー ----

function renderFeedPage() {
  return render(
    <MemoryRouter>
      <AuthProvider>
        <MileProvider>
          <FeedPage />
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

    // 口コミが表示されるまで待機（aria-label で確認）
    await waitFor(() => {
      expect(screen.getByRole('button', { name: /テストスポット rev-sakae-1/ })).toBeInTheDocument()
    })

    expect(screen.getByRole('button', { name: /テストスポット rev-nagoya-1/ })).toBeInTheDocument()
    expect(screen.getByRole('button', { name: /テストスポット rev-osu-1/ })).toBeInTheDocument()
  })

  it('エリアフィルタを選択すると該当する口コミだけが表示される', async () => {
    const user = userEvent.setup()
    renderFeedPage()

    // 口コミ一覧が表示されるまで待機
    await waitFor(() => {
      expect(screen.getByRole('button', { name: /テストスポット rev-sakae-1/ })).toBeInTheDocument()
    })

    // エリアフィルタで「栄」を選択
    const areaSelect = screen.getByRole('combobox', { name: 'エリアで絞り込む' })
    await user.selectOptions(areaSelect, '栄')

    // 栄のみが表示される
    await waitFor(() => {
      expect(screen.getByRole('button', { name: /テストスポット rev-sakae-1/ })).toBeInTheDocument()
    })
    expect(screen.queryByRole('button', { name: /テストスポット rev-nagoya-1/ })).not.toBeInTheDocument()
    expect(screen.queryByRole('button', { name: /テストスポット rev-osu-1/ })).not.toBeInTheDocument()
  })

  it('天気フィルタを選択すると該当する口コミだけが表示される', async () => {
    const user = userEvent.setup()
    renderFeedPage()

    // 口コミ一覧が表示されるまで待機
    await waitFor(() => {
      expect(screen.getByRole('button', { name: /テストスポット rev-sakae-1/ })).toBeInTheDocument()
    })

    // 天気フィルタで「CLOUDY」を選択
    const weatherSelect = screen.getByRole('combobox', { name: '天気で絞り込む' })
    await user.selectOptions(weatherSelect, 'CLOUDY')

    // CLOUDY のみが表示される
    await waitFor(() => {
      expect(screen.getByRole('button', { name: /テストスポット rev-nagoya-1/ })).toBeInTheDocument()
    })
    expect(screen.queryByRole('button', { name: /テストスポット rev-sakae-1/ })).not.toBeInTheDocument()
  })

  it('フィルタ結果が0件の場合「口コミが見つかりませんでした」が表示される', async () => {
    const user = userEvent.setup()
    renderFeedPage()

    await waitFor(() => {
      expect(screen.getByRole('button', { name: /テストスポット rev-sakae-1/ })).toBeInTheDocument()
    })

    // 存在しないエリアでフィルタ（サーバーが空配列を返すよう上書き）
    server.use(
      http.get('/api/reviews', () => {
        return HttpResponse.json({ reviews: [], nextCursor: null, total: 0 })
      }),
    )

    const timeSlotSelect = screen.getByRole('combobox', { name: '時間帯で絞り込む' })
    await user.selectOptions(timeSlotSelect, 'MORNING')

    await waitFor(() => {
      expect(screen.getByText('口コミが見つかりませんでした')).toBeInTheDocument()
    })
  })

  it('フィルタリセットボタンでフィルタが解除される', async () => {
    const user = userEvent.setup()
    renderFeedPage()

    await waitFor(() => {
      expect(screen.getByRole('button', { name: /テストスポット rev-sakae-1/ })).toBeInTheDocument()
    })

    // エリアフィルタで「栄」を選択
    const areaSelect = screen.getByRole('combobox', { name: 'エリアで絞り込む' })
    await user.selectOptions(areaSelect, '栄')

    // リセットボタンが表示される
    await waitFor(() => {
      expect(screen.getByRole('button', { name: 'フィルタをリセット' })).toBeInTheDocument()
    })

    // リセットボタンをクリック
    await user.click(screen.getByRole('button', { name: 'フィルタをリセット' }))

    // 全口コミが再表示される
    await waitFor(() => {
      expect(screen.getByRole('button', { name: /テストスポット rev-sakae-1/ })).toBeInTheDocument()
    })
    expect(screen.getByRole('button', { name: /テストスポット rev-nagoya-1/ })).toBeInTheDocument()
  })

  it('APIエラーの場合にエラーメッセージが表示される', async () => {
    server.use(
      http.get('/api/reviews', () => {
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
})
