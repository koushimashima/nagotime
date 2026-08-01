// src/utils/__tests__/scoring.test.ts
// Example-based unit tests for scoring functions in scoring.ts
// Requirements: 4.3

import { describe, it, expect } from 'vitest'
import {
  calcWeatherScore,
  calcTimeSlotScore,
  calcDistanceScore,
  calcLikesScore,
  calcTotalScore,
  recommend,
} from '../scoring'
import type { Review, RecommendContext } from '../../mocks/data/types'

// ---------------------------------------------------------------------------
// calcWeatherScore
// ---------------------------------------------------------------------------
describe('calcWeatherScore', () => {
  it('同じ天気（SUNNY）→ 1.0', () => {
    expect(calcWeatherScore('SUNNY', 'SUNNY')).toBe(1.0)
  })

  it('同じ天気（RAINY）→ 1.0', () => {
    expect(calcWeatherScore('RAINY', 'RAINY')).toBe(1.0)
  })

  it('異なる天気（SUNNY vs RAINY）→ 0.0', () => {
    expect(calcWeatherScore('SUNNY', 'RAINY')).toBe(0.0)
  })

  it('異なる天気（CLOUDY vs SNOWY）→ 0.0', () => {
    expect(calcWeatherScore('CLOUDY', 'SNOWY')).toBe(0.0)
  })

  it('レビュー側が UNKNOWN → 0.0', () => {
    expect(calcWeatherScore('UNKNOWN', 'SUNNY')).toBe(0.0)
  })

  it('現在天気が UNKNOWN → 0.0', () => {
    expect(calcWeatherScore('SUNNY', 'UNKNOWN')).toBe(0.0)
  })

  it('両方 UNKNOWN → 0.0', () => {
    expect(calcWeatherScore('UNKNOWN', 'UNKNOWN')).toBe(0.0)
  })

  it('CLOUDY 同士 → 1.0', () => {
    expect(calcWeatherScore('CLOUDY', 'CLOUDY')).toBe(1.0)
  })
})

// ---------------------------------------------------------------------------
// calcTimeSlotScore
// ---------------------------------------------------------------------------
describe('calcTimeSlotScore', () => {
  it('同じ時間帯（MORNING）→ 1.0', () => {
    expect(calcTimeSlotScore('MORNING', 'MORNING')).toBe(1.0)
  })

  it('同じ時間帯（NIGHT）→ 1.0', () => {
    expect(calcTimeSlotScore('NIGHT', 'NIGHT')).toBe(1.0)
  })

  it('隣接時間帯（MORNING と AFTERNOON）→ 0.5', () => {
    expect(calcTimeSlotScore('MORNING', 'AFTERNOON')).toBe(0.5)
    expect(calcTimeSlotScore('AFTERNOON', 'MORNING')).toBe(0.5)
  })

  it('隣接時間帯（AFTERNOON と EVENING）→ 0.5', () => {
    expect(calcTimeSlotScore('AFTERNOON', 'EVENING')).toBe(0.5)
    expect(calcTimeSlotScore('EVENING', 'AFTERNOON')).toBe(0.5)
  })

  it('隣接時間帯（EVENING と NIGHT）→ 0.5', () => {
    expect(calcTimeSlotScore('EVENING', 'NIGHT')).toBe(0.5)
    expect(calcTimeSlotScore('NIGHT', 'EVENING')).toBe(0.5)
  })

  it('循環隣接（NIGHT と MORNING）→ 0.5', () => {
    expect(calcTimeSlotScore('NIGHT', 'MORNING')).toBe(0.5)
    expect(calcTimeSlotScore('MORNING', 'NIGHT')).toBe(0.5)
  })

  it('距離2以上の時間帯（MORNING と EVENING）→ 0.0', () => {
    expect(calcTimeSlotScore('MORNING', 'EVENING')).toBe(0.0)
    expect(calcTimeSlotScore('EVENING', 'MORNING')).toBe(0.0)
  })

  it('距離2以上の時間帯（MORNING と NIGHT）は循環距離1なので → 0.5', () => {
    // MORNING=0, NIGHT=3、循環距離 min(3, 4-3) = min(3, 1) = 1
    expect(calcTimeSlotScore('MORNING', 'NIGHT')).toBe(0.5)
  })

  it('対角の時間帯（AFTERNOON と NIGHT）→ 0.0', () => {
    // 循環距離 min(2, 4-2) = 2
    expect(calcTimeSlotScore('AFTERNOON', 'NIGHT')).toBe(0.0)
  })
})

