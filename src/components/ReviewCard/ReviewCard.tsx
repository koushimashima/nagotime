// src/components/ReviewCard/ReviewCard.tsx
// 口コミカード — サムネイル・投稿者名・スポット名・いいね数・天気/時間帯バッジ（Requirements 3.6, 5.1）

import type { Review } from '../../mocks/data/types'
import { WeatherBadge } from '../WeatherBadge'
import { TimeBadge } from '../TimeBadge'

interface ReviewCardProps {
  review: Review
  onClick?: () => void
}

/** いいね数の簡略表示（1000以上は「1.2k」形式） */
function formatLikeCount(count: number): string {
  if (count >= 1000) {
    return `${(count / 1000).toFixed(1)}k`
  }
  return String(count)
}

export function ReviewCard({ review, onClick }: ReviewCardProps) {
  const thumbnail = review.photoUrls[0] ?? `https://picsum.photos/seed/${review.reviewId}/400/300`

  return (
    <article
      className={`bg-white rounded-2xl overflow-hidden shadow-sm border border-gray-100 transition-all
                  ${onClick ? 'cursor-pointer hover:shadow-md hover:-translate-y-0.5 active:scale-95' : ''}`}
      onClick={onClick}
      role={onClick ? 'button' : undefined}
      tabIndex={onClick ? 0 : undefined}
      onKeyDown={onClick ? (e) => { if (e.key === 'Enter' || e.key === ' ') onClick() } : undefined}
      aria-label={`${review.spotName} の口コミ by ${review.userName}`}
    >
      {/* サムネイル */}
      <div className="relative aspect-[4/3] overflow-hidden bg-gray-100">
        <img
          src={thumbnail}
          alt={`${review.spotName} のサムネイル`}
          className="w-full h-full object-cover"
          loading="lazy"
        />
      </div>

      {/* カード本文 */}
      <div className="p-3 space-y-2">

        {/* スポット名 */}
        <h3 className="text-sm font-semibold text-gray-900 truncate leading-tight">
          {review.spotName}
        </h3>

        {/* 投稿者名 */}
        <p className="text-xs text-gray-500 truncate">
          by {review.userName}
        </p>

        {/* バッジ行 */}
        <div className="flex flex-wrap items-center gap-1">
          <WeatherBadge weather={review.weather} />
          <TimeBadge timeSlot={review.timeSlot} />
        </div>

        {/* いいね数 */}
        <div className="flex items-center gap-1 text-xs text-gray-500 pt-0.5">
          <svg
            className="w-3.5 h-3.5 text-rose-400"
            viewBox="0 0 20 20"
            fill="currentColor"
            aria-hidden="true"
          >
            <path d="M9.653 16.915l-.005-.003-.019-.01a20.759 20.759 0 0 1-1.162-.682 22.045 22.045 0 0 1-2.582-2.046C4.492 12.988 3 11.07 3 8.5a5.5 5.5 0 0 1 9.5-3.78 5.5 5.5 0 0 1 9.5 3.78c0 2.57-1.492 4.488-2.885 5.674a22.045 22.045 0 0 1-2.582 2.046 20.785 20.785 0 0 1-1.185.693l-.01.005-.002.001-.002.001a.75.75 0 0 1-.67.001l-.002-.001Z" />
          </svg>
          <span aria-label={`いいね ${review.likeCount} 件`}>
            {formatLikeCount(review.likeCount)}
          </span>
        </div>

      </div>
    </article>
  )
}
