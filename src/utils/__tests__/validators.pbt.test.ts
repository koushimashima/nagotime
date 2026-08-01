// src/utils/__tests__/validators.pbt.test.ts
// Property-based tests for validation functions in validators.ts
// Feature: nago-time-demo

import * as fc from 'fast-check'
import { describe, it } from 'vitest'
import { validateTextLength, validatePhotoCount, validateCoordinates } from '../validators'

describe('validators PBT', () => {
  // Feature: nago-time-demo, Property 1: テキスト長バリデーションの境界正確性
  it('Property 1: validateTextLength returns true iff length is between 50 and 1000 inclusive', () => {
    // Validates: Requirements 1.2, 1.8
    fc.assert(
      fc.property(fc.string(), (text) => {
        const result = validateTextLength(text)
        const len = text.length
        const expected = len >= 50 && len <= 1000
        return result === expected
      }),
      { numRuns: 100 }
    )
  })

  // Feature: nago-time-demo, Property 2: 写真枚数バリデーションの境界正確性
  it('Property 2: validatePhotoCount returns true iff count is between 1 and 5 inclusive', () => {
    // Validates: Requirements 1.3, 1.9
    fc.assert(
      fc.property(fc.integer({ min: -100, max: 100 }), (count) => {
        const result = validatePhotoCount(count)
        const expected = count >= 1 && count <= 5
        return result === expected
      }),
      { numRuns: 100 }
    )
  })

  // Feature: nago-time-demo, Property 3: 座標バリデーションの境界正確性
  it('Property 3: validateCoordinates returns true iff lat in [-90,90] and lon in [-180,180]', () => {
    // Validates: Requirements 1.7, 1.10, 4.9, 6.6
    fc.assert(
      fc.property(fc.double(), fc.double(), (lat, lon) => {
        const result = validateCoordinates(lat, lon)
        const expected =
          lat >= -90 && lat <= 90 && lon >= -180 && lon <= 180
        return result === expected
      }),
      { numRuns: 100 }
    )
  })
})