// ---------------------------------------------------------------------------
// calcDistanceScore
// ---------------------------------------------------------------------------
describe('calcDistanceScore', () => {
  it('距離0m → 1.0（最大スコア）', () => {
    expect(calcDistanceScore(0)).toBe(1.0)
  })

  it('距離2500m → 0.5（中間）', () => {
    expect(calcDistanceScore(2500)).toBeCloseTo(0.5)
  })

  it('距離5000m → 0.0（境界）', () => {
    expect(calcDistanceScore(5000)).toBe(0.0)
  })

  it('距離10000m → 0.0（境界超過も0以下にはならない）', () => {
    expect(calcDistanceScore(10000)).toBe(0.0)
  })

  it('距離1000m → 0.8', () => {
    expect(calcDistanceScore(1000)).toBeCloseTo(0.8)
  })

  it('距離4000m → 0.2', () => {
    expect(calcDistanceScore(4000)).toBeCloseTo(0.2)
  })

  it('負の距離でも0以上を返す（防御的）', () => {
    expect(calcDistanceScore(-100)).toBeGreaterThanOrEqual(0)
  })
})

// ---------------------------------------------------------------------------
// calcLikesScore
// ---------------------------------------------------------------------------
describe('calcLikesScore', () => {
  it('0いいね → 0.0', () => {
    expect(calcLikesScore(0)).toBe(0.0)
  })

  it('100いいね → 1.0（上限）', () => {
    expect(calcLikesScore(100)).toBe(1.0)
  })

  it('200いいね → 1.0（上限超過でもキャップ）', () => {
    expect(calcLikesScore(200)).toBe(1.0)
  })

  it('50いいね → 0.5（中間）', () => {
    expect(calcLikesScore(50)).toBeCloseTo(0.5)
  })

  it('10いいね → 0.1', () => {
    expect(calcLikesScore(10)).toBeCloseTo(0.1)
  })

  it('1000いいね → 1.0（大きな値でもキャップ）', () => {
    expect(calcLikesScore(1000)).toBe(1.0)
  })
})

// ---------------------------------------------------------------------------
// calcTotalScore
// ---------------------------------------------------------------------------
describe('calcTotalScore', () => {
  it('全スコア1.0 → 合計1.0', () => {
    // 0.30*1 + 0.25*1 + 0.30*1 + 0.15*1 = 1.0
    expect(calcTotalScore(1.0, 1.0, 1.0, 1.0)).toBeCloseTo(1.0)
  })

  it('全スコア0.0 → 合計0.0', () => {
    expect(calcTotalScore(0.0, 0.0, 0.0, 0.0)).toBe(0.0)
  })

  it('天気スコアのみ1.0 → 0.30', () => {
    // 0.30*1 + 0.25*0 + 0.30*0 + 0.15*0 = 0.30
    expect(calcTotalScore(1.0, 0.0, 0.0, 0.0)).toBeCloseTo(0.30)
  })

  it('時間帯スコアのみ1.0 → 0.25', () => {
    // 0.30*0 + 0.25*1 + 0.30*0 + 0.15*0 = 0.25
    expect(calcTotalScore(0.0, 1.0, 0.0, 0.0)).toBeCloseTo(0.25)
  })

  it('距離スコアのみ1.0 → 0.30', () => {
    // 0.30*0 + 0.25*0 + 0.30*1 + 0.15*0 = 0.30
    expect(calcTotalScore(0.0, 0.0, 1.0, 0.0)).toBeCloseTo(0.30)
  })

  it('いいねスコアのみ1.0 → 0.15', () => {
    // 0.30*0 + 0.25*0 + 0.30*0 + 0.15*1 = 0.15
    expect(calcTotalScore(0.0, 0.0, 0.0, 1.0)).toBeCloseTo(0.15)
  })

  it('典型的な組み合わせ（天気一致・距離500m・50いいね）', () => {
    // w=1.0, t=0.5（隣接）, d=0.9（500m）, l=0.5（50いいね）
    // 0.30*1.0 + 0.25*0.5 + 0.30*0.9 + 0.15*0.5
    // = 0.30 + 0.125 + 0.27 + 0.075 = 0.77
    expect(calcTotalScore(1.0, 0.5, 0.9, 0.5)).toBeCloseTo(0.77)
  })
})

// ---------------------------------------------------------------------------
// recommend — 降順ソート・PUBLISHED のみ
// ---------------------------------------------------------------------------

