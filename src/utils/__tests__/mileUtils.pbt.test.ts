// src/utils/__tests__/mileUtils.pbt.test.ts
// Property-based tests for mile, ticket, and like utility functions

import * as fc from 'fast-check'
import { describe, it, expect } from 'vitest'
import { toggleLike, calcBalance, generateTicketCode, injectAds } from '../mileUtils'
import type {
  Review,
  MileTransaction,
  MileTransactionType,
  Ticket,
  TicketStatus,
  ReviewStatus,
  Weather,
  TimeSlot,
  DayType,
} from '../../mocks/data/types'

const reviewStatusArbitrary = fc.constantFrom<ReviewStatus>('PUBLISHED', 'PENDING', 'REJECTED')
const weatherArbitrary = fc.constantFrom<Weather>('SUNNY', 'CLOUDY', 'RAINY', 'SNOWY', 'UNKNOWN')
const timeSlotArbitrary = fc.constantFrom<TimeSlot>('MORNING', 'AFTERNOON', 'EVENING', 'NIGHT')
const dayTypeArbitrary = fc.constantFrom<DayType>('WEEKDAY', 'HOLIDAY')
const isoDateArbitrary = fc
  .date({ min: new Date('2020-01-01'), max: new Date('2030-12-31') })
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

const transactionArbitrary: fc.Arbitrary<MileTransaction> = fc
  .record({
    type: fc.constantFrom<MileTransactionType>('GRANT_REVIEW', 'GRANT_LIKES', 'GRANT_VIEWS', 'REDEEM_TICKET'),
    magnitude: fc.nat({ max: 500 }),
  })
  .chain(({ type, magnitude }) => {
    const amount = type === 'REDEEM_TICKET' ? -magnitude : magnitude
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

const activeTicketArbitrary: fc.Arbitrary<Ticket> = fc.record({
  ticketId: fc.uuid(),
  sponsorId: fc.uuid(),
  sponsorName: fc.string({ minLength: 1, maxLength: 50 }),
  name: fc.string({ minLength: 1, maxLength: 100 }),
  description: fc.string({ minLength: 0, maxLength: 500 }),
  requiredMiles: fc.integer({ min: 1, max: 5000 }),
  expiresAt: isoDateArbitrary,
  issueLimit: fc.integer({ min: 1, max: 1000 }),
  redeemedCount: fc.nat({ max: 999 }),
  status: fc.constant<TicketStatus>('ACTIVE'),
  thumbnailUrl: fc.option(fc.webUrl(), { nil: null }),
})

describe('mileUtils PBT', () => {
  it('Property 12: 同一ユーザーが同一口コミに複数回いいねしても likeCount は 1 回分しか増加しない', () => {
    fc.assert(
      fc.property(fc.tuple(fc.string(), fc.string()), ([reviewId, userId]) => {
        const first = toggleLike(new Set<string>(), userId)
        expect(first.success).toBe(true)
        expect(first.newSet.size).toBe(1)

        const second = toggleLike(first.newSet, userId)
        expect(second.success).toBe(false)
        expect(second.newSet.size).toBe(1)

        const third = toggleLike(second.newSet, userId)
        expect(third.success).toBe(false)
        expect(third.newSet.size).toBe(1)

        void reviewId
      }),
      { numRuns: 100 }
    )
  })

  it('Property 13: 最終残高は 初期残高 + Σ(付与) - Σ(交換) に等しく、常に 0 以上である', () => {
    fc.assert(
      fc.property(fc.nat({ max: 10000 }), fc.array(transactionArbitrary), (initial, transactions) => {
        const result = calcBalance(initial, transactions)
        expect(result).toBeGreaterThanOrEqual(0)
        expect(result).toBe(Math.max(0, transactions.reduce((acc, tx) => acc + tx.amount, initial)))
      }),
      { numRuns: 100 }
    )
  })

  it('Property 14: generateTicketCode は必ず英数字のみで構成され、長さが 1 以上 64 以下である', () => {
    fc.assert(
      fc.property(fc.constant(null), () => {
        const code = generateTicketCode()
        expect(code).toMatch(/^[a-zA-Z0-9]+$/)
        expect(code.length).toBeGreaterThanOrEqual(1)
        expect(code.length).toBeLessThanOrEqual(64)
      }),
      { numRuns: 100 }
    )
  })

  it('Property 15: injectAds が返すリストの広告件数は floor(reviews.length / 20) に等しい', () => {
    fc.assert(
      fc.property(
        fc.array(reviewArbitrary, { maxLength: 100 }),
        fc.array(activeTicketArbitrary, { minLength: 1, maxLength: 10 }),
        (reviews, tickets) => {
          const result = injectAds(reviews, tickets)
          const adCount = result.filter(
            (item): item is (typeof result)[number] & { sponsored: true } =>
              'sponsored' in item && item.sponsored === true,
          ).length
          expect(adCount).toBe(Math.floor(reviews.length / 20))
          if (reviews.length < 20) expect(adCount).toBe(0)
        }
      ),
      { numRuns: 100 }
    )
  })
})
