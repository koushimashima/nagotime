// src/features/feed/FeedPage.tsx
// 口コミフィード画面（Requirements 3.1〜3.9）
//
// - フィルタバー（エリア・天気・時間帯）でリストを絞り込む
// - ReviewCard グリッドで表示し「もっと見る」でページネーション
// - フィルタ変更時はリストをリセットして先頭から再取得する

import { useMemo, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { Cloud, Sunrise, MapPin } from 'lucide-react'
import { ReviewCard } from '../../components/ReviewCard'
import { LoadingSpinner } from '../../components/LoadingSpinner'
import { useReviewFeed, type ReviewFilters } from './useReviewFeed'
import type { Weather, TimeSlot } from '../../mocks/data/types'

// ---- 定数 ----

/** エリア選択肢（モックデータに合わせて定義） */
const AREA_OPTIONS = [
  '栄',
  '名古屋駅',
  '大須',
  '今池',
  '覚王山',
  '矢場町',
  '鶴舞',
  '千種',
  '伏見',
  '金山',
] as const

/** 天気選択肢 */
const WEATHER_OPTIONS: { value: Weather; label: string }[] = [
  { value: 'SUNNY',   label: '晴れ' },
  { value: 'CLOUDY',  label: '曇り' },
  { value: 'RAINY',   label: '雨' },
  { value: 'SNOWY',   label: '雪' },
  { value: 'UNKNOWN', label: '不明' },
]

/** 時間帯選択肢 */
const TIMESLOT_OPTIONS: { value: TimeSlot; label: string }[] = [
  { value: 'MORNING',   label: '朝（5〜9時）' },
  { value: 'AFTERNOON', label: '昼（10〜16時）' },
  { value: 'EVENING',   label: '夕（17〜20時）' },
  { value: 'NIGHT',     label: '夜（21〜4時）' },
]

// ---- コンポーネント ----

export function FeedPage() {
  const navigate = useNavigate()

  // ---- フィルタ状態 ----
  const [area,     setArea]     = useState<string>('')
  const [weather,  setWeather]  = useState<string>('')
  const [timeSlot, setTimeSlot] = useState<string>('')

  // フィルタオブジェクトをメモ化（参照安定性を保つことでフック内の比較が正確に動く）
  const filters = useMemo<ReviewFilters>(() => ({
    ...(area     ? { area }                        : {}),
    ...(weather  ? { weather: weather as Weather } : {}),
    ...(timeSlot ? { timeSlot: timeSlot as TimeSlot } : {}),
  }), [area, weather, timeSlot])

  const { reviews, loading, error, hasMore, loadMore } = useReviewFeed(filters)

  // ---- フィルタリセット ----
  function handleResetFilters() {
    setArea('')
    setWeather('')
    setTimeSlot('')
  }

  const hasActiveFilters = area || weather || timeSlot

  return (
    <div className="min-h-screen bg-gray-50">

      {/* ---- ページヘッダー ---- */}
      <div className="bg-white border-b border-gray-200 px-4 pt-4 pb-3 sticky top-0 z-10">
        <h1 className="text-lg font-bold text-gray-900 mb-3">みんなのクチコミ</h1>

        {/* フィルタバー */}
        <div className="flex flex-wrap gap-2 items-center">

          {/* エリア */}
          <div className="relative">
            <div className="flex items-center gap-1.5 mb-1 text-xs text-gray-500 font-medium px-1">
              <MapPin className="w-3.5 h-3.5" aria-hidden="true" />
              エリア
            </div>
            <select
              value={area}
              onChange={e => setArea(e.target.value)}
              aria-label="エリアで絞り込む"
              className="appearance-none bg-white border border-gray-300 rounded-full
                         pl-3 pr-7 py-1.5 text-sm text-gray-700
                         focus:outline-none focus:ring-2 focus:ring-orange-400 focus:border-transparent
                         hover:border-gray-400 transition-colors cursor-pointer"
            >
              <option value="">すべて</option>
              {AREA_OPTIONS.map(a => (
                <option key={a} value={a}>{a}</option>
              ))}
            </select>
            <span className="pointer-events-none absolute right-2 bottom-2 text-gray-400 text-xs">▾</span>
          </div>

          {/* 天気 */}
          <div className="relative">
            <div className="flex items-center gap-1.5 mb-1 text-xs text-gray-500 font-medium px-1">
              <Cloud className="w-3.5 h-3.5" aria-hidden="true" />
              天気
            </div>
            <select
              value={weather}
              onChange={e => setWeather(e.target.value)}
              aria-label="天気で絞り込む"
              className="appearance-none bg-white border border-gray-300 rounded-full
                         pl-3 pr-7 py-1.5 text-sm text-gray-700
                         focus:outline-none focus:ring-2 focus:ring-orange-400 focus:border-transparent
                         hover:border-gray-400 transition-colors cursor-pointer"
            >
              <option value="">すべて</option>
              {WEATHER_OPTIONS.map(w => (
                <option key={w.value} value={w.value}>{w.label}</option>
              ))}
            </select>
            <span className="pointer-events-none absolute right-2 bottom-2 text-gray-400 text-xs">▾</span>
          </div>

          {/* 時間帯 */}
          <div className="relative">
            <div className="flex items-center gap-1.5 mb-1 text-xs text-gray-500 font-medium px-1">
              <Sunrise className="w-3.5 h-3.5" aria-hidden="true" />
              時間帯
            </div>
            <select
              value={timeSlot}
              onChange={e => setTimeSlot(e.target.value)}
              aria-label="時間帯で絞り込む"
              className="appearance-none bg-white border border-gray-300 rounded-full
                         pl-3 pr-7 py-1.5 text-sm text-gray-700
                         focus:outline-none focus:ring-2 focus:ring-orange-400 focus:border-transparent
                         hover:border-gray-400 transition-colors cursor-pointer"
            >
              <option value="">すべて</option>
              {TIMESLOT_OPTIONS.map(t => (
                <option key={t.value} value={t.value}>{t.label}</option>
              ))}
            </select>
            <span className="pointer-events-none absolute right-2 bottom-2 text-gray-400 text-xs">▾</span>
          </div>

          {/* リセットボタン */}
          {hasActiveFilters && (
            <button
              type="button"
              onClick={handleResetFilters}
              aria-label="フィルタをリセット"
              className="text-sm text-orange-500 hover:text-orange-700 underline underline-offset-2
                         transition-colors"
            >
              リセット
            </button>
          )}
        </div>
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
            {hasActiveFilters && (
              <p className="text-xs text-gray-400">
                フィルタ条件を変更するか、
                <button
                  type="button"
                  onClick={handleResetFilters}
                  className="text-orange-500 underline underline-offset-2 ml-0.5"
                >
                  リセット
                </button>
                してください。
              </p>
            )}
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

        {/* もっと見るボタン */}
        {!loading && hasMore && reviews.length > 0 && (
          <div className="flex justify-center mt-6">
            <button
              type="button"
              onClick={loadMore}
              className="px-6 py-2.5 bg-orange-500 hover:bg-orange-600 active:bg-orange-700
                         text-white text-sm font-medium rounded-full shadow-sm
                         transition-colors focus:outline-none focus:ring-2 focus:ring-orange-400 focus:ring-offset-2"
            >
              もっと見る
            </button>
          </div>
        )}

        {/* 全件表示済みメッセージ */}
        {!loading && !hasMore && reviews.length > 0 && (
          <p className="text-center text-xs text-gray-400 mt-6">
            すべての口コミを表示しました（{reviews.length} 件）
          </p>
        )}

      </main>
    </div>
  )
}
