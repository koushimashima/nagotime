// src/features/feed/useReviewFeed.ts
// 口コミフィード取得カスタムフック（Requirements 3.1〜3.9）
//
// - GET /api/reviews にフィルタ・カーソルを渡して口コミ一覧を取得する
// - フィルタ変更時はリストをリセットして先頭から再取得する
// - 「もっと見る」(loadMore) でカーソルを進めて追加取得する

import { useCallback, useEffect, useRef, useState } from 'react'
import type { Review, Weather, TimeSlot } from '../../mocks/data/types'

// ---- 型定義 ----

/** フィードフィルタ条件。すべて省略可能（省略時は全件対象） */
export interface ReviewFilters {
  weather?: Weather
  timeSlot?: TimeSlot
}

interface FeedState {
  /** 取得済み口コミの累積リスト */
  reviews: Review[]
  /** 読み込み中フラグ */
  loading: boolean
  /** エラーメッセージ（null = エラーなし） */
  error: string | null
  /** 次ページが存在するか */
  hasMore: boolean
  /** 追加ページを読み込む */
  loadMore: () => void
}

// ---- API レスポンス型 ----

interface ReviewsApiResponse {
  reviews: Review[]
  nextCursor: string | null
  total: number
}

// ---- フィルタを URL クエリ文字列に変換するユーティリティ ----

function buildQueryString(filters: ReviewFilters, cursor: string | null, limit: number): string {
  const params = new URLSearchParams()
  if (filters.weather)  params.set('weather', filters.weather)
  if (filters.timeSlot) params.set('timeSlot', filters.timeSlot)
  if (cursor)           params.set('cursor', cursor)
  params.set('limit', String(limit))
  return params.toString()
}

// ---- フック本体 ----

const PAGE_SIZE = 20

/**
 * 口コミフィードの取得・ページネーション・フィルタリングを管理するカスタムフック。
 *
 * @param filters フィルタ条件。参照が変わるたびにリストをリセットして再取得する
 *                ため、呼び出し元で useMemo / useState で安定させること。
 */
export function useReviewFeed(filters: ReviewFilters): FeedState {
  const [reviews, setReviews]   = useState<Review[]>([])
  const [loading, setLoading]   = useState(false)
  const [error, setError]       = useState<string | null>(null)
  const [cursor, setCursor]     = useState<string | null>(null)
  const [hasMore, setHasMore]   = useState(true)

  // フィルタ変更を検知するために JSON 文字列で比較する
  const filtersKey = JSON.stringify(filters)
  const prevFiltersKey = useRef<string>(filtersKey)

  // フィルタが変わったらリセット
  if (prevFiltersKey.current !== filtersKey) {
    prevFiltersKey.current = filtersKey
    setReviews([])
    setCursor(null)
    setHasMore(true)
    setError(null)
  }

  /**
   * 指定カーソルから PAGE_SIZE 件取得し、既存リストに追加する。
   * フィルタが変わった直後（cursor が null に戻った後）は先頭から取得する。
   */
  const fetchPage = useCallback(
    async (currentCursor: string | null, currentFilters: ReviewFilters) => {
      setLoading(true)
      setError(null)
      try {
        const qs = buildQueryString(currentFilters, currentCursor, PAGE_SIZE)
        const res = await fetch(`/api/reviews?${qs}`)

        if (!res.ok) {
          // 400: 無効なカーソル (Requirements 3.9)
          const body = await res.json().catch(() => ({}))
          throw new Error(
            body?.error?.message ?? `APIエラー: ${res.status}`,
          )
        }

        const data: ReviewsApiResponse = await res.json()

        setReviews(prev =>
          currentCursor === null
            ? data.reviews               // リセット後の初回取得
            : [...prev, ...data.reviews] // 追加取得
        )
        setCursor(data.nextCursor)
        setHasMore(data.nextCursor !== null)
      } catch (err) {
        setError(err instanceof Error ? err.message : '口コミの取得に失敗しました')
        setHasMore(false)
      } finally {
        setLoading(false)
      }
    },
    [],
  )

  // フィルタが変わったとき（= filtersKey が変わったとき）に先頭から取得する
  useEffect(() => {
    setReviews([])
    setCursor(null)
    setHasMore(true)
    fetchPage(null, filters)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [filtersKey])

  /** 次ページを読み込む。loading 中または次ページなしの場合は何もしない。 */
  const loadMore = useCallback(() => {
    if (loading || !hasMore) return
    fetchPage(cursor, filters)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [loading, hasMore, cursor, filtersKey])

  return { reviews, loading, error, hasMore, loadMore }
}
