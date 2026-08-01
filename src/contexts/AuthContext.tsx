// src/contexts/AuthContext.tsx
// 認証状態管理コンテキスト（Requirements 11.1〜11.5）

import { createContext, useContext, useEffect, useState, type ReactNode } from 'react'
import { useNavigate } from 'react-router-dom'
import type { User } from '../mocks/data/types'

// ---- 定数 ----

const STORAGE_KEY = 'nagotime_auth_user'

// ---- 型定義 ----

interface AuthState {
  user: User | null
  isAuthenticated: boolean
  login: (email: string, password: string) => Promise<void>
  logout: () => void
}

// ---- Context 生成 ----

const AuthContext = createContext<AuthState | null>(null)

// ---- Provider ----

interface AuthProviderProps {
  children: ReactNode
}

/**
 * アプリ全体に認証状態を提供するプロバイダー。
 * BrowserRouter の内側に配置する必要があります（useNavigate を使用するため）。
 */
export function AuthProvider({ children }: AuthProviderProps) {
  const navigate = useNavigate()

  // localStorage から初期状態を復元
  const [user, setUser] = useState<User | null>(() => {
    const stored = localStorage.getItem(STORAGE_KEY)
    if (!stored) return null
    try {
      return JSON.parse(stored) as User
    } catch {
      // 破損データは無視
      localStorage.removeItem(STORAGE_KEY)
      return null
    }
  })

  // user が変わったら localStorage を同期
  useEffect(() => {
    if (user) {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(user))
    } else {
      localStorage.removeItem(STORAGE_KEY)
    }
  }, [user])

  /**
   * POST /api/auth/login を呼び出してログインする。
   * 成功時は User オブジェクトを state と localStorage に保存する。
   * 失敗時は Error をスローするので呼び出し側でキャッチすること。
   *
   * Requirements: 11.1, 11.3, 11.4, 11.5
   */
  async function login(email: string, password: string): Promise<void> {
    const response = await fetch('/api/auth/login', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email, password }),
    })

    const data = await response.json()

    if (!response.ok) {
      throw new Error(
        data?.error?.message ?? 'メールアドレスまたはパスワードが正しくありません',
      )
    }

    setUser(data.user as User)
  }

  /**
   * localStorage をクリアしてログアウト後、/login にリダイレクトする。
   * Requirements: 11.1, 11.3
   */
  function logout(): void {
    setUser(null)
    navigate('/login', { replace: true })
  }

  const value: AuthState = {
    user,
    isAuthenticated: user !== null,
    login,
    logout,
  }

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>
}

// ---- カスタムフック ----

/**
 * 認証状態にアクセスするカスタムフック。
 * AuthProvider の外で呼び出した場合はエラーをスロー。
 */
export function useAuth(): AuthState {
  const ctx = useContext(AuthContext)
  if (ctx === null) {
    throw new Error('useAuth は AuthProvider の内側で使用してください')
  }
  return ctx
}
