// src/utils/__tests__/mileUtils.pbt.test.ts
// Property-based tests for mile, coupon, and like utility functions
// Feature: nago-time-demo

import * as fc from 'fast-check'
import { describe, it, expect } from 'vitest'
import { toggleLike, calcBalance, generateCouponCode, injectAds } from '../mileUtils'
import type {
  Review,
  MileTransaction,
  MileTransactionType,
  Coupon,
  CouponStatus,
  ReviewStatus,
  Weather,
  TimeSlot,
  DayType,
} from '../../mocks/data/types'

// ---- Arbitraries ----

const reviewStatusArbitrary = fc.constantFrom<ReviewStatus>('PUBLISHED', 'PENDING', 'REJECTED')
const weatherArbitrary = fc.constantFrom<Weather>('SUNNY', 'CLOUDY', 'RAINY', 'SNOWY', 'UNKNOWN')
const timeSlotArbitrary = fc.constantFrom<TimeSlot>('MORNING', 'AFTERNOON', 'EVENING', 'NIGHT')
const dayTypeArbitrary = fc.constantFrom<DayType>('WEEKDAY', 'HOLIDAY')

const isoDateArbitrary = fc
  .date({ min: new Date('2020-01-01T00:00:00.000Z'), max: new Date('2030-12-31T23:59:59.999Z') })
  .map((d) => d.toISOString())

/** Generates a Review suitable for injectAds testing */
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
  photoUrls: fc.array(fc.string({ minLength: 1, maxLength: 200 }), { minLength: 1, maxLength: 5 }),
  status: reviewStatusArbitrary,
  weather: weatherArbitrary,
  timeSlot: timeSlotArbitrary,
  dayType: dayTypeArbitrary,
  likeCount: fc.nat({ max: 500 }),
  viewCount: fc.nat({ max: 10000 }),
  createdAt: isoDateArbitrary,
  likedUserIds: fc.array(fc.uuid(), { maxLength: 50 }),
})

/**
 * Generates a MileTransaction.
 * GRANT transactions have a positive amount; REDEEM transactions have a
 * negative amount (matching the data contract used by calcBalance).
 */
const transactionArbitrary: fc.Arbitrary<MileTransaction> = fc
  .record({
    type: fc.constantFrom<MileTransactionType>(
      'GRANT_REVIEW',
      'GRANT_LIKES',
      'GRANT_VIEWS',
      'REDEEM_COUPON',
    ),
    magnitude: fc.nat({ max: 500 }), // always non-negative; sign applied below
  })
  .chain(({ type, magnitude }) => {
    const amount = type === 'REDEEM_COUPON' ? -magnitude : magnitude
    return fc.record({
      transactionId: fc.uuid(),
      userId: fc.uuid(),
      type: fc.constant(type),
      amount: fc.constant(amount),
      balanceAfter: fc.nat({ max: 10000 }),
      relatedId: fc.uuid(),
      createdAt: isoDateArbitrary,
    })
  })

/** Generates an ACTIVE coupon for ad-injection tests */
const activeCouponArbitrary: fc.Arbitrary<Coupon> = fc.record({
  couponId: fc.uuid(),
  sponsorId: fc.uuid(),
  sponsorName: fc.string({ minLength: 1, maxLength: 50 }),
  name: fc.string({ minLength: 1, maxLength: 100 }),
  description: fc.string({ minLength: 0, maxLength: 500 }),
  requiredMiles: fc.integer({ min: 1, max: 5000 }),
  expiresAt: isoDateArbitrary,
  issueLimit: fc.integer({ min: 1, max: 1000 }),
  redeemedCount: fc.nat({ max: 999 }),
  status: fc.constant<CouponStatus>('ACTIVE'),
  thumbnailUrl: fc.option(fc.webUrl(), { nil: null }),
})

// ---- Property Tests ----

