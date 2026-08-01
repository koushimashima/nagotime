// src/mocks/data/types.ts

// ---- ユニオン型定義 ----

export type ReviewStatus = 'PUBLISHED' | 'PENDING' | 'REJECTED'
export type Weather = 'SUNNY' | 'CLOUDY' | 'RAINY' | 'SNOWY' | 'UNKNOWN'
export type TimeSlot = 'MORNING' | 'AFTERNOON' | 'EVENING' | 'NIGHT'
export type DayType = 'WEEKDAY' | 'HOLIDAY'
export type MileTransactionType = 'GRANT_REVIEW' | 'GRANT_LIKES' | 'GRANT_VIEWS' | 'REDEEM_COUPON'
export type CouponStatus = 'ACTIVE' | 'SOLD_OUT' | 'EXPIRED'

// ---- エンティティ型定義 ----

export interface Review {
  reviewId: string
  userId: string
  userName: string
  spotId: string
  spotName: string
  /** スポットのエリア名（例: 栄・名古屋駅・大須）。エリアフィルタリングに使用（Requirements 3.5） */
  area: string
  lat: number
  lon: number
  text: string
  /** picsum.photos URL を使用。例: https://picsum.photos/seed/{id}/400/300 */
  photoUrls: string[]
  status: ReviewStatus
  weather: Weather
  timeSlot: TimeSlot
  dayType: DayType
  likeCount: number
  viewCount: number
  /** ISO 8601 形式の日時文字列 */
  createdAt: string
  /**
   * いいね済みユーザーIDのセット。
   * MSW ハンドラーが重複いいねチェックに使用（Requirements 7.2, 7.3）
   */
  likedUserIds: string[]
}

export interface Spot {
  spotId: string
  name: string
  lat: number
  lon: number
  category: string
  area: string
  reviewCount: number
  /** picsum.photos URL を使用 */
  thumbnailUrl: string
}

export interface MileTransaction {
  transactionId: string
  userId: string
  type: MileTransactionType
  amount: number
  balanceAfter: number
  relatedId: string
  /** ISO 8601 形式の日時文字列 */
  createdAt: string
}

export interface Coupon {
  couponId: string
  sponsorId: string
  sponsorName: string
  name: string
  description: string
  requiredMiles: number
  /** ISO 8601 形式の有効期限 */
  expiresAt: string
  issueLimit: number
  redeemedCount: number
  status: CouponStatus
  /**
   * サムネイル画像 URL。
   * 画像取得失敗時は null を返す（Requirements 10.4）
   */
  thumbnailUrl: string | null
}

export interface User {
  userId: string
  email: string
  displayName: string
  role: 'user' | 'sponsor-admin'
  mileBalance: number
}

// ---- レコメンド API 用コンテキスト型 ----

/** レコメンド API に渡す現在の状況コンテキスト（タスク 4.3 で使用） */
export interface RecommendContext {
  lat: number
  lon: number
  weather: Weather
  timeSlot: TimeSlot
  dayType: DayType
}

// ---- ページネーション結果型 ----

/** カーソルベースページネーションの結果ラッパー（タスク 4.4 で使用） */
export interface PaginatedResult<T> {
  items: T[]
  nextCursor: string | null
  total: number
}

// ---- フィードフィルター型 ----

/** 口コミフィードのフィルタ条件（タスク 4.4 で使用）。すべてのフィールドは省略可能（AND 条件） */
export interface ReviewFilters {
  area?: string
  weather?: Weather
  timeSlot?: TimeSlot
  dayType?: DayType
}

// ---- 広告差し込み型 ----

/** フィードに混在させるクーポン広告アイテム（タスク 4.6 で使用、Requirements 10.2） */
export interface CouponAd {
  type: 'ad'
  coupon: Coupon
  sponsored: true
}
