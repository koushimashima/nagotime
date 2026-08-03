// src/utils/geoUtils.ts
// Geo utility functions for NagoTime
// Requirements: 6.1, 6.5

import type { Spot } from '../mocks/data/types'

const EARTH_RADIUS_M = 6371000

/**
 * Haversine formula: calculate the great-circle distance between two points on Earth.
 * @param lat1 - Latitude of point 1 (degrees)
 * @param lon1 - Longitude of point 1 (degrees)
 * @param lat2 - Latitude of point 2 (degrees)
 * @param lon2 - Longitude of point 2 (degrees)
 * @returns Distance in meters
 */
export function haversine(
  lat1: number,
  lon1: number,
  lat2: number,
  lon2: number,
): number {
  const R = EARTH_RADIUS_M
  const φ1 = (lat1 * Math.PI) / 180
  const φ2 = (lat2 * Math.PI) / 180
  const Δφ = ((lat2 - lat1) * Math.PI) / 180
  const Δλ = ((lon2 - lon1) * Math.PI) / 180
  const a =
    Math.sin(Δφ / 2) ** 2 + Math.cos(φ1) * Math.cos(φ2) * Math.sin(Δλ / 2) ** 2
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a))
  return R * c
}

/**
 * Filter spots to only those within a given radius from a center point.
 * Requirement 6.1: return spots where haversine distance <= radiusM
 * @param spots - Array of spots to filter
 * @param centerLat - Center latitude (degrees)
 * @param centerLon - Center longitude (degrees)
 * @param radiusM - Search radius in meters
 * @returns Spots within the specified radius
 */
export function filterSpotsByRadius(
  spots: Spot[],
  centerLat: number,
  centerLon: number,
  radiusM: number,
): Spot[] {
  return spots.filter(
    (spot) => haversine(centerLat, centerLon, spot.lat, spot.lon) <= radiusM,
  )
}

/**
 * Sort spots by ascending distance from a center point.
 * Does not mutate the original array.
 * @param spots - Array of spots to sort
 * @param centerLat - Center latitude (degrees)
 * @param centerLon - Center longitude (degrees)
 * @returns New array of spots sorted by distance (nearest first)
 */
export function sortByDistance(
  spots: Spot[],
  centerLat: number,
  centerLon: number,
): Spot[] {
  return [...spots].sort(
    (a, b) =>
      haversine(centerLat, centerLon, a.lat, a.lon) -
      haversine(centerLat, centerLon, b.lat, b.lon),
  )
}

// ---- エリア名と座標のマッピング ----

interface AreaLocation {
  name: string
  lat: number
  lon: number
}

/**
 * 名古屋市内の主要エリアと代表座標のマッピング。
 * 座標は Wikipedia の各地下鉄駅記事から取得した実測値を使用。
 *
 * 出典: Wikipedia - Nagoya Municipal Subway stations
 * https://en.wikipedia.org/wiki/List_of_Nagoya_Municipal_Subway_stations
 * （各駅個別ページの地理座標）
 */
const AREA_LOCATIONS: AreaLocation[] = [
  // 栄駅 H10/M05 — 35°10′12″N 136°54′29″E
  { name: '栄',       lat: 35.1700, lon: 136.9082 },
  // 名古屋駅 H08/S02 — 35°10′14.78″N 136°52′53.77″E
  { name: '名古屋駅', lat: 35.1708, lon: 136.8816 },
  // 大須観音駅 T08 周辺エリア（大須商店街中心部）
  { name: '大須',     lat: 35.1601, lon: 136.8997 },
  // 今池駅 H13/S08 — 35°10′12″N 136°56′13″E
  { name: '今池',     lat: 35.1699, lon: 136.9370 },
  // 覚王山駅 H15 — 35°10′00″N 136°57′13″E
  { name: '覚王山',   lat: 35.1666, lon: 136.9535 },
  // 矢場町駅 M04 — 35°09′50″N 136°54′33″E
  { name: '矢場町',   lat: 35.1640, lon: 136.9092 },
  // 鶴舞駅 T10 — 35°09′23″N 136°55′03″E
  { name: '鶴舞',     lat: 35.1564, lon: 136.9175 },
  // 千種駅 H12 周辺エリア
  { name: '千種',     lat: 35.1695, lon: 136.9317 },
  // 伏見駅 H09/T07 — 35°10′09″N 136°53′53″E
  { name: '伏見',     lat: 35.1692, lon: 136.8980 },
  // 金山駅 M01/E01 — 35°08′36″N 136°54′03″E
  { name: '金山',     lat: 35.1433, lon: 136.9010 },
  // 名城公園駅 M08 周辺エリア
  { name: '名城公園', lat: 35.1891, lon: 136.8986 },
  // 白壁エリア（徳川美術館・主税町周辺）
  { name: '白壁',     lat: 35.1805, lon: 136.9215 },
  // 円頓寺エリア（国際センター駅 S03 周辺商店街）
  { name: '円頓寺',   lat: 35.1764, lon: 136.8920 },
  // 丸の内駅 T06/S04 — 35°10′24″N 136°53′49″E
  { name: '丸の内',   lat: 35.1733, lon: 136.8970 },
  // 亀島駅 H07 周辺エリア（名古屋駅の1駅西）
  { name: '亀島',     lat: 35.1760, lon: 136.8795 },
  // 国際センター駅 S03 — 35°10′20″N 136°53′22″E
  { name: '国際センター', lat: 35.1721, lon: 136.8894 },
  // 八事駅 T15/M20 — 35°08′12″N 136°57′50″E
  { name: '八事',     lat: 35.1367, lon: 136.9640 },
  // 星ヶ丘駅 H18 — 35°09′44″N 136°59′06″E
  { name: '星ヶ丘',   lat: 35.1622, lon: 136.9850 },
  // 大曽根駅 M12 — 35°11′30″N 136°56′13″E
  { name: '大曽根',   lat: 35.1916, lon: 136.9369 },
  // 本山駅 H16/M17 — 35°09′50″N 136°57′50″E
  { name: '本山',     lat: 35.1639, lon: 136.9640 },
  // 浅間町駅 T05 周辺エリア（浄心T04 と丸の内T06 の中間）
  { name: '浅間町',   lat: 35.1832, lon: 136.8893 },
  // 塩釜口駅 T16 — 35.1326°N 136.9775°E
  { name: '塩釜口',   lat: 35.1326, lon: 136.9775 },
  // 浄心駅 T04 周辺エリア（浅間町T05 と庄内通T03 の中間）
  { name: '浄心',     lat: 35.1793, lon: 136.8880 },
  // 久屋大通駅 M06/S05 — 35°10′25″N 136°54′29″E
  { name: '久屋大通', lat: 35.1735, lon: 136.9081 },
]

/**
 * 与えられた座標（lat, lon）に最も近いエリア名を返す。
 * Haversine 距離で最近傍のエリアを探索する。
 *
 * @param lat - 緯度（度）
 * @param lon - 経度（度）
 * @returns 最も近いエリアの名前（例: '栄', '名古屋駅', '大須'）
 */
export function resolveArea(lat: number, lon: number): string {
  let closestArea = AREA_LOCATIONS[0]
  let minDistance = haversine(lat, lon, closestArea.lat, closestArea.lon)

  for (const area of AREA_LOCATIONS) {
    const distance = haversine(lat, lon, area.lat, area.lon)
    if (distance < minDistance) {
      minDistance = distance
      closestArea = area
    }
  }

  return closestArea.name
}
