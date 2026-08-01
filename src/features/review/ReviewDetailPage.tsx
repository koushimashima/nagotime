// src/features/review/ReviewDetailPage.tsx
// 口コミ詳細画面（Requirements 5.1〜5.5, 7.1〜7.6）
//
// - GET /api/reviews/:id でデータ取得・viewCount インクリメント
// - 写真ギャラリー（最大5枚・スワイプ対応）
// - いいねボタン: 楽観的 UI 更新 → POST /api/reviews/:id/like → 409 時に元に戻す
// - useMile の toggleLike() と連携してローカル状態を同期する

import { useEffect, useRef, useState } from 'react'
import { useNavigate, useParams } from 'react-router-dom'
import { Search, AlertTriangle, MapPin, CalendarDays, Briefcase } from 'lucide-react'
import { WeatherBadge } from '../../components/WeatherBadge'
import { TimeBadge } from '../../components/TimeBadge'
import { LoadingSpinner } from '../../components/LoadingSpinner'
import { useAuth } from '../../contexts/AuthContext'
import { useMile } from '../../contexts/MileContext'
import type { Review } from '../../mocks/data/types'

// ---- ヘルパー ----

/** ISO 8601 の日時文字列を日本語表示形式に変換する */
function formatDateJa(isoString: string): string {
  const date = new Date(isoString)
  return date.toLocaleString('ja-JP', {
    year: 'numeric',
    month: 'long',
    day: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  })
}

// ---- コンポーネント ----

