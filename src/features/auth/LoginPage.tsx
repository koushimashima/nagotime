// src/features/auth/LoginPage.tsx
// ログイン画面（Requirements 11.1〜11.5）

import { type FormEvent, useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { GraduationCap } from 'lucide-react'
import { useAuth } from '../../contexts/AuthContext'

/**
 * ログイン画面コンポーネント。
 * - メールアドレス / パスワードのフォーム
 * - useAuth の login() を呼び出し、成功時は / にリダイレクト
 * - エラー時に「メールアドレスまたはパスワードが正しくありません」を表示
 * - デモ用認証情報のヒントをフォーム下部に表示
 * - 既にログイン済みの場合は / にリダイレクト
 */
export function LoginPage() {
  const { login, isAuthenticated } = useAuth()
  const navigate = useNavigate()

  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [error, setError] = useState<string | null>(null)
  const [isLoading, setIsLoading] = useState(false)

  // 既にログイン済みなら / へリダイレクト
  useEffect(() => {
    if (isAuthenticated) {
      navigate('/', { replace: true })
    }
  }, [isAuthenticated, navigate])

  async function handleSubmit(e: FormEvent<HTMLFormElement>) {
    e.preventDefault()
    setError(null)
    setIsLoading(true)

    try {
      await login(email, password)
      navigate('/', { replace: true })
    } catch {
      setError('メールアドレスまたはパスワードが正しくありません')
    } finally {
      setIsLoading(false)
    }
  }

  return (
    <div className="min-h-screen bg-gray-50 flex items-center justify-center px-4">
      <div className="w-full max-w-md">
        {/* ロゴ・タイトル */}
        <div className="text-center mb-8">
          <h1 className="text-3xl font-bold text-orange-500" style={{ fontFamily: "'Caveat', cursive" }}>NagoTime</h1>
          <p className="mt-2 text-sm text-gray-500">
            学生の、学生による、学生と地域のためのローカルガイド
          </p>
        </div>

        {/* フォームカード */}
        <div className="bg-white rounded-2xl shadow-md px-8 py-10">
          <h2 className="text-xl font-semibold text-gray-800 mb-6">ログイン</h2>

          <form onSubmit={handleSubmit} noValidate>
            {/* エラーメッセージ */}
            {error && (
              <div
                role="alert"
                className="mb-4 rounded-lg bg-red-50 border border-red-200 px-4 py-3 text-sm text-red-600"
              >
                {error}
              </div>
            )}

            {/* メールアドレス */}
            <div className="mb-4">
              <label htmlFor="email" className="block text-sm font-medium text-gray-700 mb-1">
                メールアドレス
              </label>
              <input
                id="email"
                type="email"
                autoComplete="email"
                required
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                disabled={isLoading}
                placeholder="demo@example.com"
                className="w-full rounded-lg border border-gray-300 px-4 py-2.5 text-sm text-gray-900 placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-orange-400 focus:border-transparent disabled:bg-gray-100 disabled:cursor-not-allowed transition"
              />
            </div>

            {/* パスワード */}
            <div className="mb-6">
              <label htmlFor="password" className="block text-sm font-medium text-gray-700 mb-1">
                パスワード
              </label>
              <input
                id="password"
                type="password"
                autoComplete="current-password"
                required
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                disabled={isLoading}
                placeholder="password"
                className="w-full rounded-lg border border-gray-300 px-4 py-2.5 text-sm text-gray-900 placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-orange-400 focus:border-transparent disabled:bg-gray-100 disabled:cursor-not-allowed transition"
              />
            </div>

            {/* ログインボタン */}
            <button
              type="submit"
              disabled={isLoading || email.trim() === '' || password.trim() === ''}
              className="w-full rounded-lg bg-orange-500 px-4 py-3 text-sm font-semibold text-white hover:bg-orange-600 focus:outline-none focus:ring-2 focus:ring-orange-400 focus:ring-offset-2 disabled:opacity-50 disabled:cursor-not-allowed transition"
            >
              {isLoading ? (
                <span className="flex items-center justify-center gap-2">
                  <svg
                    className="animate-spin h-4 w-4 text-white"
                    xmlns="http://www.w3.org/2000/svg"
                    fill="none"
                    viewBox="0 0 24 24"
                    aria-hidden="true"
                  >
                    <circle
                      className="opacity-25"
                      cx="12"
                      cy="12"
                      r="10"
                      stroke="currentColor"
                      strokeWidth="4"
                    />
                    <path
                      className="opacity-75"
                      fill="currentColor"
                      d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z"
                    />
                  </svg>
                  ログイン中...
                </span>
              ) : (
                'ログイン'
              )}
            </button>
          </form>

          {/* デモ用認証情報ヒント */}
          <div className="mt-8 rounded-lg bg-orange-50 border border-orange-100 px-4 py-4 text-xs text-gray-600">
            <p className="flex items-center gap-1.5 font-semibold text-orange-600 mb-2">
              <GraduationCap className="w-4 h-4" aria-hidden="true" />
              デモ用アカウント
            </p>
            <div className="space-y-1.5">
              <div>
                <span className="font-medium">一般ユーザー</span>
                <br />
                <span className="font-mono">demo@example.com</span>
                {' / '}
                <span className="font-mono">password</span>
              </div>
              <div>
                <span className="font-medium">管理者</span>
                <br />
                <span className="font-mono">admin@example.com</span>
                {' / '}
                <span className="font-mono">password</span>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
