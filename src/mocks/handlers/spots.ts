// src/mocks/handlers/spots.ts
// マップ・スポット検索ハンドラー（Requirements 6.1〜6.7）

import { http, HttpResponse, delay } from 'msw'
import { mockSpots } from '../data/spots'

// ---- Haversine 距離計算（インライン実装） ----
// geoUtils.ts はまだ存在しないため、ここで直接実装する（Requirements 6.1）

/**
 * Haversine 公式で2点間の距離をメートル単位で返す。
 */
function haversine(lat1: number, lon1: number, lat2: number, lon2: number): number {
  const R = 6371000 // 地球半径 (m)
  const toRad = (deg: number) => (deg * Math.PI) / 180
  const dLat = toRad(lat2 - lat1)
  const dLon = toRad(lon2 - lon1)
  const a =
    Math.sin(dLat / 2) ** 2 +
    Math.cos(toRad(lat1)) * Math.cos(toRad(lat2)) * Math.sin(dLon / 2) ** 2
  return R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a))
}

export const spotHandlers = [
  /**
   * GET /api/map/spots
   * lat/lon/radius クエリパラメータでスポットをフィルタリングして返す。
   * - 認証不要
   * - 200〜500ms のランダム遅延
   * - 半径内スポットを距離近い順に最大50件返す（Requirements 6.1, 6.5）
   * - パラメータ不正時は 400（Requirements 6.6）
   * - 該当なし時は空リスト（Requirements 6.7）
   *
   * Requirements: 6.1〜6.7
   */
  http.get('/api/map/spots', async ({ request }) => {
    await delay(300)

    const url = new URL(request.url)
    const latParam = url.searchParams.get('lat')
    const lonParam = url.searchParams.get('lon')
    const radiusParam = url.searchParams.get('radius')

    // パラメータの存在チェック（Requirements 6.6）
    if (latParam === null || lonParam === null || radiusParam === null) {
      return HttpResponse.json(
        {
          error: {
            code: 'VALIDATION_ERROR',
            message: 'lat、lon、radius クエリパラメータは必須です',
            fields: [
              ...(latParam === null ? ['lat'] : []),
              ...(lonParam === null ? ['lon'] : []),
              ...(radiusParam === null ? ['radius'] : []),
            ],
          },
        },
        { status: 400 },
      )
    }

    const lat = parseFloat(latParam)
    const lon = parseFloat(lonParam)
    const radius = parseFloat(radiusParam)

    // 値の有効範囲チェック（Requirements 6.6）
    const invalidFields: string[] = []
    if (isNaN(lat) || lat < -90 || lat > 90) invalidFields.push('lat')
    if (isNaN(lon) || lon < -180 || lon > 180) invalidFields.push('lon')
    if (isNaN(radius) || radius < 1 || radius > 50000) invalidFields.push('radius')

    if (invalidFields.length > 0) {
      return HttpResponse.json(
        {
          error: {
            code: 'VALIDATION_ERROR',
            message:
              '緯度は-90〜90、経度は-180〜180、半径は1〜50000m の範囲で指定してください',
            fields: invalidFields,
          },
        },
        { status: 400 },
      )
    }

    // Haversine 距離計算でスポットをフィルタリング（Requirements 6.1）
    const spotsWithDistance = mockSpots
      .map((spot) => ({
        spot,
        distance: haversine(lat, lon, spot.lat, spot.lon),
      }))
      .filter(({ distance }) => distance <= radius)

    // 距離近い順にソート → 最大50件（Requirements 6.5）
    spotsWithDistance.sort((a, b) => a.distance - b.distance)
    const results = spotsWithDistance.slice(0, 50).map(({ spot }) => spot)

    return HttpResponse.json({
      spots: results,
      total: results.length,
    })
  }),
]
