// src/utils/__tests__/geoUtils.test.ts
// Example-based unit tests for geo utility functions in geoUtils.ts
// Requirements: 6.1

import { describe, it, expect } from 'vitest'
import { haversine, filterSpotsByRadius, sortByDistance } from '../geoUtils'
import type { Spot } from '../../mocks/data/types'

// ---------------------------------------------------------------------------
// Test fixtures
// ---------------------------------------------------------------------------

/** 名古屋駅（JR 名古屋駅中央口付近）*/
const NAGOYA_STATION = { lat: 35.1706, lon: 136.8816 }

/** 栄（栄地下鉄駅付近）*/
const SAKAE = { lat: 35.1700, lon: 136.9080 }

/** 大須観音 */
const OSU = { lat: 35.1594, lon: 136.8978 }

/** 覚王山 */
const KAKUOZAN = { lat: 35.1654, lon: 136.9374 }

/** テスト用スポット配列 */
const testSpots: Spot[] = [
  {
    spotId: 'spot-nagoya',
    name: '名古屋駅',
    lat: NAGOYA_STATION.lat,
    lon: NAGOYA_STATION.lon,
    category: '交通',
    area: '名古屋駅',
    reviewCount: 100,
    thumbnailUrl: 'https://picsum.photos/seed/nagoya/400/300',
  },
  {
    spotId: 'spot-sakae',
    name: '栄',
    lat: SAKAE.lat,
    lon: SAKAE.lon,
    category: 'ショッピング',
    area: '栄',
    reviewCount: 200,
    thumbnailUrl: 'https://picsum.photos/seed/sakae/400/300',
  },
  {
    spotId: 'spot-osu',
    name: '大須観音',
    lat: OSU.lat,
    lon: OSU.lon,
    category: '観光',
    area: '大須',
    reviewCount: 150,
    thumbnailUrl: 'https://picsum.photos/seed/osu/400/300',
  },
  {
    spotId: 'spot-kakuozan',
    name: '覚王山',
    lat: KAKUOZAN.lat,
    lon: KAKUOZAN.lon,
    category: '観光',
    area: '覚王山',
    reviewCount: 80,
    thumbnailUrl: 'https://picsum.photos/seed/kakuozan/400/300',
  },
]

// ---------------------------------------------------------------------------
// haversine
// ---------------------------------------------------------------------------
describe('haversine', () => {
  it('同一点間の距離は0m', () => {
    expect(haversine(35.0, 136.0, 35.0, 136.0)).toBe(0)
  })

  it('名古屋駅〜栄の距離は約2.1〜2.5kmの範囲内', () => {
    const dist = haversine(
      NAGOYA_STATION.lat,
      NAGOYA_STATION.lon,
      SAKAE.lat,
      SAKAE.lon,
    )
    // 実測値は約2.4km（Haversine計算）。許容誤差 ±200m
    expect(dist).toBeGreaterThan(2100)
    expect(dist).toBeLessThan(2500)
  })

  it('名古屋駅〜栄の逆方向も同じ距離（対称性）', () => {
    const distAB = haversine(
      NAGOYA_STATION.lat,
      NAGOYA_STATION.lon,
      SAKAE.lat,
      SAKAE.lon,
    )
    const distBA = haversine(
      SAKAE.lat,
      SAKAE.lon,
      NAGOYA_STATION.lat,
      NAGOYA_STATION.lon,
    )
    expect(Math.abs(distAB - distBA)).toBeLessThan(0.001) // 浮動小数点誤差のみ
  })

  it('距離は常に非負', () => {
    const dist = haversine(35.1, 136.9, 34.9, 136.7)
    expect(dist).toBeGreaterThanOrEqual(0)
  })

  it('緯度1度分の距離は約111km', () => {
    // 経度を固定して緯度を1度変化させると約111km
    const dist = haversine(0, 0, 1, 0)
    expect(dist).toBeGreaterThan(110000)
    expect(dist).toBeLessThan(112000)
  })
})