export function ReviewDetailPage() {
  const { id } = useParams<{ id: string }>()
  const navigate = useNavigate()
  const { user, isAuthenticated } = useAuth()
  const { likedReviewIds, toggleLike } = useMile()

  // ---- データ取得状態 ----
  const [review, setReview] = useState<Review | null>(null)
  const [loading, setLoading] = useState(true)
  const [errorCode, setErrorCode] = useState<'NOT_FOUND' | 'ERROR' | null>(null)

  // ---- いいね状態（楽観的 UI 用） ----
  const [likeCount, setLikeCount] = useState(0)
  const [isLiked, setIsLiked] = useState(false)
  const [likeLoading, setLikeLoading] = useState(false)

  // ---- 写真ギャラリー状態 ----
  const [photoIndex, setPhotoIndex] = useState(0)
  const touchStartXRef = useRef<number | null>(null)

  // ---- データ取得 ----
  useEffect(() => {
    if (!id) {
      setErrorCode('NOT_FOUND')
      setLoading(false)
      return
    }

    setLoading(true)
    setErrorCode(null)

    fetch(`/api/reviews/${id}`)
      .then(async (res) => {
        if (res.status === 404) {
          setErrorCode('NOT_FOUND')
          return
        }
        if (!res.ok) {
          setErrorCode('ERROR')
          return
        }
        const data: Review = await res.json()
        setReview(data)
        setLikeCount(data.likeCount)
        // localStorage のいいね済み状態で初期化（Requirements 7.2）
        setIsLiked(likedReviewIds.has(data.reviewId))
      })
      .catch(() => {
        setErrorCode('ERROR')
      })
      .finally(() => {
        setLoading(false)
      })
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [id])

  // likedReviewIds が変化したとき（他の画面でいいね操作した後に戻るケースなど）に同期
  useEffect(() => {
    if (review) {
      setIsLiked(likedReviewIds.has(review.reviewId))
    }
  }, [likedReviewIds, review])

  // ---- いいねハンドラー ----
  async function handleLike() {
    if (!isAuthenticated) {
      navigate('/login')
      return
    }
    if (!review || likeLoading) return

    // 楽観的 UI 更新（Requirements 7.1）
    const prevLikeCount = likeCount
    const prevIsLiked = isLiked
    setLikeCount((c) => c + 1)
    setIsLiked(true)
    setLikeLoading(true)

    try {
      const res = await fetch(`/api/reviews/${review.reviewId}/like`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer mock-jwt-token-${user!.userId}-${Date.now()}`,
        },
      })

      if (res.status === 409) {
        // 重複いいね → 元の状態に戻す（Requirements 7.3）
        setLikeCount(prevLikeCount)
        setIsLiked(prevIsLiked)
      } else if (res.ok) {
        // 成功 → MileContext のローカル状態も同期（Requirements 7.2）
        toggleLike(review.reviewId)
      } else {
        // その他エラー → 元に戻す
        setLikeCount(prevLikeCount)
        setIsLiked(prevIsLiked)
      }
    } catch {
      // ネットワークエラー → 元に戻す
      setLikeCount(prevLikeCount)
      setIsLiked(prevIsLiked)
    } finally {
      setLikeLoading(false)
    }
  }

  // ---- 写真スワイプ処理 ----
  function handleTouchStart(e: React.TouchEvent) {
    touchStartXRef.current = e.touches[0].clientX
  }

  function handleTouchEnd(e: React.TouchEvent) {
    if (touchStartXRef.current === null || !review) return
    const deltaX = e.changedTouches[0].clientX - touchStartXRef.current
    const threshold = 40

    if (deltaX > threshold) {
      // 右スワイプ → 前の写真
      setPhotoIndex((i) => Math.max(0, i - 1))
    } else if (deltaX < -threshold) {
      // 左スワイプ → 次の写真
      setPhotoIndex((i) => Math.min(review.photoUrls.length - 1, i + 1))
    }
    touchStartXRef.current = null
  }

  // ---- ローディング状態 ----
  if (loading) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[50vh] gap-3 text-gray-400">
        <LoadingSpinner size="lg" />
        <p className="text-sm">読み込み中…</p>
      </div>
    )
  }

  // ---- 404 エラー ----
  if (errorCode === 'NOT_FOUND') {
    return (
      <div className="flex flex-col items-center justify-center min-h-[50vh] gap-4 px-4">
        <Search className="w-14 h-14 text-gray-300" aria-hidden="true" />
        <h1 className="text-xl font-bold text-gray-700">口コミが見つかりませんでした</h1>
        <p className="text-sm text-gray-500 text-center">
          指定された口コミは存在しないか、非公開になっています。
        </p>
        <button
          type="button"
          onClick={() => navigate(-1)}
          className="mt-2 px-5 py-2 bg-orange-500 hover:bg-orange-600 text-white text-sm font-medium
                     rounded-full transition-colors focus:outline-none focus:ring-2 focus:ring-orange-400"
        >
          前のページに戻る
        </button>
      </div>
    )
  }

  // ---- その他エラー ----
  if (errorCode === 'ERROR' || !review) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[50vh] gap-4 px-4">
        <AlertTriangle className="w-14 h-14 text-gray-300" aria-hidden="true" />
        <h1 className="text-xl font-bold text-gray-700">エラーが発生しました</h1>
        <p className="text-sm text-gray-500 text-center">
          口コミの読み込みに失敗しました。しばらく経ってからもう一度お試しください。
        </p>
        <button
          type="button"
          onClick={() => navigate(-1)}
          className="mt-2 px-5 py-2 bg-orange-500 hover:bg-orange-600 text-white text-sm font-medium
                     rounded-full transition-colors focus:outline-none focus:ring-2 focus:ring-orange-400"
        >
          前のページに戻る
        </button>
      </div>
    )
  }

  // ---- 写真 ----
  const photos = review.photoUrls.slice(0, 5)
  const hasMultiplePhotos = photos.length > 1

  return (
    <div className="min-h-screen bg-gray-50 pb-20">

      {/* ---- 戻るボタン（絶対配置でオーバーレイ） ---- */}
      <div className="sticky top-0 z-20 bg-white border-b border-gray-200 px-4 py-3 flex items-center gap-3">
        <button
          type="button"
          onClick={() => navigate(-1)}
          aria-label="前のページに戻る"
          className="p-1.5 rounded-full hover:bg-gray-100 transition-colors text-gray-600"
        >
          <svg
            className="w-5 h-5"
            fill="none"
            viewBox="0 0 24 24"
            stroke="currentColor"
            aria-hidden="true"
          >
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
          </svg>
        </button>
        <h1 className="text-base font-semibold text-gray-900 truncate flex-1">{review.spotName}</h1>
      </div>

      {/* ---- 写真ギャラリー ---- */}
      {photos.length > 0 && (
        <div
          className="relative w-full bg-black select-none"
          style={{ aspectRatio: '4 / 3' }}
          onTouchStart={handleTouchStart}
          onTouchEnd={handleTouchEnd}
          aria-label="写真ギャラリー"
        >
          <img
            key={photos[photoIndex]}
            src={photos[photoIndex]}
            alt={`口コミ写真 ${photoIndex + 1} / ${photos.length}`}
            className="w-full h-full object-cover"
          />

          {/* インデックス表示 */}
          {hasMultiplePhotos && (
            <span className="absolute top-3 right-3 bg-black/60 text-white text-xs px-2 py-1 rounded-full">
              {photoIndex + 1} / {photos.length}
            </span>
          )}

          {/* 前へボタン */}
          {hasMultiplePhotos && photoIndex > 0 && (
            <button
              type="button"
              onClick={() => setPhotoIndex((i) => i - 1)}
              aria-label="前の写真"
              className="absolute left-2 top-1/2 -translate-y-1/2 bg-black/50 hover:bg-black/70
                         text-white rounded-full p-2 transition-colors"
            >
              <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" aria-hidden="true">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M15 19l-7-7 7-7" />
              </svg>
            </button>
          )}

          {/* 次へボタン */}
          {hasMultiplePhotos && photoIndex < photos.length - 1 && (
            <button
              type="button"
              onClick={() => setPhotoIndex((i) => i + 1)}
              aria-label="次の写真"
              className="absolute right-2 top-1/2 -translate-y-1/2 bg-black/50 hover:bg-black/70
                         text-white rounded-full p-2 transition-colors"
            >
              <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" aria-hidden="true">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M9 5l7 7-7 7" />
              </svg>
            </button>
          )}

          {/* ドットインジケーター */}
          {hasMultiplePhotos && (
            <div className="absolute bottom-3 left-1/2 -translate-x-1/2 flex gap-1.5" aria-hidden="true">
              {photos.map((_, i) => (
                <button
                  key={i}
                  type="button"
                  aria-label={`写真 ${i + 1} を表示`}
                  onClick={() => setPhotoIndex(i)}
                  className={`w-1.5 h-1.5 rounded-full transition-colors ${
                    i === photoIndex ? 'bg-white' : 'bg-white/50'
                  }`}
                />
              ))}
            </div>
          )}
        </div>
      )}

      {/* ---- 詳細情報 ---- */}
      <div className="max-w-2xl mx-auto px-4 py-5 space-y-5">

        {/* スポット名 + いいねボタン */}
        <div className="flex items-start justify-between gap-4">
          <div className="flex-1 min-w-0">
            <h2 className="text-xl font-bold text-gray-900 leading-snug">{review.spotName}</h2>
            {review.area && (
              <p className="flex items-center gap-1 text-sm text-gray-500 mt-0.5">
                <MapPin className="w-3.5 h-3.5" aria-hidden="true" />
                {review.area}
              </p>
            )}
          </div>

          {/* いいねボタン（Requirements 7.1〜7.6） */}
          <button
            type="button"
            onClick={handleLike}
            disabled={likeLoading || isLiked}
            aria-label={isLiked ? `いいね済み（${likeCount}件）` : `いいねする（${likeCount}件）`}
            aria-pressed={isLiked}
            className={`flex flex-col items-center gap-1 px-3 py-2 rounded-xl border transition-all
              focus:outline-none focus:ring-2 focus:ring-rose-400
              ${isLiked
                ? 'bg-rose-50 border-rose-200 text-rose-500 cursor-default'
                : 'bg-white border-gray-200 text-gray-500 hover:bg-rose-50 hover:border-rose-200 hover:text-rose-500 active:scale-95'
              }
              ${likeLoading ? 'opacity-60 cursor-wait' : ''}
            `}
          >
            {/* ハートアイコン */}
            <svg
              className={`w-7 h-7 transition-transform ${likeLoading ? 'animate-pulse' : ''}`}
              viewBox="0 0 24 24"
              aria-hidden="true"
              fill={isLiked ? 'currentColor' : 'none'}
              stroke="currentColor"
              strokeWidth={isLiked ? 0 : 1.8}
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                d="M21 8.25c0-2.485-2.099-4.5-4.688-4.5-1.935 0-3.597 1.126-4.312 2.733-.715-1.607-2.377-2.733-4.313-2.733C5.1 3.75 3 5.765 3 8.25c0 7.22 9 12 9 12s9-4.78 9-12z"
              />
            </svg>
            <span className="text-xs font-semibold tabular-nums">{likeCount}</span>
          </button>
        </div>

        {/* バッジ群 */}
        <div className="flex flex-wrap gap-2">
          <WeatherBadge weather={review.weather} />
          <TimeBadge timeSlot={review.timeSlot} />
          <span
            className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-medium border ${
              review.dayType === 'HOLIDAY'
                ? 'bg-purple-100 text-purple-700 border-purple-200'
                : 'bg-green-100 text-green-700 border-green-200'
            }`}
          >
            {review.dayType === 'HOLIDAY'
              ? <CalendarDays className="w-3 h-3" aria-hidden="true" />
              : <Briefcase className="w-3 h-3" aria-hidden="true" />
            }
            {review.dayType === 'HOLIDAY' ? '休日' : '平日'}
          </span>
        </div>

        {/* 投稿者情報・投稿日時 */}
        <div className="flex items-center gap-3 py-3 border-t border-b border-gray-100">
          {/* アバター（アイコン） */}
          <div className="w-9 h-9 rounded-full bg-orange-100 flex items-center justify-center flex-shrink-0">
            <span className="text-orange-500 font-bold text-sm" aria-hidden="true">
              {review.userName.charAt(0)}
            </span>
          </div>
          <div className="flex-1 min-w-0">
            <p className="text-sm font-medium text-gray-900 truncate">{review.userName}</p>
            <time
              dateTime={review.createdAt}
              className="text-xs text-gray-400"
            >
              {formatDateJa(review.createdAt)}
            </time>
          </div>
        </div>

        {/* 本文テキスト */}
        <div className="bg-white rounded-xl p-4 shadow-sm border border-gray-100">
          <p className="text-sm text-gray-800 leading-relaxed whitespace-pre-wrap">{review.text}</p>
        </div>

      </div>
    </div>
  )
}
