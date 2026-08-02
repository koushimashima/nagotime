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
      className={`relative overflow-hidden aspect-square bg-gray-100
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

      {/* 写真下部グラデーション */}
      <div className="absolute inset-x-0 bottom-0 h-12 bg-gradient-to-t from-black/30 to-transparent pointer-events-none" />

      {/* ハッシュタグ（写真左上・縦3件・白字・背景なし） */}
      {(review.hashtags ?? []).length > 0 && (
        <div
          className="absolute top-2 left-2 flex flex-col gap-0.5 pointer-events-none"
          aria-label={`ハッシュタグ: ${(review.hashtags ?? []).join(', ')}`}
        >
          {(review.hashtags ?? []).slice(0, 3).map((tag) => (
            <span
              key={tag}
              className="max-w-[60%] truncate text-[10px] font-medium text-white [filter:drop-shadow(0_1px_2px_rgba(0,0,0,0.35))] leading-none"
            >
              {tag}
            </span>
          ))}
          {(review.hashtags ?? []).length > 3 && (
            <span className="text-[10px] font-medium text-white [filter:drop-shadow(0_1px_2px_rgba(0,0,0,0.35))] leading-none">
              +{(review.hashtags ?? []).length - 3}
            </span>
          )}
        </div>
      )}

      {/* 右下：ハート＋いいね数 */}
      <div
        className="absolute bottom-2 right-2 flex items-center gap-1"
        aria-label={`いいね ${review.likeCount} 件`}
      >
        <svg
          className="w-4 h-4 text-white shrink-0 drop-shadow"
          viewBox="0 0 24 24"
          fill="currentColor"
          aria-hidden="true"
        >
          <path d="M11.645 20.91l-.007-.003-.022-.012a15.247 15.247 0 0 1-.383-.218 25.18 25.18 0 0 1-4.244-3.17C4.688 15.36 2.25 12.174 2.25 8.25 2.25 5.322 4.714 3 7.688 3A5.5 5.5 0 0 1 12 5.052 5.5 5.5 0 0 1 16.313 3c2.973 0 5.437 2.322 5.437 5.25 0 3.925-2.438 7.111-4.739 9.256a25.175 25.175 0 0 1-4.244 3.17 15.247 15.247 0 0 1-.383.219l-.022.012-.007.004-.003.001a.752.752 0 0 1-.704 0l-.003-.001Z" />
        </svg>
        <span className="text-xs text-white font-medium leading-none drop-shadow">
          {formatLikeCount(review.likeCount)}
        </span>
      </div>
    </article>
  )
}
