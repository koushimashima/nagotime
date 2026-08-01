// src/utils/__tests__/timeUtils.pbt.test.ts
// Property-based tests for time utility functions in timeUtils.ts
// Feature: nago-time-demo

import * as fc from 'fast-check'
import { describe, it } from 'vitest'
import { getTimeSlot, getDayType } from '../timeUtils'

describe('timeUtils PBT', () => {
  // Feature: nago-time-demo, Property 4: 時間帯判定の完全性と正確性
  it('Property 4: getTimeSlot returns the correct TimeSlot for any Date', () => {
    // Validates: Requirements 1.5, 1.6
    fc.assert(
      fc.property(fc.date(), (date) => {
        const result = getTimeSlot(date)
        const hour = date.getHours()

        // Must be one of the valid TimeSlot values
        const validSlots = ['MORNING', 'AFTERNOON', 'EVENING', 'NIGHT']
        if (!validSlots.includes(result)) return false

        // The returned value must match the correct time bracket
        if (hour >= 5 && hour <= 9) return result === 'MORNING'
        if (hour >= 10 && hour <= 16) return result === 'AFTERNOON'
        if (hour >= 17 && hour <= 20) return result === 'EVENING'
        // hour >= 21 || hour <= 4
        return result === 'NIGHT'
      }),
      { numRuns: 100 }
    )
  })

  // Feature: nago-time-demo, Property 5: 平日/休日判定の完全性
  it('Property 5: getDayType returns either WEEKDAY or HOLIDAY for any Date, never null or error', () => {
    // Validates: Requirements 1.4
    fc.assert(
      fc.property(fc.date(), (date) => {
        const result = getDayType(date)

        // Must be one of the two valid DayType values
        if (result !== 'WEEKDAY' && result !== 'HOLIDAY') return false

        // HOLIDAY for Saturday (day=6) or Sunday (day=0), WEEKDAY otherwise
        const day = date.getDay()
        if (day === 0 || day === 6) return result === 'HOLIDAY'
        return result === 'WEEKDAY'
      }),
      { numRuns: 100 }
    )
  })
})
