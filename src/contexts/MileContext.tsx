// src/contexts/MileContext.tsx
// マイル残高・いいね状態管理コンテキスト（Requirements 7.2, 7.3, 8.3, 8.4, 8.5）

import { createContext, useContext, useEffect, useState, type ReactNode } from 'react'

// ---- 定数 ----

const BALANCE_STORAGE_KEY = 'nagotime_mile_balance'
const LIKED_REVIEWS_STORAGE_KEY = 'nagotime_liked_reviews'

// ---- 型定義 ----

interface MileState {
  /** 現在のマイル残高（常に 0 以上） */
  balance: number
  /** いいね済み口コミ ID のセット */
  likedReviewIds: Set<string>
  /**
   * マイルを加算する。
   * @param amount 加算するマイル数（正の整数を想定）
   */
  addMiles: (amount: number) => void
  /**
   * マイルを減算する。
   * @param amount 差し引くマイル数
   * @returns 残高が十分な場合 true、残高不足の場合 false
   */
  deductMiles: (amount: number) => boolean
  /**
   * 口コミにいいねをトグルする。
   * 未いいね → いいね追加し true を返す。
   * いいね済み → 何もせず false を返す（重複いいね防止）。
   * @param reviewId いいね対象の口コミ ID
   * @returns いいね追加した場合 true、重複の場合 false
   */
  toggleLike: (reviewId: string) => boolean
}

// ---- Context 生成 ----

const MileContext = createContext<MileState | null>(null)

// ---- ローカルストレージ ユーティリティ ----

/** localStorage からマイル残高を読み込む。取得に失敗した場合は 0 を返す。 */
function loadBalance(): number {
  const stored = localStorage.getItem(BALANCE_STORAGE_KEY)
  if (stored === null) return 0
  const parsed = Number(stored)
  // NaN や負数はデフォルト値に fallback
  return Number.isFinite(parsed) && parsed >= 0 ? parsed : 0
}

/** localStorage からいいね済み口コミ ID セットを読み込む。取得に失敗した場合は空セットを返す。 */
function loadLikedReviewIds(): Set<string> {
  const stored = localStorage.getItem(LIKED_REVIEWS_STORAGE_KEY)
  if (stored === null) return new Set()
  try {
    const parsed = JSON.parse(stored)
    if (Array.isArray(parsed)) {
      return new Set(parsed as string[])
    }
    return new Set()
  } catch {
    // 破損データは無視
    localStorage.removeItem(LIKED_REVIEWS_STORAGE_KEY)
    return new Set()
  }
}

// ---- Provider ----

interface MileProviderProps {
  children: ReactNode
}

/**
 * アプリ全体にマイル残高・いいね状態を提供するプロバイダー。
 * localStorage と自動的に同期します。
 *
 * Requirements: 7.2, 7.3, 8.3, 8.4, 8.5
 */
export function MileProvider({ children }: MileProviderProps) {
  // 初期化時に localStorage から復元
  const [balance, setBalance] = useState<number>(loadBalance)
  const [likedReviewIds, setLikedReviewIds] = useState<Set<string>>(loadLikedReviewIds)

  // balance が変わったら localStorage に同期
  useEffect(() => {
    localStorage.setItem(BALANCE_STORAGE_KEY, String(balance))
  }, [balance])

  // likedReviewIds が変わったら localStorage に同期
  useEffect(() => {
    localStorage.setItem(
      LIKED_REVIEWS_STORAGE_KEY,
      JSON.stringify([...likedReviewIds]),
    )
  }, [likedReviewIds])

  /**
   * balance に amount を加算する。
   * Requirements: 8.3
   */
  function addMiles(amount: number): void {
    setBalance(prev => prev + amount)
  }

  /**
   * balance が amount 以上の場合に差し引いて true を返す。
   * 残高不足の場合は何もせず false を返す。
   * Requirements: 8.3, 8.4, 8.5
   */
  function deductMiles(amount: number): boolean {
    let success = false
    setBalance(prev => {
      if (prev >= amount) {
        success = true
        return prev - amount
      }
      return prev
    })
    return success
  }

  /**
   * 未いいねの場合は likedReviewIds に reviewId を追加して true を返す。
   * すでにいいね済みの場合は何もせず false を返す。
   * Requirements: 7.2, 7.3
   */
  function toggleLike(reviewId: string): boolean {
    if (likedReviewIds.has(reviewId)) {
      // 重複いいね → 拒否
      return false
    }
    setLikedReviewIds(prev => new Set([...prev, reviewId]))
    return true
  }

  const value: MileState = {
    balance,
    likedReviewIds,
    addMiles,
    deductMiles,
    toggleLike,
  }

  return <MileContext.Provider value={value}>{children}</MileContext.Provider>
}

// ---- カスタムフック ----

/**
 * マイル残高・いいね状態にアクセスするカスタムフック。
 * MileProvider の外で呼び出した場合はエラーをスロー。
 */
export function useMile(): MileState {
  const ctx = useContext(MileContext)
  if (ctx === null) {
    throw new Error('useMile は MileProvider の内側で使用してください')
  }
  return ctx
}
