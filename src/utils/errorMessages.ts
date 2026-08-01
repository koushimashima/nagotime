// src/utils/errorMessages.ts
// Error message constants for validation failures
// Requirements: 1.8, 1.9, 1.10, 1.12, 4.9, 6.6

// ─── Task-specified constant names (Requirements: 1.8, 1.9, 1.10) ───────────

/**
 * Error message for text length validation failure.
 * Used when review text is shorter than 50 chars or longer than 1000 chars.
 * Requirement 1.8
 */
export const TEXT_LENGTH_ERROR =
  '口コミテキストは50文字以上1000文字以内で入力してください'

/**
 * Error message for photo count validation failure.
 * Used when the number of attached photos is 0 or more than 5.
 * Requirement 1.9
 */
export const PHOTO_COUNT_ERROR =
  '写真は1枚以上5枚以内でアップロードしてください'

/**
 * Error message for coordinate range validation failure.
 * Used when lat/lon values are out of valid geographic range.
 * Requirements 1.7, 1.10, 4.9, 6.6
 */
export const COORDINATES_ERROR = '無効な座標です'

/**
 * Error message for spot name validation failure.
 * Used when spot name is empty or longer than 100 chars.
 * Requirement 1.10
 */
export const SPOT_NAME_ERROR =
  'スポット名は1文字以上100文字以内で入力してください'

// ─── Aliases kept for backward compatibility ─────────────────────────────────

/** @deprecated Use TEXT_LENGTH_ERROR instead */
export const ERROR_TEXT_LENGTH = TEXT_LENGTH_ERROR

/** @deprecated Use PHOTO_COUNT_ERROR instead */
export const ERROR_PHOTO_COUNT = PHOTO_COUNT_ERROR

/** @deprecated Use SPOT_NAME_ERROR instead */
export const ERROR_SPOT_NAME = SPOT_NAME_ERROR

/** @deprecated Use COORDINATES_ERROR instead */
export const ERROR_COORDINATES = COORDINATES_ERROR

// ─── Additional messages ──────────────────────────────────────────────────────

/**
 * Error message for missing location (coordinates not available).
 * Used when the user's geolocation could not be obtained.
 * Requirement 1.12
 */
export const ERROR_LOCATION_MISSING =
  '位置情報を有効にして投稿してください'

/**
 * Consolidated error message constants as a single object.
 * Requirements: 1.8, 1.9, 1.10, 1.12, 4.9, 6.6
 */
export const ERROR_MESSAGES = {
  TEXT_LENGTH: TEXT_LENGTH_ERROR,
  PHOTO_COUNT: PHOTO_COUNT_ERROR,
  SPOT_NAME: SPOT_NAME_ERROR,
  COORDINATES: COORDINATES_ERROR,
  LOCATION_REQUIRED: ERROR_LOCATION_MISSING,
} as const

/**
 * Returns an error message that lists invalid/missing field names.
 * Used when spotName or coordinates are absent or out of valid range.
 * Requirement 1.10
 *
 * @param fields - Array of field names that failed validation
 * @returns Localised error string listing the field names
 */
export function errorInvalidFields(fields: string[]): string {
  return `次のフィールドが無効または欠落しています: ${fields.join(', ')}`
}
