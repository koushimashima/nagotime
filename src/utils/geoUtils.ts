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
