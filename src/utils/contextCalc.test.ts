import { describe, it } from 'vitest'
import * as fc from 'fast-check'
import { calcTimeSlot, calcDayType } from './contextCalc'

describe('contextCalc', () => {
  // Feature: context-aware-feed-map, Property 1: 時間帯変換の網羅性
  it('Property 1: calcTimeSlot は全時刻で正しい時間帯を返す', () => {
    fc.assert(
      fc.property(fc.integer({ min: 0, max: 23 }), (hour) => {
        const result = calcTimeSlot(hour)
        if (hour >= 5 && hour <= 9) return result === 'MORNING'
        if (hour >= 10 && hour <= 16) return result === 'AFTERNOON'
        if (hour >= 17 && hour <= 20) return result === 'EVENING'
        return result === 'NIGHT'
      })
    )
  })

  // Feature: context-aware-feed-map, Property 2: 曜日種別変換の網羅性
  it('Property 2: calcDayType は全曜日で正しい曜日種別を返す', () => {
    fc.assert(
      fc.property(fc.integer({ min: 0, max: 6 }), (day) => {
        const result = calcDayType(day)
        if (day === 0 || day === 6) return result === 'HOLIDAY'
        return result === 'WEEKDAY'
      })
    )
  })
})
