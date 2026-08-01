// src/utils/__tests__/validators.test.ts
// Example-based unit tests for validation functions in validators.ts
// Requirements: 1.2, 1.3, 1.7

import { describe, it, expect } from 'vitest'
import {
  validateTextLength,
  validatePhotoCount,
  validateCoordinates,
  validateSpotName,
} from '../validators'

// ---------------------------------------------------------------------------
// validateTextLength — 50〜1000文字
// ---------------------------------------------------------------------------
describe('validateTextLength', () => {
  it('49文字はNG（下限未満）', () => {
    expect(validateTextLength('a'.repeat(49))).toBe(false)
  })

  it('50文字はOK（下限）', () => {
    expect(validateTextLength('a'.repeat(50))).toBe(true)
  })

  it('1000文字はOK（上限）', () => {
    expect(validateTextLength('a'.repeat(1000))).toBe(true)
  })

  it('1001文字はNG（上限超過）', () => {
    expect(validateTextLength('a'.repeat(1001))).toBe(false)
  })

  it('0文字はNG', () => {
    expect(validateTextLength('')).toBe(false)
  })

  it('500文字はOK（中間値）', () => {
    expect(validateTextLength('あ'.repeat(500))).toBe(true)
  })

  it('マルチバイト文字も文字数でカウントされる', () => {
    // 50個の日本語文字 → OK
    expect(validateTextLength('あ'.repeat(50))).toBe(true)
    // 49個 → NG
    expect(validateTextLength('あ'.repeat(49))).toBe(false)
  })
})

// ---------------------------------------------------------------------------
// validatePhotoCount — 1〜5枚
// ---------------------------------------------------------------------------
describe('validatePhotoCount', () => {
  it('0枚はNG（下限未満）', () => {
    expect(validatePhotoCount(0)).toBe(false)
  })

  it('1枚はOK（下限）', () => {
    expect(validatePhotoCount(1)).toBe(true)
  })

  it('5枚はOK（上限）', () => {
    expect(validatePhotoCount(5)).toBe(true)
  })

  it('6枚はNG（上限超過）', () => {
    expect(validatePhotoCount(6)).toBe(false)
  })

  it('3枚はOK（中間値）', () => {
    expect(validatePhotoCount(3)).toBe(true)
  })

  it('負の枚数はNG', () => {
    expect(validatePhotoCount(-1)).toBe(false)
  })

  it('2枚はOK', () => {
    expect(validatePhotoCount(2)).toBe(true)
  })

  it('4枚はOK', () => {
    expect(validatePhotoCount(4)).toBe(true)
  })
})

// ---------------------------------------------------------------------------
// validateCoordinates — 緯度-90〜90、経度-180〜180
// ---------------------------------------------------------------------------
describe('validateCoordinates', () => {
  it('有効な中心付近の座標はOK', () => {
    expect(validateCoordinates(0, 0)).toBe(true)
  })

  it('名古屋市の座標はOK', () => {
    expect(validateCoordinates(35.1706, 136.8816)).toBe(true)
  })

  it('緯度-90はOK（下限）', () => {
    expect(validateCoordinates(-90, 0)).toBe(true)
  })

  it('緯度90はOK（上限）', () => {
    expect(validateCoordinates(90, 0)).toBe(true)
  })

  it('緯度-90.1はNG（下限未満）', () => {
    expect(validateCoordinates(-90.1, 0)).toBe(false)
  })

  it('緯度90.1はNG（上限超過）', () => {
    expect(validateCoordinates(90.1, 0)).toBe(false)
  })

  it('経度-180はOK（下限）', () => {
    expect(validateCoordinates(0, -180)).toBe(true)
  })

  it('経度180はOK（上限）', () => {
    expect(validateCoordinates(0, 180)).toBe(true)
  })

  it('経度-180.1はNG（下限未満）', () => {
    expect(validateCoordinates(0, -180.1)).toBe(false)
  })

  it('経度180.1はNG（上限超過）', () => {
    expect(validateCoordinates(0, 180.1)).toBe(false)
  })

  it('緯度・経度ともに境界値上限はOK', () => {
    expect(validateCoordinates(90, 180)).toBe(true)
  })

  it('緯度・経度ともに境界値下限はOK', () => {
    expect(validateCoordinates(-90, -180)).toBe(true)
  })
})

// ---------------------------------------------------------------------------
// validateSpotName — 1〜100文字
// ---------------------------------------------------------------------------
describe('validateSpotName', () => {
  it('0文字はNG（空文字）', () => {
    expect(validateSpotName('')).toBe(false)
  })

  it('1文字はOK（下限）', () => {
    expect(validateSpotName('a')).toBe(true)
  })

  it('100文字はOK（上限）', () => {
    expect(validateSpotName('a'.repeat(100))).toBe(true)
  })

  it('101文字はNG（上限超過）', () => {
    expect(validateSpotName('a'.repeat(101))).toBe(false)
  })

  it('50文字はOK（中間値）', () => {
    expect(validateSpotName('栄'.repeat(50))).toBe(true)
  })

  it('実在スポット名はOK', () => {
    expect(validateSpotName('名古屋城')).toBe(true)
    expect(validateSpotName('栄ミナミ商店街')).toBe(true)
  })
})
