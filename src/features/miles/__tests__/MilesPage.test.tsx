// src/features/miles/__tests__/MilesPage.test.tsx
// MSW インテグレーションテスト: マイル・クーポン画面
// - クーポン交換後の残高減算（Requirements 8.3〜8.5）

import { http, HttpResponse } from 'msw'
import { setupServer } from 'msw/node'
import { render, screen, waitFor, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { MemoryRouter } from 'react-router-dom'
import { MilesPage } from '../MilesPage'
import { AuthProvider } from '../../../contexts/AuthContext'
import { MileProvider } from '../../../contexts/MileContext'
import type { Coupon, MileTransaction, User } from '../../../mocks/data/types'

// ---- テスト用データ ----

const testUser: User = {
  userId: 'user-001',
  email: 'test@example.com',
  displayName: 'テストユーザー',
  role: 'user',
  mileBalance: 1000,
}

const testCoupon: Coupon = {
  couponId: 'coupon-test-001',
  sponsorId: 'sponsor-001',
  sponsorName: 'テスト企業',
  name: 'テストクーポン200マイル',
  description: 'テスト用クーポンです。200マイルで交換できます。',
  requiredMiles: 200,
  expiresAt: '2099-12-31T23:59:59+09:00',
  issueLimit: 100,
  redeemedCount: 0,
  status: 'ACTIVE',
  thumbnailUrl: null,
}

const testTransaction: MileTransaction = {
  transactionId: 'tx-001',
  userId: 'user-001',
  type: 'GRANT_REVIEW',
  amount: 10,
  balanceAfter: 1000,
  relatedId: 'rev-001',
  createdAt: '2025-06-15T12:00:00+09:00',
}

// ---- MSW サーバー ----

const server = setupServer(
  http.get('/api/miles', ({ request }) => {
    const authHeader = request.headers.get('Authorization')
    if (!authHeader) {
      return HttpResponse.json(
        { error: { code: 'UNAUTHORIZED', message: '認証が必要です' } },
        { status: 401 },
      )
    }
    return HttpResponse.json({
      balance: 1000,
      transactions: [testTransaction],
    })
  }),
  http.get('/api/coupons/active', () => {
    return HttpResponse.json({
      coupons: [testCoupon],
      total: 1,
    })
  }),
  http.post('/api/miles/redeem', () => {
    return HttpResponse.json({
      couponCode: 'TESTCODE1234',
      couponName: testCoupon.name,
      newBalance: 800,
    })
  }),
)

beforeAll(() => server.listen())
afterEach(() => server.resetHandlers())
afterAll(() => server.close())

// ---- テスト用レンダリングヘルパー ----

function renderMilesPage() {
  localStorage.setItem('nagotime_auth_user', JSON.stringify(testUser))
  // ローカルのマイル残高を 1000 にセット
  localStorage.setItem('nagotime_mile_balance', '1000')

  return render(
    <MemoryRouter>
      <AuthProvider>
        <MileProvider>
          <MilesPage />
        </MileProvider>
      </AuthProvider>
    </MemoryRouter>,
  )
}

afterEach(() => {
  localStorage.clear()
})

// ---- テスト ----

describe('MilesPage', () => {
  it('マイル残高と取引履歴が表示される', async () => {
    renderMilesPage()

    // ローディング後にデータが表示される
    await waitFor(() => {
      expect(screen.getByText('1,000')).toBeInTheDocument()
    })

    expect(screen.getByText('口コミ投稿')).toBeInTheDocument()
  })

  it('クーポン一覧が表示される', async () => {
    renderMilesPage()

    await waitFor(() => {
      expect(screen.getByText('テストクーポン200マイル')).toBeInTheDocument()
    })

    expect(screen.getByText('テスト企業')).toBeInTheDocument()
    expect(screen.getByText('200 マイル')).toBeInTheDocument()
  })

  it('交換ボタンをクリックすると確認モーダルが表示される', async () => {
    const user = userEvent.setup()
    renderMilesPage()

    await waitFor(() => {
      expect(screen.getAllByText('テストクーポン200マイル').length).toBeGreaterThanOrEqual(1)
    })

    // 交換ボタンをクリック
    const redeemButton = screen.getByRole('button', {
      name: 'テストクーポン200マイルを交換する',
    })
    await user.click(redeemButton)

    // 確認モーダルが表示される
    await waitFor(() => {
      expect(screen.getByText('クーポン交換の確認')).toBeInTheDocument()
    })
    // coupon name appears in both coupon card and modal
    expect(screen.getAllByText('テストクーポン200マイル').length).toBeGreaterThanOrEqual(2)
  })

  it('確認モーダルで「交換する」をクリックするとクーポンコードが表示される', async () => {
    const user = userEvent.setup()
    renderMilesPage()

    await waitFor(() => {
      expect(screen.getAllByText('テストクーポン200マイル').length).toBeGreaterThanOrEqual(1)
    })

    // 交換ボタンをクリック
    const redeemButton = screen.getByRole('button', {
      name: 'テストクーポン200マイルを交換する',
    })
    await user.click(redeemButton)

    // 確認モーダルが表示されるまで待機
    await waitFor(() => {
      expect(screen.getByText('クーポン交換の確認')).toBeInTheDocument()
    })

    // 確認モーダル内の「交換する」ボタンをクリック
    const modal = screen.getByRole('dialog')
    const confirmButton = within(modal).getByRole('button', { name: '交換する' })
    await user.click(confirmButton)

    // クーポンコード表示モーダルが表示される
    await waitFor(() => {
      expect(screen.getByText('交換完了')).toBeInTheDocument()
    })
    expect(screen.getByText('TESTCODE1234')).toBeInTheDocument()
  })

  it('クーポン交換後にローカルのマイル残高が減算される', async () => {
    const user = userEvent.setup()
    renderMilesPage()

    await waitFor(() => {
      expect(screen.getAllByText('テストクーポン200マイル').length).toBeGreaterThanOrEqual(1)
    })

    // 交換前の残高（ローカルコンテキスト: 1000マイル）
    const balanceSection = screen.getByLabelText('マイル残高')
    expect(within(balanceSection).getByText('1,000')).toBeInTheDocument()

    // 交換ボタンをクリック
    await user.click(
      screen.getByRole('button', { name: 'テストクーポン200マイルを交換する' }),
    )

    await waitFor(() => {
      expect(screen.getByText('クーポン交換の確認')).toBeInTheDocument()
    })

    // 確認モーダルで「交換する」をクリック
    const modal = screen.getByRole('dialog')
    await user.click(within(modal).getByRole('button', { name: '交換する' }))

    // 交換完了モーダルが表示される
    await waitFor(() => {
      expect(screen.getByText('交換完了')).toBeInTheDocument()
    })

    // ローカル残高が 200 減算されて 800 になる
    // MileContext の deductMiles(200) が呼ばれているため
    // balanceSection 内の残高が 800 に更新されることを確認
    await waitFor(() => {
      // モーダルが閉じてメイン画面が再表示されるまで待つ
      const refreshedSection = screen.queryByLabelText('マイル残高')
      expect(refreshedSection).toBeInTheDocument()
      expect(within(refreshedSection!).getByText('800')).toBeInTheDocument()
    })
  })

  it('マイル不足の場合は交換ボタンが無効化される', async () => {
    // マイル残高が 100 しかない場合（クーポンに必要な 200 に足りない）
    // renderMilesPage より先に localStorage をセットし、直接 render する
    localStorage.setItem('nagotime_auth_user', JSON.stringify(testUser))
    localStorage.setItem('nagotime_mile_balance', '100')

    render(
      <MemoryRouter>
        <AuthProvider>
          <MileProvider>
            <MilesPage />
          </MileProvider>
        </AuthProvider>
      </MemoryRouter>,
    )

    await waitFor(() => {
      expect(screen.getAllByText('テストクーポン200マイル').length).toBeGreaterThanOrEqual(1)
    })

    // 「あと〇マイル必要です」メッセージが表示される
    await waitFor(() => {
      expect(
        screen.getByText((_content, element) => {
          return element?.tagName === 'P' && /あと.*100.*マイル必要/.test(element.textContent ?? '')
        })
      ).toBeInTheDocument()
    })

    // 交換ボタンが無効化されている
    const redeemButton = screen.getByRole('button', {
      name: 'テストクーポン200マイル（マイル不足のため交換不可）',
    })
    expect(redeemButton).toBeDisabled()
  })

  it('交換 API が失敗した場合はエラーメッセージが表示される', async () => {
    server.use(
      http.post('/api/miles/redeem', () => {
        return HttpResponse.json(
          {
            error: {
              code: 'INSUFFICIENT_MILES',
              message: 'マイルが不足しています。',
            },
          },
          { status: 409 },
        )
      }),
    )

    const user = userEvent.setup()
    renderMilesPage()

    await waitFor(() => {
      expect(screen.getByText('テストクーポン200マイル')).toBeInTheDocument()
    })

    await user.click(
      screen.getByRole('button', { name: 'テストクーポン200マイルを交換する' }),
    )

    await waitFor(() => {
      expect(screen.getByText('クーポン交換の確認')).toBeInTheDocument()
    })

    const modal = screen.getByRole('dialog')
    await user.click(within(modal).getByRole('button', { name: '交換する' }))

    await waitFor(() => {
      expect(screen.getByRole('alert')).toBeInTheDocument()
    })
  })
})
