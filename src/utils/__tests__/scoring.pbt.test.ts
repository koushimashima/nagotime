// src/utils/__tests__/scoring.pbt.test.ts
// Feature: nago-time-demo, Property 10: レコメンドスコアの降順ソート保証
// Feature: nago-time-demo, Property 11: Haversine スポット範囲内フィルタ正確性

import * as fc from 'fast-check'
import { describe, it, expect } from 'vitest'
import {
  recommend,
  calcWeatherScore,
  calcTimeSlotScore,
  calcDistanceScore,
  calcLikesScore,
  calcTotalScore,
} from '../scoring'
import { filterSpotsByRadius, haversine } from '../geoUtils'
import type {
  Review,
  Spot,
  Weather,
  TimeSlot,
  DayType,
  ReviewStatus,
  RecommendContext,
} from '../../mocks/data/types'

// ---- Arbitraries ----

const weatherArbitrary = fc.constantFrom<Weather>('SUNNY', 'CLOUDY', 'RAINY', 'SNOWY', 'UNKNOWN')
const timeSlotArbitrary = fc.constantFrom<TimeSlot>('MORNING', 'AFTERNOON', 'EVENING', 'NIGHT')
const dayTypeArbitrary = fc.constantFrom<DayType>('WEEKDAY', 'HOLIDAY')
const reviewStatusArbitrary = fc.constantFrom<ReviewStatus>('PUBLISHED', 'PENDING', 'REJECTED')

/** Generates a valid ISO 8601 datetime string */
const isoDateArbitrary = fc
  .date({ min: new Date('2020-01-01T00:00:00.000Z'), max: new Date('2030-12-31T23:59:59.999Z') })
  .map((d) => d.toISOString())

/** Generates a Review with realistic lat/lon values */
const reviewArbitrary: fc.Arbitrary<Review> = fc.record({
  reviewId: fc.uuid(),
  userId: fc.uuid(),
  userName: fc.string({ minLength: 1, maxLength: 50 }),
  spotId: fc.uuid(),
  spotName: fc.string({ minLength: 1, maxLength: 100 }),
  area: fc.constantFrom('栄', '名古屋駅', '大須', '今池', '覚王山', '金山', '千種', '熱田'),
  lat: fc.double({ min: -90, max: 90, noNaN: true, noDefaultInfinity: true }),
  lon: fc.double({ min: -180, max: 180, noNaN: true, noDefaultInfinity: true }),
  text: fc.string({ minLength: 50, maxLength: 1000 }),
  photoUrls: fc.array(fc.string({ minLength: 1, maxLength: 200 }), { minLength: 1, maxLength: 5 }),
  status: reviewStatusArbitrary,
  weather: weatherArbitrary,
  timeSlot: timeSlotArbitrary,
  dayType: dayTypeArbitrary,
  likeCount: fc.nat({ max: 1000 }),
  viewCount: fc.nat({ max: 10000 }),
  createdAt: isoDateArbitrary,
  likedUserIds: fc.array(fc.uuid(), { maxLength: 50 }),
})

/** Generates a RecommendContext */
const contextArbitrary: fc.Arbitrary<RecommendContext> = fc.record({
  lat: fc.double({ min: -90, max: 90, noNaN: true, noDefaultInfinity: true }),
  lon: fc.double({ min: -180, max: 180, noNaN: true, noDefaultInfinity: true }),
  weather: weatherArbitrary,
  timeSlot: timeSlotArbitrary,
  dayType: dayTypeArbitrary,
})

/** Generates a Spot with valid lat/lon values */
const spotArbitrary: fc.Arbitrary<Spot> = fc.record({
  spotId: fc.uuid(),
  name: fc.string({ minLength: 1, maxLength: 100 }),
  lat: fc.double({ min: -90, max: 90, noNaN: true, noDefaultInfinity: true }),
  lon: fc.double({ min: -180, max: 180, noNaN: true, noDefaultInfinity: true }),
  category: fc.constantFrom('飲食', '観光', '施設', 'ショッピング', 'エンタメ'),
  area: fc.constantFrom('栄', '名古屋駅', '大須', '今池', '覚王山', '金山', '千種', '熱田'),
  reviewCount: fc.nat({ max: 500 }),
  thumbnailUrl: fc.string({ minLength: 1, maxLength: 200 }),
})

/** Generates a search condition: center coordinates + radius in meters */
const searchArbitrary: fc.Arbitrary<{ centerLat: number; centerLon: number; radiusM: number }> =
  fc.record({
    centerLat: fc.double({ min: -90, max: 90, noNaN: true, noDefaultInfinity: true }),
    centerLon: fc.double({ min: -180, max: 180, noNaN: true, noDefaultInfinity: true }),
    radiusM: fc.double({ min: 1, max: 50000, noNaN: true, noDefaultInfinity: true }),
  })

// ---- Property Tests ----

// Feature: nago-time-demo, Property 10: レコメンドスコアの降順ソート保証
describe('Property 10: レコメンドスコアの降順ソート保証', () => {
  it('recommend() が返すリストは合計スコアの降順でソートされている', () => {
    // Validates: Requirements 4.3
    fc.assert(
      fc.property(fc.array(reviewArbitrary), contextArbitrary, (reviews, context) => {
        const result = recommend(reviews, context)

        // Helper: recalculate total score for a given review and context
        const calcScore = (review: Review): number => {
          const distanceM = haversine(context.lat, context.lon, review.lat, review.lon)
          const w = calcWeatherScore(review.weather, context.weather)
          const t = calcTimeSlotScore(review.timeSlot, context.timeSlot)
          const d = calcDistanceScore(distanceM)
          const l = calcLikesScore(review.likeCount)
          return calcTotalScore(w, t, d, l)
        }

        for (let i = 0; i < result.length - 1; i++) {
          const scoreA = calcScore(result[i])
          const scoreB = calcScore(result[i + 1])
          expect(scoreA).toBeGreaterThanOrEqual(scoreB)
        }
      }),
      { numRuns: 100 }
    )
  })
})

// Feature: nago-time-demo, Property 11: Haversine スポット範囲内フィルタ正確性
describe('Property 11: Haversine スポット範囲内フィルタ正確性', () => {
  it('filterSpotsByRadius() が返すすべてのスポットは指定半径内にある', () => {
    // Validates: Requirements 6.1
    fc.assert(
      fc.property(
        fc.array(spotArbitrary),
        searchArbitrary,
        (spots, { centerLat, centerLon, radiusM }) => {
          const result = filterSpotsByRadius(spots, centerLat, centerLon, radiusM)
          for (const spot of result) {
            const dist = haversine(centerLat, centerLon, spot.lat, spot.lon)
            expect(dist).toBeLessThanOrEqual(radiusM)
          }
        }
      ),
      { numRuns: 100 }
    )
  })
})