/** テスト用に最小限の Review を生成するヘルパー */
function makeReview(overrides: Partial<Review>): Review {
  return {
    reviewId: 'r1',
    userId: 'u1',
    userName: 'テストユーザー',
    spotId: 's1',
    spotName: 'テストスポット',
    area: '栄',
    lat: 35.1706,
    lon: 136.9080,
    text: 'a'.repeat(50),
    photoUrls: ['https://picsum.photos/seed/test/400/300'],
    status: 'PUBLISHED',
    weather: 'SUNNY',
    timeSlot: 'AFTERNOON',
    dayType: 'WEEKDAY',
    likeCount: 10,
    viewCount: 100,
    createdAt: '2024-01-01T12:00:00.000Z',
    likedUserIds: [],
    ...overrides,
  }
}

const defaultContext: RecommendContext = {
  lat: 35.1706,
  lon: 136.9080,
  weather: 'SUNNY',
  timeSlot: 'AFTERNOON',
  dayType: 'WEEKDAY',
}

describe('recommend', () => {
  it('空配列を渡すと空を返す', () => {
    expect(recommend([], defaultContext)).toHaveLength(0)
  })

  it('PUBLISHED でない口コミは除外される', () => {
    const reviews = [
      makeReview({ reviewId: 'r1', status: 'PENDING' }),
      makeReview({ reviewId: 'r2', status: 'REJECTED' }),
      makeReview({ reviewId: 'r3', status: 'PUBLISHED' }),
    ]
    const result = recommend(reviews, defaultContext)
    expect(result).toHaveLength(1)
    expect(result[0].reviewId).toBe('r3')
  })

  it('全て PUBLISHED の場合は全件返す', () => {
    const reviews = [
      makeReview({ reviewId: 'r1' }),
      makeReview({ reviewId: 'r2' }),
      makeReview({ reviewId: 'r3' }),
    ]
    expect(recommend(reviews, defaultContext)).toHaveLength(3)
  })

  it('天気が一致する口コミが上位に来る', () => {
    // r1: 天気一致（SUNNY）、r2: 天気不一致（RAINY）
    const reviews = [
      makeReview({ reviewId: 'r2', weather: 'RAINY', lat: 35.1706, lon: 136.9080, likeCount: 100 }),
      makeReview({ reviewId: 'r1', weather: 'SUNNY', lat: 35.1706, lon: 136.9080, likeCount: 0 }),
    ]
    const context: RecommendContext = { ...defaultContext, weather: 'SUNNY' }
    const result = recommend(reviews, context)
    // r1（天気一致）がr2（いいね数多いが天気不一致）より上
    expect(result[0].reviewId).toBe('r1')
  })

  it('スコアが高い順に並んでいる（降順保証）', () => {
    // 近距離・天気一致のr1 が高スコア、遠距離・天気不一致のr2 が低スコア
    const reviews = [
      makeReview({
        reviewId: 'r-low',
        weather: 'RAINY',      // 天気不一致
        lat: 34.0,             // 遠い
        lon: 135.0,
        likeCount: 0,
      }),
      makeReview({
        reviewId: 'r-high',
        weather: 'SUNNY',      // 天気一致
        lat: 35.1706,          // 近い（同一座標）
        lon: 136.9080,
        likeCount: 100,
      }),
    ]
    const result = recommend(reviews, defaultContext)
    expect(result[0].reviewId).toBe('r-high')
    expect(result[1].reviewId).toBe('r-low')
  })

  it('結果のスコアは降順に並んでいる（複数件）', () => {
    // 距離だけ変えて4件のレビューを作成
    const reviews = [
      makeReview({ reviewId: 'r4', lat: 34.0, lon: 135.0, likeCount: 0, weather: 'RAINY' }),
      makeReview({ reviewId: 'r1', lat: 35.1706, lon: 136.9080, likeCount: 100, weather: 'SUNNY' }),
      makeReview({ reviewId: 'r3', lat: 34.5, lon: 136.0, likeCount: 10, weather: 'CLOUDY' }),
      makeReview({ reviewId: 'r2', lat: 35.1, lon: 136.8, likeCount: 50, weather: 'SUNNY' }),
    ]
    const result = recommend(reviews, defaultContext)
    expect(result).toHaveLength(4)
    // 先頭は r1（同一座標・天気一致・いいね100）であるべき
    expect(result[0].reviewId).toBe('r1')
  })

  it('元の配列を変更しない（immutable）', () => {
    const reviews = [
      makeReview({ reviewId: 'r1', weather: 'RAINY' }),
      makeReview({ reviewId: 'r2', weather: 'SUNNY' }),
    ]
    const originalOrder = reviews.map((r) => r.reviewId)
    recommend(reviews, defaultContext)
    // 元の配列の順序が変わっていないこと
    expect(reviews.map((r) => r.reviewId)).toEqual(originalOrder)
  })
})
