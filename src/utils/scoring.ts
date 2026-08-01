// src/utils/scoring.ts
// スコアリング計算関数 — NagoTime コンテキスト対応レコメンド
// Requirements: 4.1〜4.10

import type { Review, Weather, TimeSlot, RecommendContext } from '../mocks/data/types'
import { haversine } from './geoUtils'

// ---- 重み定数（Requirements 4.10） ----
const WEIGHT_WEATHER = 0.30
const WEIGHT_TIME_SLOT = 0.25
const WEIGHT_DISTANCE = 0.30
const WEIGHT_LIKES = 0.15

// 距離スコアの正規化基準距離（メートル）
const DISTANCE_NORM_M = 5000

// いいねスコアの正規化上限
const LIKES_NORM_MAX = 100

// 時間帯の循環隣接順序
const TIME_SLOT_ORDER: TimeSlot[] = ['MORNING', 'AFTERNOON', 'EVENING', 'NIGHT']

/**
 * 天気スコアを計算する。
 * - 同一天気 → 1.0
 * - どちらかが UNKNOWN → 0.0
 * - それ以外 → 0.0
 *
 * Requirements: 4.3
 *
 * @param reviewWeather - 口コミ投稿時の天気
 * @param currentWeather - 現在の天気
 * @returns 0.0〜1.0
 */
export function calcWeatherScore(
  reviewWeather: Weather,
  currentWeather: Weather,
): number {
  if (reviewWeather === 'UNKNOWN' || currentWeather === 'UNKNOWN') {
    return 0.0
  }
  return reviewWeather === currentWeather ? 1.0 : 0.0
}

/**
 * 時間帯スコアを計算する。
 * - 同一時間帯 → 1.0
 * - 循環隣接（MORNING↔AFTERNOON、AFTERNOON↔EVENING、EVENING↔NIGHT、NIGHT↔MORNING）→ 0.5
 * - それ以外 → 0.0
 *
 * Requirements: 4.3
 *
 * @param reviewSlot - 口コミ投稿時の時間帯
 * @param currentSlot - 現在の時間帯
 * @returns 0.0〜1.0
 */
export function calcTimeSlotScore(
  reviewSlot: TimeSlot,
  currentSlot: TimeSlot,
): number {
  if (reviewSlot === currentSlot) {
    return 1.0
  }

  const len = TIME_SLOT_ORDER.length
  const reviewIdx = TIME_SLOT_ORDER.indexOf(reviewSlot)
  const currentIdx = TIME_SLOT_ORDER.indexOf(currentSlot)

  // 循環距離が 1 なら隣接
  const diff = Math.abs(reviewIdx - currentIdx)
  const circularDiff = Math.min(diff, len - diff)

  return circularDiff === 1 ? 0.5 : 0.0
}

/**
 * 距離スコアを計算する。
 * - `Math.max(0, 1 - distanceM / 5000)`
 * - 5000m 以上は 0.0、0m なら 1.0
 *
 * Requirements: 4.2, 4.3
 *
 * @param distanceM - ユーザーとスポット間の距離（メートル）
 * @returns 0.0〜1.0
 */
export function calcDistanceScore(distanceM: number): number {
  return Math.max(0, 1 - distanceM / DISTANCE_NORM_M)
}

/**
 * いいね数スコアを計算する。
 * - `Math.min(1.0, likeCount / 100)`
 * - 100いいね以上で最大値 1.0
 *
 * Requirements: 4.3
 *
 * @param likeCount - 口コミのいいね数
 * @returns 0.0〜1.0
 */
export function calcLikesScore(likeCount: number): number {
  return Math.min(1.0, likeCount / LIKES_NORM_MAX)
}

/**
 * 合計スコアを計算する。
 * - `0.30 * w + 0.25 * t + 0.30 * d + 0.15 * l`
 *
 * Requirements: 4.3, 4.10
 *
 * @param w - 天気スコア（0.0〜1.0）
 * @param t - 時間帯スコア（0.0〜1.0）
 * @param d - 距離スコア（0.0〜1.0）
 * @param l - いいねスコア（0.0〜1.0）
 * @returns 合計スコア（0.0〜1.0）
 */
export function calcTotalScore(
  w: number,
  t: number,
  d: number,
  l: number,
): number {
  return WEIGHT_WEATHER * w + WEIGHT_TIME_SLOT * t + WEIGHT_DISTANCE * d + WEIGHT_LIKES * l
}

/**
 * 口コミ一覧をコンテキストに基づいてスコアリングし、降順でソートして返す。
 *
 * 動作:
 * 1. PUBLISHED ステータスの口コミのみを対象にする（Requirements 4.8）
 * 2. 各口コミのスコアを計算（天気・時間帯・距離・いいね数）
 * 3. 合計スコアの降順でソートして返す（Requirements 4.3）
 *
 * @param reviews - 口コミ一覧
 * @param context - 現在のコンテキスト（位置情報・天気・時間帯）
 * @returns スコア降順にソートされた口コミ一覧（PUBLISHED のみ）
 */
export function recommend(reviews: Review[], context: RecommendContext): Review[] {
  const published = reviews.filter((r) => r.status === 'PUBLISHED')

  const scored = published.map((review) => {
    const distanceM = haversine(context.lat, context.lon, review.lat, review.lon)

    const w = calcWeatherScore(review.weather, context.weather)
    const t = calcTimeSlotScore(review.timeSlot, context.timeSlot)
    const d = calcDistanceScore(distanceM)
    const l = calcLikesScore(review.likeCount)
    const totalScore = calcTotalScore(w, t, d, l)

    return { review, totalScore }
  })

  scored.sort((a, b) => b.totalScore - a.totalScore)

  return scored.map((item) => item.review)
}
