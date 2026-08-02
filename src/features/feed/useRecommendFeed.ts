// src/features/feed/useRecommendFeed.ts
// レコメンドフィード取得カスタムフック（Requirements 2.2, 6.1, 6.2）
//
// - GET /api/reviews/recommend にコンテキストパラメータを渡してスコア降順の口コミを取得する
// - params の変化を JSON.stringify のキーで検知し、変化のたびに再フェッチする
// - ページネーションなし（最大 20 件はAPIが保証）

import { useEffect, useState } from 'react'
import type { Review, Weather, TimeSlot } from '../../mocks/data/types'

// ---- 型定義 ----

/** レコメンドフィードの取得パラメータ */
export interface RecommendFeedParams {
  lat: number
  lon: number
  weather: Weather
  timeSlot: TimeSlot
}

/** レコメンドフィードの状態 */
export interface RecommendFeedState {
  /** 取得済み口コミリスト（スコア降順、最大20件） */
  reviews: Review[]
  /** 読み込み中フラグ */
  loading: boolean
  /** エラーメッセージ（null = エラーなし） */
  error: string | null
}

// ---- APIレスポンス型 ----

interface RecommendApiResponse {
  reviews: Review[]
}

// ---- フック本体 ----

/**
 * コンテキストに基づくレコメンドフィードを取得するカスタムフック。
 *
 * `/api/reviews/recommend` に lat/lon/weather/timeSlot を渡し、
 * スコア降順の口コミリスト（最大20件）を返す。
 *
 * @param params フェッチパラメータ。値が変わるたびに再フェッチする。
 */
export function useRecommendFeed(params: RecommendFeedParams): RecommendFeedState {
  const [reviews, setReviews] = useState<Review[]>([])
  const [loading, setLoading] = useState(false)
  const [error, setError]     = useState<string | null>(null)

  // params の変化を JSON 文字列で検知する（useEffect の依存配列に使用）
  const paramsKey = JSON.stringify(params)

  useEffect(() => {
    const { lat, lon, weather, timeSlot } = params

    const fetchRecommend = async () => {
      setLoading(true)
      setError(null)
      try {
        const url = `/api/reviews/recommend?lat=${lat}&lon=${lon}&weather=${weather}&timeSlot=${timeSlot}`
        const res = await fetch(url)

        if (!res.ok) {
          const body = await res.json().catch(() => ({}))
          throw new Error(
            body?.error?.message ?? `APIエラー: ${res.status}`,
          )
        }

        const data: RecommendApiResponse = await res.json()
        setReviews(data.reviews)
      } catch (err) {
        setError(err instanceof Error ? err.message : 'レコメンドの取得に失敗しました')
        setReviews([])
      } finally {
        setLoading(false)
      }
    }

    fetchRecommend()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [paramsKey])

  return { reviews, loading, error }
}
