// src/mocks/data/types.ts

// ---- ユニオン型定義 ----

export type ReviewStatus = 'PUBLISHED' | 'PENDING' | 'REJECTED'
export type Weather = 'SUNNY' | 'CLOUDY' | 'RAINY' | 'SNOWY' | 'UNKNOWN'
export type TimeSlot = 'MORNING' | 'AFTERNOON' | 'EVENING' | 'NIGHT'
export type DayType = 'WEEKDAY' | 'HOLIDAY'
export type MileTransactionType = 'GRANT_REVIEW' | 'GRANT_LIKES' | 'GRANT_VIEWS' | 'REDEEM_TICKET'
export type TicketStatus = 'ACTIVE' | 'SOLD_OUT' | 'EXPIRED'

// ---- エンティティ型定義 ----

export interface Review {
  reviewId: string
  userId: string
  userName: string
  spotId: string
  spotName: string
  area: string
  lat: number
  lon: number
  text: string
  photoUrls: string[]
  status: ReviewStatus
  weather: Weather
  timeSlot: TimeSlot
  dayType: DayType
  likeCount: number
  viewCount: number
  createdAt: string
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
  thumbnailUrl: string
}

export interface MileTransaction {
  transactionId: string
  userId: string
  type: MileTransactionType
  amount: number
  balanceAfter: number
  relatedId: string
  createdAt: string
}

export interface Ticket {
  ticketId: string
  sponsorId: string
  sponsorName: string
  name: string
  description: string
  requiredMiles: number
  expiresAt: string
  issueLimit: number
  redeemedCount: number
  status: TicketStatus
  thumbnailUrl: string | null
}

export interface User {
  userId: string
  email: string
  displayName: string
  role: 'user' | 'sponsor-admin'
  mileBalance: number
}

export interface RecommendContext {
  lat: number
  lon: number
  weather: Weather
  timeSlot: TimeSlot
  dayType: DayType
}

export interface PaginatedResult<T> {
  items: T[]
  nextCursor: string | null
  total: number
}

export interface ReviewFilters {
  area?: string
  weather?: Weather
  timeSlot?: TimeSlot
  dayType?: DayType
}

export interface TicketAd {
  type: 'ad'
  ticket: Ticket
  sponsored: true
}
