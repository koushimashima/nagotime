// src/features/feed/FeedPage.tsx
// 口コミフィード画面（Requirements 2.1, 2.2, 2.3, 2.4, 4.2, 6.3）
//
// - useRecommendFeed で context ベースのレコメンドフィードを取得する
// - ContextFilterBar でフィルタ UI を提供する
// - reviews 変更時に setSharedReviews で MapPage へ共有する
// - エラー時は role="alert" バナーとして表示する

import { useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { ReviewCard } from '../../components/ReviewCard'
import { LoadingSpinner } from '../../components/LoadingSpinner'
import { ContextFilterBar } from '../../components/ContextFilterBar'
import { useRecommendFeed } from './useRecommendFeed'
import { useRecommendContext } from '../../contexts/RecommendContext'

// ---- コンポーネント ----

export function FeedPage() {
  const navigate = useNavigate()

  // コンテキストからフィルタ状態と共有口コミセッターを取得
  const {
    coord,
    weather,
    filterTimeSlot,
    setSharedReviews,
  } = useRecommendContext()

  // レコメンドフィード取得
  const { reviews, loading, error } = useRecommendFeed({
    lat: coord.lat,
    lon: coord.lon,
    weather,
    timeSlot: filterTimeSlot,
  })

  // reviews が変わるたびに MapPage へ共有する（Requirements 4.2）
  useEffect(() => {
    setSharedReviews(reviews)
  }, [reviews, setSharedReviews])

  return (
    <div className="min-h-screen bg-gray-50">

      {/* ---- ページヘッダー ---- */}
      <div className="bg-white border-b border-gray-200 px-4 pt-4 pb-3 sticky top-0 z-10">
        <h1 className="text-lg font-bold text-gray-900 mb-3">みんなのクチコミ</h1>

        {/* コンテキストフィルタバー */}
        <ContextFilterBar />
      </div>

      {/* ---- メインコンテンツ ---- */}
      <main className="py-4 max-w-2xl mx-auto">

        {/* エラー表示 */}
        {error && (
          <div
            role="alert"
            className="mb-4 p-3 bg-red-50 border border-red-200 rounded-lg text-sm text-red-700"
          >
            {error}
          </div>
        )}

        {/* 初回ローディング（リスト空 + 読み込み中） */}
        {loading && reviews.length === 0 && (
          <div className="flex flex-col items-center justify-center py-16 gap-3 text-gray-400">
            <LoadingSpinner size="lg" />
            <p className="text-sm">口コミを読み込み中…</p>
          </div>
        )}

        {/* 0件メッセージ（読み込み完了後、エラーなし、リスト空） */}
        {!loading && !error && reviews.length === 0 && (
          <div className="flex flex-col items-center justify-center py-16 gap-2 text-gray-400">
            <svg
              className="w-12 h-12 text-gray-300"
              fill="none"
              viewBox="0 0 24 24"
              stroke="currentColor"
              aria-hidden="true"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={1.5}
                d="M9.879 7.519c1.171-1.025 3.071-1.025 4.242 0 1.172 1.025 1.172 2.687 0 3.712-.203.179-.43.326-.67.442-.745.361-1.45.999-1.45 1.827v.75M21 12a9 9 0 11-18 0 9 9 0 0118 0zm-9 5.25h.008v.008H12v-.008z"
              />
            </svg>
            <p className="text-sm font-medium">口コミが見つかりませんでした</p>
          </div>
        )}

        {/* 口コミグリッド */}
        {reviews.length > 0 && (
          <div className="grid grid-cols-2 gap-1">
            {reviews.map(review => (
              <ReviewCard
                key={review.reviewId}
                review={review}
                onClick={() => navigate(`/reviews/${review.reviewId}`)}
              />
            ))}
          </div>
        )}

        {/* 追加ロード中スピナー（リスト表示中 + 読み込み中） */}
        {loading && reviews.length > 0 && (
          <div className="flex justify-center py-6">
            <LoadingSpinner size="md" />
          </div>
        )}

        {/* 全件表示済みメッセージ */}
        {!loading && reviews.length > 0 && (
          <p className="text-center text-xs text-gray-400 mt-6">
            {reviews.length} 件の口コミを表示中
          </p>
        )}

      </main>
    </div>
  )
}
