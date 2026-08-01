// src/utils/validators.ts
// Pure validation functions for NagoTime review submission
// Requirements: 1.2, 1.3, 1.7, 1.8, 1.9, 1.10, 4.9, 6.6

/**
 * Validates that a review text is between 50 and 1000 characters (inclusive).
 *
 * Requirement 1.2: text must be 50 ≤ length ≤ 1000.
 * Requirement 1.8: reject otherwise.
 *
 * @param text - The review text to validate
 * @returns `true` if the length is within the valid range, `false` otherwise
 */
export function validateTextLength(text: string): boolean {
  const len = text.length
  return len >= 50 && len <= 1000
}

/**
 * Validates that the number of attached photos is between 1 and 5 (inclusive).
 *
 * Requirement 1.3: 1 ≤ count ≤ 5.
 * Requirement 1.9: reject otherwise.
 *
 * @param count - The number of photos attached to the review
 * @returns `true` if the count is within the valid range, `false` otherwise
 */
export function validatePhotoCount(count: number): boolean {
  return count >= 1 && count <= 5
}

/**
 * Validates that a latitude/longitude pair is within the valid geographic range.
 *
 * Requirement 1.7 / 6.6 / 4.9:
 *   - Latitude:  -90.0 ≤ lat ≤ 90.0
 *   - Longitude: -180.0 ≤ lon ≤ 180.0
 *
 * @param lat - Latitude in decimal degrees
 * @param lon - Longitude in decimal degrees
 * @returns `true` if both values are within range, `false` otherwise
 */
export function validateCoordinates(lat: number, lon: number): boolean {
  return lat >= -90 && lat <= 90 && lon >= -180 && lon <= 180
}

/**
 * Validates that a spot name is between 1 and 100 characters (inclusive).
 *
 * Requirement 1.7: spot name must be 1 ≤ length ≤ 100.
 * Requirement 1.10: reject and report field name if invalid.
 *
 * @param name - The spot name to validate
 * @returns `true` if the length is within the valid range, `false` otherwise
 */
export function validateSpotName(name: string): boolean {
  const len = name.length
  return len >= 1 && len <= 100
}
