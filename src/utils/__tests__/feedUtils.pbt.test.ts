// src/utils/__tests__/feedUtils.pbt.test.ts
// Property-based tests for feed utility functions in feedUtils.ts
// Feature: nago-time-demo

import * as fc from 'fast-check'
import { describe, it } from 'vitest'
import {
  filterPublished,
  applyFilters,
  sortByCreatedAtDesc,
  paginate,
  type ReviewFilters,
} from '../feedUtils'
import type { Review, ReviewStatus, Weather, TimeSlot, DayType } from '../../mocks/data/types'

// ---- Arbitraries ----

const reviewStatusArbitrary = fc.constantFrom<ReviewStatus>('PUBLISHED', 'PENDING', 'REJECTED')
const weatherArbitrary = fc.constantFrom<Weather>('SUNNY', 'CLOUDY', 'RAINY', 'SNOWY', 'UNKNOWN')
const timeSlotArbitrary = fc.constantFrom<TimeSlot>('MORNING', 'AFTERNOON', 'EVENING', 'NIGHT')
const dayTypeArbitrary = fc.constantFrom<DayType>('WEEKDAY', 'HOLIDAY')

/** Generates a valid ISO 8601 datetime string */
const isoDateArbitrary = fc
  .date({ min: new Date('2020-01-01T00:00:00.000Z'), max: new Date('2030-12-31T23:59:59.999Z') })
  .map((d) => d.toISOString())

const reviewArbitrary: fc.Arbitrary<Review> = fc.record({
  reviewId: fc.uuid(),
  userId: fc.uuid(),
  userName: fc.string({ minLength: 1, maxLength: 50 }),
  spotId: fc.uuid(),
  spotName: fc.string({ minLength: 1, maxLength: 100 }),
  area: fc.constantFrom('栄', '名古屋駅', '大須', '今池', '覚王山', '金山', '千種', '熱田'),
  lat: fc.double({ min: 35.0, max: 35.5, noNaN: true }),
  lon: fc.double({ min: 136.7, max: 137.1, noNaN: true }),
  text: fc.string({ minLength: 50, maxLength: 1000 }),
  photoUrls: fc.array(
    fc.string({ minLength: 1, maxLength: 200 }),
    { minLength: 1, maxLength: 5 }
  ),
  status: reviewStatusArbitrary,
  weather: weatherArbitrary,
  timeSlot: timeSlotArbitrary,
  dayType: dayTypeArbitrary,
  likeCount: fc.nat({ max: 500 }),
  viewCount: fc.nat({ max: 10000 }),
  createdAt: isoDateArbitrary,
  likedUserIds: fc.array(fc.uuid(), { maxLength: 50 }),
})

/** Generates a ReviewFilters record where each field is randomly present or absent */
const filterArbitrary: fc.Arbitrary<ReviewFilters> = fc.record(
  {
    weather: weatherArbitrary,
    timeSlot: timeSlotArbitrary,
    dayType: dayTypeArbitrary,
  },
  { requiredKeys: [] }
)

// ---- Property Tests ----

describe('feedUtils PBT', () => {
  // Feature: nago-time-demo, Property 6: フィードステータスフィルタリング正確性
  it('Property 6: filterPublished returns only PUBLISHED reviews for any input array', () => {
    // Validates: Requirements 3.1
    fc.assert(
      fc.property(fc.array(reviewArbitrary), (reviews) => {
        const result = filterPublished(reviews)
        return result.every((r) => r.status === 'PUBLISHED')
      }),
      { numRuns: 100 }
    )
  })

  // Feature: nago-time-demo, Property 7: フィード降順ソート保証
  it('Property 7: sortByCreatedAtDesc returns reviews sorted by createdAt descending', () => {
    // Validates: Requirements 3.2
    fc.assert(
      fc.property(fc.array(reviewArbitrary), (reviews) => {
        const sorted = sortByCreatedAtDesc(reviews)
        for (let i = 0; i < sorted.length - 1; i++) {
          if (sorted[i].createdAt < sorted[i + 1].createdAt) return false
        }
        return true
      }),
      { numRuns: 100 }
    )
  })

  // Feature: nago-time-demo, Property 8: ページネーション件数上限保証
  it('Property 8: paginate returns at most 20 items regardless of input size or limit', () => {
    // Validates: Requirements 3.3
    fc.assert(
      fc.property(
        fc.array(reviewArbitrary, { maxLength: 200 }),
        fc.integer({ min: 1, max: 100 }),
        (reviews, limit) => {
          const result = paginate(reviews, null, limit)
          return result.items.length <= 20
        }
      ),
      { numRuns: 100 }
    )
  })

  // Feature: nago-time-demo, Property 9: フィルタリングの AND 条件正確性
  it('Property 9: applyFilters returns only reviews matching all specified filter conditions (AND)', () => {
    // Validates: Requirements 3.5
    fc.assert(
      fc.property(fc.array(reviewArbitrary), filterArbitrary, (reviews, filters) => {
        const result = applyFilters(reviews, filters)
        return result.every((review) => {
          if (filters.weather !== undefined && review.weather !== filters.weather) return false
          if (filters.timeSlot !== undefined && review.timeSlot !== filters.timeSlot) return false
          if (filters.dayType !== undefined && review.dayType !== filters.dayType) return false
          return true
        })
      }),
      { numRuns: 100 }
    )
  })
})
