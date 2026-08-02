// src/features/miles/__tests__/MilesPage.test.tsx
// MSW インテグレーションテスト: マイル・チケット画面

import { http, HttpResponse } from 'msw'
import { setupServer } from 'msw/node'
import { render, screen, waitFor, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { MemoryRouter } from 'react-router-dom'
import { MilesPage } from '../MilesPage'
import { AuthProvider } from '../../../contexts/AuthContext'
import { MileProvider } from '../../../contexts/MileContext'
import type { Ticket, MileTransaction, User } from '../../../mocks/data/types'

const testUser: User = {
  userId: 'user-001',
  email: 'test@example.com',
  displayName: 'テストユーザー',
  role: 'user',
  mileBalance: 1000,
}

const testTicket: Ticket = {
  ticketId: 'ticket-test-001',
  sponsorId: 'sponsor-001',
  sponsorName: 'テスト企業',
  name: 'テストチケット200マイル',
  description: 'テスト用チケットです。200マイルで交換できます。',
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

const server = setupServer(
  http.get('/api/miles', ({ request }) => {
    if (!request.headers.get('Authorization')) {
      return HttpResponse.json({ error: { code: 'UNAUTHORIZED', message: '認証が必要です' } }, { status: 401 })
    }
    return HttpResponse.json({ balance: 1000, transactions: [testTransaction] })
  }),
  http.get('/api/tickets/active', () =>
    HttpResponse.json({ tickets: [testTicket], total: 1 }),
  ),
  http.post('/api/tickets/redeem', () =>
    HttpResponse.json({ ticketCode: 'TESTCODE1234', ticketName: testTicket.name, newBalance: 800 }),
  ),
)

beforeAll(() => server.listen())
afterEach(() => server.resetHandlers())
afterAll(() => server.close())

function renderMilesPage() {
  localStorage.setItem('nagotime_auth_user', JSON.stringify(testUser))
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

afterEach(() => localStorage.clear())

describe('MilesPage', () => {
  it('マイル残高と取引履歴が表示される', async () => {
    const user = userEvent.setup()
    renderMilesPage()
    await waitFor(() => expect(screen.getByText('1,000')).toBeInTheDocument())
    // 取引履歴は「取引履歴 ▼」ボタンで開く
    await user.click(screen.getByRole('button', { name: /取引履歴/ }))
    await waitFor(() => expect(screen.getByText('口コミ投稿')).toBeInTheDocument())
  })

  it('チケット一覧が表示される', async () => {
    renderMilesPage()
    await waitFor(() => expect(screen.getByText('テストチケット200マイル')).toBeInTheDocument())
    expect(screen.getByText('テスト企業')).toBeInTheDocument()
    expect(screen.getByText('200 マイル')).toBeInTheDocument()
  })

  it('交換ボタンをクリックすると確認モーダルが表示される', async () => {
    const user = userEvent.setup()
    renderMilesPage()
    await waitFor(() => expect(screen.getAllByText('テストチケット200マイル').length).toBeGreaterThanOrEqual(1))
    await user.click(screen.getByRole('button', { name: 'テストチケット200マイルを交換する' }))
    await waitFor(() => expect(screen.getByText('チケット交換の確認')).toBeInTheDocument())
    expect(screen.getAllByText('テストチケット200マイル').length).toBeGreaterThanOrEqual(2)
  })

  it('確認モーダルで「交換する」をクリックするとチケットコードが表示される', async () => {
    const user = userEvent.setup()
    renderMilesPage()
    await waitFor(() => expect(screen.getAllByText('テストチケット200マイル').length).toBeGreaterThanOrEqual(1))
    await user.click(screen.getByRole('button', { name: 'テストチケット200マイルを交換する' }))
    await waitFor(() => expect(screen.getByText('チケット交換の確認')).toBeInTheDocument())
    await user.click(within(screen.getByRole('dialog')).getByRole('button', { name: '交換する' }))
    await waitFor(() => expect(screen.getByText('交換完了')).toBeInTheDocument())
    expect(screen.getByText('TESTCODE1234')).toBeInTheDocument()
  })

  it('チケット交換後にローカルのマイル残高が減算される', async () => {
    // 交換後の再fetchでは800を返すようにサーバーを更新
    let milesCallCount = 0
    server.use(
      http.get('/api/miles', ({ request }) => {
        if (!request.headers.get('Authorization')) {
          return HttpResponse.json({ error: { code: 'UNAUTHORIZED', message: '認証が必要です' } }, { status: 401 })
        }
        milesCallCount++
        const balance = milesCallCount > 1 ? 800 : 1000
        return HttpResponse.json({ balance, transactions: [testTransaction] })
      }),
    )
    const user = userEvent.setup()
    renderMilesPage()
    await waitFor(() => expect(screen.getAllByText('テストチケット200マイル').length).toBeGreaterThanOrEqual(1))
    expect(within(screen.getByLabelText('マイル残高')).getByText('1,000')).toBeInTheDocument()
    await user.click(screen.getByRole('button', { name: 'テストチケット200マイルを交換する' }))
    await waitFor(() => expect(screen.getByText('チケット交換の確認')).toBeInTheDocument())
    await user.click(within(screen.getByRole('dialog')).getByRole('button', { name: '交換する' }))
    await waitFor(() => expect(screen.getByText('交換完了')).toBeInTheDocument())
    await waitFor(() => {
      const s = screen.queryByLabelText('マイル残高')
      expect(s).toBeInTheDocument()
      expect(within(s!).getByText('800')).toBeInTheDocument()
    })
  })

  it('マイル不足の場合は交換ボタンが無効化される', async () => {
    // APIが100マイルを返すようにオーバーライド
    server.use(
      http.get('/api/miles', ({ request }) => {
        if (!request.headers.get('Authorization')) {
          return HttpResponse.json({ error: { code: 'UNAUTHORIZED', message: '認証が必要です' } }, { status: 401 })
        }
        return HttpResponse.json({ balance: 100, transactions: [testTransaction] })
      }),
    )
    localStorage.setItem('nagotime_auth_user', JSON.stringify(testUser))
    localStorage.setItem('nagotime_mile_balance', '100')
    render(
      <MemoryRouter><AuthProvider><MileProvider><MilesPage /></MileProvider></AuthProvider></MemoryRouter>,
    )
    await waitFor(() => expect(screen.getAllByText('テストチケット200マイル').length).toBeGreaterThanOrEqual(1))
    await waitFor(() =>
      expect(
        screen.getByText((_, el) => el?.tagName === 'P' && /あと.*100.*マイル必要/.test(el.textContent ?? ''))
      ).toBeInTheDocument()
    )
    expect(screen.getByRole('button', { name: 'テストチケット200マイル（マイル不足のため交換不可）' })).toBeDisabled()
  })

  it('交換 API が失敗した場合はエラーメッセージが表示される', async () => {
    server.use(
      http.post('/api/tickets/redeem', () =>
        HttpResponse.json({ error: { code: 'INSUFFICIENT_MILES', message: 'マイルが不足しています。' } }, { status: 409 }),
      ),
    )
    const user = userEvent.setup()
    renderMilesPage()
    await waitFor(() => expect(screen.getByText('テストチケット200マイル')).toBeInTheDocument())
    await user.click(screen.getByRole('button', { name: 'テストチケット200マイルを交換する' }))
    await waitFor(() => expect(screen.getByText('チケット交換の確認')).toBeInTheDocument())
    await user.click(within(screen.getByRole('dialog')).getByRole('button', { name: '交換する' }))
    await waitFor(() => expect(screen.getByRole('alert')).toBeInTheDocument())
  })
})