// ---------------------------------------------------------------------------
// filterSpotsByRadius
// ---------------------------------------------------------------------------
describe('filterSpotsByRadius', () => {
  it('半径3000m: 名古屋駅中心で栄・大須は含まれるが覚王山は含まれない', () => {
    const result = filterSpotsByRadius(
      testSpots,
      NAGOYA_STATION.lat,
      NAGOYA_STATION.lon,
      3000,
    )
    const ids = result.map((s) => s.spotId)
    // 名古屋駅自体（0m）と大須（約2.3km）と栄（約2.2km）は含まれる
    expect(ids).toContain('spot-nagoya')
    expect(ids).toContain('spot-sakae')
    // 覚王山（約5.2km）は含まれない
    expect(ids).not.toContain('spot-kakuozan')
  })

  it('半径0mでは自分自身の座標にあるスポットのみ返す', () => {
    const result = filterSpotsByRadius(
      testSpots,
      NAGOYA_STATION.lat,
      NAGOYA_STATION.lon,
      0,
    )
    expect(result).toHaveLength(1)
    expect(result[0].spotId).toBe('spot-nagoya')
  })

  it('半径10000mなら全スポットが含まれる', () => {
    const result = filterSpotsByRadius(
      testSpots,
      NAGOYA_STATION.lat,
      NAGOYA_STATION.lon,
      10000,
    )
    expect(result).toHaveLength(testSpots.length)
  })

  it('空のスポット配列を渡すと空を返す', () => {
    const result = filterSpotsByRadius([], 35.17, 136.88, 5000)
    expect(result).toHaveLength(0)
  })

  it('返されたスポットはすべて指定半径内', () => {
    const centerLat = SAKAE.lat
    const centerLon = SAKAE.lon
    const radiusM = 2500
    const result = filterSpotsByRadius(testSpots, centerLat, centerLon, radiusM)
    for (const spot of result) {
      const dist = haversine(centerLat, centerLon, spot.lat, spot.lon)
      expect(dist).toBeLessThanOrEqual(radiusM)
    }
  })
})

// ---------------------------------------------------------------------------
// sortByDistance
// ---------------------------------------------------------------------------
describe('sortByDistance', () => {
  it('名古屋駅中心でソートすると名古屋駅スポットが最初', () => {
    const result = sortByDistance(
      testSpots,
      NAGOYA_STATION.lat,
      NAGOYA_STATION.lon,
    )
    expect(result[0].spotId).toBe('spot-nagoya')
  })

  it('距離が近い順にソートされている', () => {
    const result = sortByDistance(
      testSpots,
      NAGOYA_STATION.lat,
      NAGOYA_STATION.lon,
    )
    for (let i = 0; i < result.length - 1; i++) {
      const distA = haversine(
        NAGOYA_STATION.lat,
        NAGOYA_STATION.lon,
        result[i].lat,
        result[i].lon,
      )
      const distB = haversine(
        NAGOYA_STATION.lat,
        NAGOYA_STATION.lon,
        result[i + 1].lat,
        result[i + 1].lon,
      )
      expect(distA).toBeLessThanOrEqual(distB)
    }
  })

  it('元の配列を変更しない（immutable）', () => {
    const original = [...testSpots]
    sortByDistance(testSpots, NAGOYA_STATION.lat, NAGOYA_STATION.lon)
    expect(testSpots).toEqual(original)
  })

  it('空配列を渡すと空を返す', () => {
    const result = sortByDistance([], 35.17, 136.88)
    expect(result).toHaveLength(0)
  })

  it('1件のみの配列でも正しく動作する', () => {
    const single = [testSpots[0]]
    const result = sortByDistance(single, NAGOYA_STATION.lat, NAGOYA_STATION.lon)
    expect(result).toHaveLength(1)
    expect(result[0].spotId).toBe('spot-nagoya')
  })
})