describe('mileUtils PBT', () => {
  // Feature: nago-time-demo, Property 12: いいね操作の冪等性
  it('Property 12: 同一ユーザーが同一口コミに複数回いいねしても likeCount は 1 回分しか増加しない', () => {
    // Validates: Requirements 7.2, 7.3
    fc.assert(
      fc.property(fc.tuple(fc.string(), fc.string()), ([reviewId, userId]) => {
        // Start with an empty liked-set
        const emptySet = new Set<string>()

        // First like: should succeed and add the user
        const first = toggleLike(emptySet, userId)
        expect(first.success).toBe(true)
        expect(first.newSet.has(userId)).toBe(true)
        expect(first.newSet.size).toBe(1)

        // Second like with the same userId: must fail, set size unchanged
        const second = toggleLike(first.newSet, userId)
        expect(second.success).toBe(false)
        expect(second.newSet.size).toBe(first.newSet.size)

        // Third (and beyond) like: still fails, set size still unchanged
        const third = toggleLike(second.newSet, userId)
        expect(third.success).toBe(false)
        expect(third.newSet.size).toBe(first.newSet.size)

        // The reviewId is part of the arbitrary but the pure function operates on the
        // set directly; we use it here to satisfy the tuple arbitrary signature and
        // to ensure the test scales across all (reviewId, userId) pairs.
        void reviewId
      }),
      { numRuns: 100 }
    )
  })

  // Feature: nago-time-demo, Property 13: マイル残高の整合性
  it('Property 13: 最終残高は 初期残高 + Σ(付与) - Σ(交換) に等しく、常に 0 以上である', () => {
    // Validates: Requirements 8.3, 8.4, 8.5
    fc.assert(
      fc.property(
        fc.nat({ max: 10000 }),          // initial balance
        fc.array(transactionArbitrary),  // sequence of transactions
        (initial, transactions) => {
          const result = calcBalance(initial, transactions)

          // Balance must never go negative
          expect(result).toBeGreaterThanOrEqual(0)

          // Balance must equal max(0, initial + Σ amounts)
          const raw = transactions.reduce((acc, tx) => acc + tx.amount, initial)
          const expected = Math.max(0, raw)
          expect(result).toBe(expected)
        }
      ),
      { numRuns: 100 }
    )
  })

  // Feature: nago-time-demo, Property 14: クーポンコードのフォーマット保証
  it('Property 14: generateCouponCode は必ず英数字のみで構成され、長さが 1 以上 64 以下である', () => {
    // Validates: Requirements 8.6
    fc.assert(
      fc.property(fc.constant(null), () => {
        const code = generateCouponCode()

        // Must match [a-zA-Z0-9] only
        expect(code).toMatch(/^[a-zA-Z0-9]+$/)

        // Length must be between 1 and 64 inclusive
        expect(code.length).toBeGreaterThanOrEqual(1)
        expect(code.length).toBeLessThanOrEqual(64)
      }),
      { numRuns: 100 }
    )
  })

  // Feature: nago-time-demo, Property 15: 広告差し込み比率の正確性
  it('Property 15: injectAds が返すリストの広告件数は floor(reviews.length / 20) に等しい', () => {
    // Validates: Requirements 10.1, 10.5
    fc.assert(
      fc.property(
        fc.array(reviewArbitrary, { maxLength: 100 }),
        fc.array(activeCouponArbitrary, { minLength: 1, maxLength: 10 }),
        (reviews, coupons) => {
          const result = injectAds(reviews, coupons)

          // Count items where sponsored === true (i.e. CouponAd)
          const adCount = result.filter(
            (item): item is (typeof result)[number] & { sponsored: true } =>
              'sponsored' in item && item.sponsored === true,
          ).length

          const expectedAdCount = Math.floor(reviews.length / 20)
          expect(adCount).toBe(expectedAdCount)

          // Additional: when reviews.length < 20, there must be 0 ads
          if (reviews.length < 20) {
            expect(adCount).toBe(0)
          }
        }
      ),
      { numRuns: 100 }
    )
  })
})
