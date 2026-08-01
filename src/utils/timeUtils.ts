// src/utils/timeUtils.ts

import type { TimeSlot, DayType } from '../mocks/data/types'

/**
 * 指定した日時から時間帯を判定して返す。
 *
 * - MORNING  : 5〜9時  (hour 5, 6, 7, 8, 9)
 * - AFTERNOON: 10〜16時 (hour 10, 11, ..., 16)
 * - EVENING  : 17〜20時 (hour 17, 18, 19, 20)
 * - NIGHT    : 21〜4時  (hour 21, 22, 23, 0, 1, 2, 3, 4)
 *
 * Validates: Requirements 1.6
 */
export function getTimeSlot(date: Date): TimeSlot {
  const hour = date.getHours()

  if (hour >= 5 && hour <= 9) {
    return 'MORNING'
  }
  if (hour >= 10 && hour <= 16) {
    return 'AFTERNOON'
  }
  if (hour >= 17 && hour <= 20) {
    return 'EVENING'
  }
  // hour >= 21 || hour <= 4
  return 'NIGHT'
}

/**
 * 指定した日付が平日か休日（土日）かを判定して返す。
 *
 * - HOLIDAY : 土曜日（getDay() === 6）または日曜日（getDay() === 0）
 * - WEEKDAY : それ以外（月〜金）
 *
 * Validates: Requirements 1.4
 */
export function getDayType(date: Date): DayType {
  const day = date.getDay()
  if (day === 0 || day === 6) {
    return 'HOLIDAY'
  }
  return 'WEEKDAY'
}
