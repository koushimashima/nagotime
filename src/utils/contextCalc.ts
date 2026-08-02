// src/utils/contextCalc.ts

import type { TimeSlot, DayType } from '../mocks/data/types'

/**
 * 時刻（0〜23）からタイムスロットを返す
 *
 * 変換ルール（Requirements 1.4）:
 *   5〜9  → MORNING
 *   10〜16 → AFTERNOON
 *   17〜20 → EVENING
 *   0〜4 または 21〜23 → NIGHT
 */
export function calcTimeSlot(hour: number): TimeSlot {
  if (hour >= 5 && hour <= 9) return 'MORNING'
  if (hour >= 10 && hour <= 16) return 'AFTERNOON'
  if (hour >= 17 && hour <= 20) return 'EVENING'
  return 'NIGHT'
}

/**
 * 曜日番号（0〜6）から曜日種別を返す
 *
 * 変換ルール（Requirements 1.5）:
 *   0（日曜）または 6（土曜） → HOLIDAY
 *   1〜5（月〜金）           → WEEKDAY
 */
export function calcDayType(day: number): DayType {
  if (day === 0 || day === 6) return 'HOLIDAY'
  return 'WEEKDAY'
}
