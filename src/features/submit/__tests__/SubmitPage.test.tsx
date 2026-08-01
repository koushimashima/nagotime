// src/features/submit/__tests__/SubmitPage.test.tsx
// MSW インテグレーションテスト: 口コミ投稿画面
// - バリデーションエラーのインライン表示（Requirements 1.2, 1.3, 1.7, 1.8, 1.9, 1.10）

import { http, HttpResponse } from 'msw'
import { setupServer } from 'msw/node'
import { render, screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { MemoryRouter } from 'react-router-dom'
import { SubmitPage } from '../SubmitPage'
import { AuthProvider } from '../../../contexts/AuthContext'
import { MileProvider } from '../../../contexts/MileContext'
import type { User } from '../../../mocks/data/types'
import {
  TEXT_LENGTH_ERROR,
  PHOTO_COUNT_ERROR,
  SPOT_NAME_ERROR,
  ERROR_LOCATION_MISSING,
} from '../../../utils/errorMessages'
import { vi } from 'vitest'

// ---- テスト用ユーザー ----

const testUser: User = {
  userId: 'test-user-001',
  email: 'test@example.com',
  displayName: 'テストユーザー',
  role: 'user',
  mileBalance: 100,
}

// ---- jsdom では URL.createObjectURL が未実装のためモック ----
global.URL.createObjectURL = vi.fn(() => 'blob:mock-url')
global.URL.revokeObjectURL = vi.fn()

// ---- MSW サーバー ----

const server = setupServer(
  http.post('/api/reviews', () => {
    return HttpResponse.json({ reviewId: 'new-rev-001' }, { status: 201 })
  }),
)

beforeAll(() => server.listen())
afterEach(() => server.resetHandlers())
afterAll(() => server.close())

// ---- テスト用レンダリングヘルパー ----

function renderSubmitPage() {
  localStorage.setItem('nagotime_auth_user', JSON.stringify(testUser))
  return render(
    <MemoryRouter>
      <AuthProvider>
        <MileProvider>
          <SubmitPage />
        </MileProvider>
      </AuthProvider>
    </MemoryRouter>,
  )
}

afterEach(() => {
  localStorage.clear()
})

// ---- テスト ----

describe('SubmitPage', () => {
  it('フォームが表示される', () => {
    renderSubmitPage()

    expect(screen.getByLabelText(/スポット名/)).toBeInTheDocument()
    expect(screen.getByLabelText(/口コミテキスト/)).toBeInTheDocument()
    expect(screen.getByRole('button', { name: '口コミを投稿する' })).toBeInTheDocument()
  })

  it('何も入力せずに送信するとバリデーションエラーが表示される', async () => {
    const user = userEvent.setup()
    renderSubmitPage()

    // 送信ボタンをクリック
    await user.click(screen.getByRole('button', { name: '口コミを投稿する' }))

    // バリデーションエラーがインライン表示される（複数のエラーが存在する）
    await waitFor(() => {
      const alerts = screen.getAllByRole('alert')
      expect(alerts.length).toBeGreaterThan(0)
    })
  })

  it('テキストが50文字未満の場合にエラーが表示される', async () => {
    const user = userEvent.setup()
    renderSubmitPage()

    const textArea = screen.getByRole('textbox', { name: /口コミテキスト/ })
    await user.type(textArea, '短すぎるテキスト')

    await user.click(screen.getByRole('button', { name: '口コミを投稿する' }))

    await waitFor(() => {
      expect(screen.getByText(TEXT_LENGTH_ERROR)).toBeInTheDocument()
    })
  })

  it('スポット名が空の場合にエラーが表示される', async () => {
    const user = userEvent.setup()
    renderSubmitPage()

    // テキストだけ入力してスポット名は空のまま送信
    const textArea = screen.getByRole('textbox', { name: /口コミテキスト/ })
    await user.type(
      textArea,
      'このスポットはとても素晴らしい場所です。名古屋の中心部に位置していて、アクセスも良く、食事も美味しいです。スタッフも親切でした。',
    )

    await user.click(screen.getByRole('button', { name: '口コミを投稿する' }))

    await waitFor(() => {
      expect(screen.getByText(SPOT_NAME_ERROR)).toBeInTheDocument()
    })
  })

  it('写真が添付されていない場合にエラーが表示される', async () => {
    const user = userEvent.setup()
    renderSubmitPage()

    // スポット名とテキストを入力
    await user.type(screen.getByLabelText(/スポット名/), '栄ランチスポット')
    await user.type(
      screen.getByRole('textbox', { name: /口コミテキスト/ }),
      'このスポットはとても素晴らしい場所です。名古屋の中心部に位置していて、アクセスも良く、食事も美味しいです。スタッフも親切でした。',
    )

    await user.click(screen.getByRole('button', { name: '口コミを投稿する' }))

    await waitFor(() => {
      expect(screen.getByText(PHOTO_COUNT_ERROR)).toBeInTheDocument()
    })
  })

  it('位置情報が取得されていない場合にエラーが表示される', async () => {
    const user = userEvent.setup()
    renderSubmitPage()

    // スポット名とテキストを入力
    await user.type(screen.getByLabelText(/スポット名/), '栄ランチスポット')
    await user.type(
      screen.getByRole('textbox', { name: /口コミテキスト/ }),
      'このスポットはとても素晴らしい場所です。名古屋の中心部に位置していて、アクセスも良く、食事も美味しいです。スタッフも親切でした。',
    )

    // ファイルを添付（写真エラーを回避）
    const file = new File(['test'], 'test.jpg', { type: 'image/jpeg' })
    const fileInput = document.getElementById('photoInput') as HTMLInputElement
    await user.upload(fileInput, file)

    await user.click(screen.getByRole('button', { name: '口コミを投稿する' }))

    await waitFor(() => {
      expect(screen.getByText(ERROR_LOCATION_MISSING)).toBeInTheDocument()
    })
  })

  it('テキスト入力時にリアルタイム文字数カウンターが更新される', async () => {
    const user = userEvent.setup()
    renderSubmitPage()

    const textArea = screen.getByRole('textbox', { name: /口コミテキスト/ })
    await user.type(textArea, 'abc')

    // 3 / 1000 と表示される
    await waitFor(() => {
      expect(screen.getByText('3 / 1000')).toBeInTheDocument()
    })
  })

  it('スポット名のバリデーションエラー後、正しく入力するとエラーが消える', async () => {
    const user = userEvent.setup()
    renderSubmitPage()

    // 空のまま送信してエラーを発生させる
    await user.click(screen.getByRole('button', { name: '口コミを投稿する' }))

    await waitFor(() => {
      expect(screen.getByText(SPOT_NAME_ERROR)).toBeInTheDocument()
    })

    // 正しいスポット名を入力
    await user.type(screen.getByLabelText(/スポット名/), '栄ランチスポット')

    // エラーが消える
    await waitFor(() => {
      expect(screen.queryByText(SPOT_NAME_ERROR)).not.toBeInTheDocument()
    })
  })

  it('バリデーション通過後も複数のエラーが同時に表示される', async () => {
    const user = userEvent.setup()
    renderSubmitPage()

    // 短すぎるテキストで送信
    await user.type(
      screen.getByRole('textbox', { name: /口コミテキスト/ }),
      '短いテキスト',
    )

    await user.click(screen.getByRole('button', { name: '口コミを投稿する' }))

    // テキストエラーとスポット名エラーが同時に表示される
    await waitFor(() => {
      expect(screen.getByText(TEXT_LENGTH_ERROR)).toBeInTheDocument()
      expect(screen.getByText(SPOT_NAME_ERROR)).toBeInTheDocument()
    })
  })
})
