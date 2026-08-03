// src/features/feed/useRecommendFeed.ts
// レコメンドフィード取得カスタムフック（Requirements 2.2, 6.1, 6.2）
//
// - GET /api/reviews/recommend にコンテキストパラメータを渡してスコア降順の口コミを取得する
// - weather / timeSlot / dayType が null の場合はそのパラメータを省略して全件取得する
// - params の変化を JSON.stringify のキーで検知し、変化のたびに再フェッチする
// - フィード表示用: limit=20 でページネーション（hasMore / loadMore）
// - マップ用全件: all=true で全件取得し allReviews として返す

import { useCallback, useEffect, useRef, useState } from 'react'
import type { Review, Weather, TimeSlot, DayType } from '../../mocks/data/types'

// ---- 定数 ----

const PAGE_SIZE = 20

// ---- 型定義 ----

/** レコメンドフィードの取得パラメータ */
export interface RecommendFeedParams {
  lat: number
  lon: number
  weather: Weather | null   // null = フィルタ無効（パラメータ省略）
  timeSlot: TimeSlot | null // null = フィルタ無効（パラメータ省略）
  dayType: DayType | null   // null = フィルタ無効（パラメータ省略）
}

/** レコメンドフィードの状態 */
export interface RecommendFeedState {
  /** フィード表示用口コミリスト（スコア降順、最大 PAGE_SIZE 件ずつ累積） */
  reviews: Review[]
  /** 絞り込み条件に合致する口コミ全件（マップ用） */
  allReviews: Review[]
  /** 読み込み中フラグ */
  loading: boolean
  /** エラーメッセージ（null = エラーなし） */
  error: string | null
  /** 次ページが存在するか */
  hasMore: boolean
  /** 次ページを読み込む */
  loadMore: () => void
}

// ---- APIレスポンス型 ----

interface RecommendApiResponse {
  reviews: Review[]
}

// ---- ユーティリティ ----

function buildQuery(
  params: RecommendFeedParams,
  options: { all?: boolean; limit?: number; offset?: number },
): string {
  const { lat, lon, weather, timeSlot, dayType } = params
  const query = new URLSearchParams()
  query.set('lat', String(lat))
  query.set('lon', String(lon))
  if (weather !== null)   query.set('weather', weather)
  if (timeSlot !== null)  query.set('timeSlot', timeSlot)
  if (dayType !== null)   query.set('dayType', dayType)
  if (options.all)        query.set('all', 'true')
  if (options.limit != null)  query.set('limit',  String(options.limit))
  if (options.offset != null) query.set('offset', String(options.offset))
  return query.toString()
}

// ---- フック本体 ----

/**
 * コンテキストに基づくレコメンドフィードを取得するカスタムフック。
 *
 * - `reviews`    … フィード表示用。PAGE_SIZE ずつ累積し `loadMore` で追加取得。
 * - `allReviews` … マップ用。絞り込み条件に合致する口コミ全件。
 *
 * @param params フェッチパラメータ。値が変わるたびにリセットして再フェッチする。
 */
export function useRecommendFeed(params: RecommendFeedParams): RecommendFeedState {
  const [reviews,    setReviews]    = useState<Review[]>([])
  const [allReviews, setAllReviews] = useState<Review[]>([])
  const [offset,     setOffset]     = useState(0)
  const [hasMore,    setHasMore]    = useState(true)
  const [loading,    setLoading]    = useState(false)
  const [error,      setError]      = useState<string | null>(null)

  // params の変化を JSON 文字列で検知する
  const paramsKey = JSON.stringify(params)
  const prevParamsKey = useRef<string>(paramsKey)

  // ---- ページ取得 ----

  const fetchPage = useCallback(
    async (currentParams: RecommendFeedParams, currentOffset: number) => {
      setLoading(true)
      setError(null)
      try {
        const qs = buildQuery(currentParams, { limit: PAGE_SIZE, offset: currentOffset })
        const res = await fetch(`/api/reviews/recommend?${qs}`)

        if (!res.ok) {
          const body = await res.json().catch(() => ({}))
          throw new Error(body?.error?.message ?? `APIエラー: ${res.status}`)
        }

        const data: RecommendApiResponse = await res.json()
        setReviews(prev =>
          currentOffset === 0
            ? data.reviews
            : [...prev, ...data.reviews],
        )
        setHasMore(data.reviews.length === PAGE_SIZE)
        setOffset(currentOffset + data.reviews.length)
      } catch (err) {
        setError(err instanceof Error ? err.message : 'レコメンドの取得に失敗しました')
        setHasMore(false)
      } finally {
        setLoading(false)
      }
    },
    [],
  )

  // ---- 全件取得（マップ用） ----

  const fetchAll = useCallback(async (currentParams: RecommendFeedParams) => {
    try {
      const qs = buildQuery(currentParams, { all: true })
      const res = await fetch(`/api/reviews/recommend?${qs}`)
      if (!res.ok) return
      const data: RecommendApiResponse = await res.json()
      setAllReviews(data.reviews)
    } catch {
      // マップ用全件取得のエラーはサイレントに処理（フィード表示には影響しない）
    }
  }, [])

  // ---- params 変化時: リセット → 先頭から再取得 ----

  useEffect(() => {
    if (prevParamsKey.current !== paramsKey) {
      prevParamsKey.current = paramsKey
      setReviews([])
      setOffset(0)
      setHasMore(true)
      setError(null)
    }
    fetchPage(params, 0)
    fetchAll(params)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [paramsKey])

  // ---- loadMore ----

  const loadMore = useCallback(() => {
    if (loading || !hasMore) return
    fetchPage(params, offset)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [loading, hasMore, offset, paramsKey])

  return { reviews, allReviews, loading, error, hasMore, loadMore }
}
