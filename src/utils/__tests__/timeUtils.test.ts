// src/utils/__tests__/timeUtils.test.ts
// Example-based unit tests for time utility functions in timeUtils.ts
// Requirements: 1.4, 1.6
//
// 実装の時間帯定義:
//   MORNING  : 5〜9時  (hour 5–9)
//   AFTERNOON: 10〜16時 (hour 10–16)
//   EVENING  : 17〜20時 (hour 17–20)
//   NIGHT    : 21〜4時  (hour 21–23, 0–4)

import { describe, it, expect } from 'vitest'
import { getTimeSlot, getDayType } from '../timeUtils'

// ---------------------------------------------------------------------------
// Helper: create a Date with a specific hour (local time)
// ---------------------------------------------------------------------------
function dateAtHour(hour: number): Date {
  const d = new Date()
  d.setHours(hour, 0, 0, 0)
  return d
}

// ---------------------------------------------------------------------------
// Helper: create a Date for a specific weekday (0=Sun … 6=Sat)
// ---------------------------------------------------------------------------
function dateOnWeekday(targetDay: number): Date {
  const d = new Date()
  const diff = targetDay - d.getDay()
  d.setDate(d.getDate() + diff)
  return d
}

// ---------------------------------------------------------------------------
// getTimeSlot
// ---------------------------------------------------------------------------
describe('getTimeSlot', () => {
  // ---- 各時間帯の代表値 ----
  it('7時 → MORNING', () => {
    expect(getTimeSlot(dateAtHour(7))).toBe('MORNING')
  })

  it('13時 → AFTERNOON', () => {
    expect(getTimeSlot(dateAtHour(13))).toBe('AFTERNOON')
  })

  it('19時 → EVENING', () => {
    expect(getTimeSlot(dateAtHour(19))).toBe('EVENING')
  })

  it('23時 → NIGHT', () => {
    expect(getTimeSlot(dateAtHour(23))).toBe('NIGHT')
  })

  it('3時 → NIGHT（深夜）', () => {
    expect(getTimeSlot(dateAtHour(3))).toBe('NIGHT')
  })

  // ---- 各時間帯の境界値（下限） ----
  it('5時 → MORNING（下限境界）', () => {
    expect(getTimeSlot(dateAtHour(5))).toBe('MORNING')
  })

  it('10時 → AFTERNOON（下限境界）', () => {
    expect(getTimeSlot(dateAtHour(10))).toBe('AFTERNOON')
  })

  it('17時 → EVENING（下限境界）', () => {
    expect(getTimeSlot(dateAtHour(17))).toBe('EVENING')
  })

  it('21時 → NIGHT（下限境界）', () => {
    expect(getTimeSlot(dateAtHour(21))).toBe('NIGHT')
  })

  // ---- 各時間帯の境界値（上限） ----
  it('9時 → MORNING（上限境界）', () => {
    expect(getTimeSlot(dateAtHour(9))).toBe('MORNING')
  })

  it('16時 → AFTERNOON（上限境界）', () => {
    expect(getTimeSlot(dateAtHour(16))).toBe('AFTERNOON')
  })

  it('20時 → EVENING（上限境界）', () => {
    expect(getTimeSlot(dateAtHour(20))).toBe('EVENING')
  })

  it('0時 → NIGHT（深夜0時）', () => {
    expect(getTimeSlot(dateAtHour(0))).toBe('NIGHT')
  })

  it('4時 → NIGHT（上限境界）', () => {
    expect(getTimeSlot(dateAtHour(4))).toBe('NIGHT')
  })
})

// ---------------------------------------------------------------------------
// getDayType
// ---------------------------------------------------------------------------
describe('getDayType', () => {
  it('月曜日 → WEEKDAY', () => {
    expect(getDayType(dateOnWeekday(1))).toBe('WEEKDAY')
  })

  it('火曜日 → WEEKDAY', () => {
    expect(getDayType(dateOnWeekday(2))).toBe('WEEKDAY')
  })

  it('水曜日 → WEEKDAY', () => {
    expect(getDayType(dateOnWeekday(3))).toBe('WEEKDAY')
  })

  it('木曜日 → WEEKDAY', () => {
    expect(getDayType(dateOnWeekday(4))).toBe('WEEKDAY')
  })

  it('金曜日 → WEEKDAY', () => {
    expect(getDayType(dateOnWeekday(5))).toBe('WEEKDAY')
  })

  it('土曜日 → HOLIDAY', () => {
    expect(getDayType(dateOnWeekday(6))).toBe('HOLIDAY')
  })

  it('日曜日 → HOLIDAY', () => {
    expect(getDayType(dateOnWeekday(0))).toBe('HOLIDAY')
  })

  it('特定の月曜日（2025-01-06） → WEEKDAY', () => {
    expect(getDayType(new Date('2025-01-06T10:00:00'))).toBe('WEEKDAY')
  })

  it('特定の土曜日（2025-01-04） → HOLIDAY', () => {
    expect(getDayType(new Date('2025-01-04T10:00:00'))).toBe('HOLIDAY')
  })

  it('特定の日曜日（2025-01-05） → HOLIDAY', () => {
    expect(getDayType(new Date('2025-01-05T10:00:00'))).toBe('HOLIDAY')
  })
})
