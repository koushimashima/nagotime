// src/components/ReviewCard/ReviewCard.tsx
// 口コミタイル — 写真メイン、右下にいいね数のみ表示

import type { Review } from '../../mocks/data/types'

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
      className={`relative overflow-hidden rounded-2xl aspect-square bg-gray-100
                  ${onClick ? 'cursor-pointer active:scale-95' : ''}`}
      onClick={onClick}
      role={onClick ? 'button' : undefined}
      tabIndex={onClick ? 0 : undefined}
      onKeyDown={onClick ? (e) => { if (e.key === 'Enter' || e.key === ' ') onClick() } : undefined}
      aria-label={`${review.spotName} の口コミ by ${review.userName}`}
    >
      {/* 写真 */}
      <img
        src={thumbnail}
        alt={`${review.spotName} のサムネイル`}
        className="w-full h-full object-cover"
        loading="lazy"
      />

      {/* 右下：ハート＋いいね数 */}
      <div
        className="absolute bottom-2 right-2 flex items-center gap-1
                   bg-black/40 backdrop-blur-sm rounded-full px-2 py-1"
        aria-label={`いいね ${review.likeCount} 件`}
      >
        <svg
          className="w-3.5 h-3.5 text-rose-400 shrink-0"
          viewBox="0 0 20 20"
          fill="currentColor"
          aria-hidden="true"
        >
          <path d="M9.653 16.915l-.005-.003-.019-.01a20.759 20.759 0 0 1-1.162-.682 22.045 22.045 0 0 1-2.582-2.046C4.492 12.988 3 11.07 3 8.5a5.5 5.5 0 0 1 9.5-3.78 5.5 5.5 0 0 1 9.5 3.78c0 2.57-1.492 4.488-2.885 5.674a22.045 22.045 0 0 1-2.582 2.046 20.785 20.785 0 0 1-1.185.693l-.01.005-.002.001-.002.001a.75.75 0 0 1-.67.001l-.002-.001Z" />
        </svg>
        <span className="text-xs text-white font-medium leading-none">
          {formatLikeCount(review.likeCount)}
        </span>
      </div>
    </article>
  )
}
