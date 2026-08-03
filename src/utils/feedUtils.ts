// src/utils/feedUtils.ts
// フィード取得・フィルタリング純粋関数
// Validates: Requirements 3.1〜3.9

import type { Review, Weather, TimeSlot, DayType } from '../mocks/data/types'

// ---- フィルター型定義 ----

export interface ReviewFilters {
  weather?: Weather
  timeSlot?: TimeSlot
  dayType?: DayType
}

// ---- ページネーション結果型 ----

export interface PaginatedResult<T> {
  items: T[]
  nextCursor: string | null
  total: number
}

// ---- 定数 ----

const MAX_PAGE_SIZE = 20

// ---- 関数実装 ----

/**
 * PUBLISHED ステータスの口コミのみを返す。
 * Validates: Requirements 3.1
 */
export function filterPublished(reviews: Review[]): Review[] {
  return reviews.filter((r) => r.status === 'PUBLISHED')
}

/**
 * フィルタ条件（AND 条件）に一致する口コミのみを返す。
 * undefined / null のフィールドは条件として無視する。
 * Validates: Requirements 3.5
 */
export function applyFilters(reviews: Review[], filters: ReviewFilters): Review[] {
  return reviews.filter((review) => {
    if (filters.weather !== undefined && filters.weather !== null && review.weather !== filters.weather) {
      return false
    }
    if (filters.timeSlot !== undefined && filters.timeSlot !== null && review.timeSlot !== filters.timeSlot) {
      return false
    }
    if (filters.dayType !== undefined && filters.dayType !== null && review.dayType !== filters.dayType) {
      return false
    }
    return true
  })
}

/**
 * 口コミを createdAt の降順（最新順）でソートして返す。
 * ISO 8601 文字列は辞書順比較が日時順と一致するため文字列比較を使用。
 * Validates: Requirements 3.2
 */
export function sortByCreatedAtDesc(reviews: Review[]): Review[] {
  return [...reviews].sort((a, b) => {
    if (a.createdAt > b.createdAt) return -1
    if (a.createdAt < b.createdAt) return 1
    return 0
  })
}

/**
 * カーソルベースページネーション。
 * - cursor が null の場合は先頭から取得する。
 * - cursor が指定された場合は reviewId === cursor の次のアイテムから取得する。
 * - limit は最大 MAX_PAGE_SIZE（20）。超過した場合は 20 を使用する。
 * - cursor が存在しない reviewId の場合は空結果を返す（要件 3.9 の無効カーソル相当）。
 * Validates: Requirements 3.3, 3.4, 3.8, 3.9
 */
export function paginate<T extends { reviewId: string }>(
  reviews: T[],
  cursor: string | null,
  limit: number,
): PaginatedResult<T> {
  const effectiveLimit = limit > MAX_PAGE_SIZE ? MAX_PAGE_SIZE : limit

  let startIndex = 0

  if (cursor !== null) {
    const cursorIndex = reviews.findIndex((r) => r.reviewId === cursor)
    if (cursorIndex === -1) {
      // 無効なカーソル: 空結果を返す
      return { items: [], nextCursor: null, total: reviews.length }
    }
    startIndex = cursorIndex + 1
  }

  const items = reviews.slice(startIndex, startIndex + effectiveLimit)

  const nextStartIndex = startIndex + items.length
  const nextCursor = nextStartIndex < reviews.length ? reviews[nextStartIndex].reviewId : null

  return {
    items,
    nextCursor,
    total: reviews.length,
  }
}
