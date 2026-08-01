// src/utils/mileUtils.ts
// Mile and coupon utility functions for NagoTime
// Requirements: 8.3–8.6, 10.1–10.5

import type { Coupon, CouponAd, MileTransaction, Review } from '../mocks/data/types'

// ---------------------------------------------------------------------------
// toggleLike
// ---------------------------------------------------------------------------

/**
 * Pure function that models the "like" toggle operation.
 *
 * Given the current set of user IDs that have already liked a review and the
 * ID of the user who is attempting to like, returns:
 * - `{ newSet, success: true }` when the userId is NOT yet in likedSet
 *   (adds the userId to the set — like count should increase by 1).
 * - `{ newSet, success: false }` when the userId IS already in likedSet
 *   (set is returned unchanged — duplicate like, like count must not change).
 *
 * This models Requirements 7.2 and 7.3 (idempotency of like operations) as a
 * pure function that can be tested independently of side effects.
 *
 * Property 12: calling toggleLike multiple times with the same userId always
 * produces success=false after the first call, keeping the set size unchanged.
 *
 * @param likedSet  - Set of userIds that have already liked this review
 * @param userId    - The user attempting to like
 * @returns `{ newSet: Set<string>; success: boolean }`
 */
export function toggleLike(
  likedSet: Set<string>,
  userId: string,
): { newSet: Set<string>; success: boolean } {
  if (likedSet.has(userId)) {
    // Duplicate like — return the same set, mark as failure
    return { newSet: new Set(likedSet), success: false }
  }
  // First like — add the user and mark as success
  const newSet = new Set(likedSet)
  newSet.add(userId)
  return { newSet, success: true }
}

// ---------------------------------------------------------------------------
// calcBalance
// ---------------------------------------------------------------------------

/**
 * Calculate the final mile balance by applying a sequence of transactions
 * to an initial balance.
 *
 * - Each transaction's `amount` is accumulated (REDEEM transactions carry
 *   a negative amount per the data contract).
 * - The result is clamped to 0 so the balance never goes negative.
 *
 * Requirements: 8.3, 8.4, 8.5
 *
 * @param initial      - Starting balance (≥ 0)
 * @param transactions - Ordered list of mile transactions to apply
 * @returns Final balance (always ≥ 0)
 */
export function calcBalance(
  initial: number,
  transactions: MileTransaction[],
): number {
  const sum = transactions.reduce((acc, tx) => acc + tx.amount, initial)
  return Math.max(0, sum)
}

// ---------------------------------------------------------------------------
// generateCouponCode
// ---------------------------------------------------------------------------

const ALPHANUMERIC = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789'

/**
 * Generate a random alphanumeric coupon code.
 *
 * - Characters are drawn from [a-zA-Z0-9] (62 chars).
 * - Code length is randomly chosen in the range [1, 64].
 *
 * Requirements: 8.6
 * Property 14: generated code consists only of [a-zA-Z0-9] and has length 1–64.
 *
 * @returns A random alphanumeric string of length 1–64
 */
export function generateCouponCode(): string {
  // length: 1–64 inclusive
  const length = Math.floor(Math.random() * 64) + 1
  let code = ''
  for (let i = 0; i < length; i++) {
    code += ALPHANUMERIC[Math.floor(Math.random() * ALPHANUMERIC.length)]
  }
  return code
}

// ---------------------------------------------------------------------------
// injectAds
// ---------------------------------------------------------------------------

/**
 * Interleave coupon advertisements into a review list at a ratio of 1 ad
 * per 20 reviews.
 *
 * Rules (Requirements 10.1–10.5):
 * - If `reviews.length < 20`, return the reviews unchanged (no ads).
 * - If `coupons` contains no ACTIVE entries, return the reviews unchanged.
 * - Otherwise, insert 1 ad after every 20th review.
 *   - Ads cycle through the ACTIVE coupons using modulo index.
 *   - Each ad item has `sponsored: true` (Requirement 10.2).
 *   - The ad carries `couponName`, `sponsorName`, `requiredMiles`, and
 *     `thumbnailUrl` (null on failure) from the coupon (Requirements 10.3, 10.4).
 *
 * Property 15: ad count == floor(reviews.length / 20) when reviews.length >= 20,
 *              else 0.
 *
 * @param reviews - The full list of published reviews
 * @param coupons - All available coupons (may include EXPIRED / SOLD_OUT)
 * @returns Interleaved array of Review and CouponAd items
 */
export function injectAds(
  reviews: Review[],
  coupons: Coupon[],
): (Review | CouponAd)[] {
  // Requirement 10.5: no ads when fewer than 20 reviews
  if (reviews.length < 20) {
    return [...reviews]
  }

  // Requirement 10.1: only ACTIVE coupons are used as ads
  const activeCoupons = coupons.filter((c) => c.status === 'ACTIVE')

  if (activeCoupons.length === 0) {
    return [...reviews]
  }

  const result: (Review | CouponAd)[] = []
  let adIndex = 0

  for (let i = 0; i < reviews.length; i++) {
    result.push(reviews[i])

    // After every 20th review (1-indexed), inject one ad
    if ((i + 1) % 20 === 0) {
      const coupon = activeCoupons[adIndex % activeCoupons.length]
      adIndex++

      const ad: CouponAd = {
        type: 'ad',
        sponsored: true,
        coupon,
      }
      result.push(ad)
    }
  }

  return result
}
