// src/contexts/RecommendContext.test.tsx
// コンテキスト対応フィード・マップ連携 — RecommendContext プロパティテスト & ユニットテスト

import { describe, it, expect, vi, afterEach } from 'vitest'
import { renderHook, act } from '@testing-library/react'
import * as fc from 'fast-check'
import type { ReactNode } from 'react'
import { RecommendProvider, useRecommendContext } from './RecommendContext'
import type { TimeSlot, DayType } from '../mocks/data/types'

// ---- ラッパー ----

function wrapper({ children }: { children: ReactNode }) {
  return <RecommendProvider>{children}</RecommendProvider>
}

// ---- Geolocation モックヘルパー ----

function mockGeolocationSuccess(lat: number, lon: number) {
  vi.stubGlobal('navigator', {
    geolocation: {
      getCurrentPosition: vi.fn((successCb: PositionCallback) => {
        successCb({
          coords: {
            latitude: lat,
            longitude: lon,
            accuracy: 10,
            altitude: null,
            altitudeAccuracy: null,
            heading: null,
            speed: null,
          },
          timestamp: Date.now(),
        } as GeolocationPosition)
      }),
    },
  })
}

function mockGeolocationError(code: number) {
  vi.stubGlobal('navigator', {
    geolocation: {
      getCurrentPosition: vi.fn(
        (_successCb: PositionCallback, errorCb?: PositionErrorCallback) => {
          errorCb?.({
            code,
            message: `Geolocation error code ${code}`,
            PERMISSION_DENIED: 1,
            POSITION_UNAVAILABLE: 2,
            TIMEOUT: 3,
          } as GeolocationPositionError)
        }
      ),
    },
  })
}

afterEach(() => {
  vi.restoreAllMocks()
})

// ============================================================
// ユニットテスト
// ============================================================

describe('RecommendContext — ユニットテスト', () => {
  it('初期 weather が SUNNY であること', () => {
    mockGeolocationSuccess(35.1815, 136.9066)

    const { result } = renderHook(() => useRecommendContext(), { wrapper })

    // weather は同期的に設定される定数値
    expect(result.current.weather).toBe('SUNNY')
  })

  it('ロード完了後に locating が false になること（成功ケース）', () => {
    // Geolocation の成功コールバックは同期的に呼ばれるようモック済み
    mockGeolocationSuccess(35.0, 136.0)

    const { result } = renderHook(() => useRecommendContext(), { wrapper })

    // act() 内で useEffect が flush される
    act(() => {})

    expect(result.current.locating).toBe(false)
  })

  it('ロード完了後に locating が false になること（失敗ケース）', () => {
    // Geolocation のエラーコールバックは同期的に呼ばれるようモック済み
    mockGeolocationError(1)

    const { result } = renderHook(() => useRecommendContext(), { wrapper })

    act(() => {})

    expect(result.current.locating).toBe(false)
  })
})

// ============================================================
// Feature: context-aware-feed-map, Property 3: 位置取得失敗時のデフォルトフォールバック
// ============================================================

describe('RecommendContext — Property 3: 位置取得失敗時のデフォルトフォールバック', () => {
  // Validates: Requirements 1.3
  it('Property 3: 任意の Geolocation エラーコードで coord がデフォルト座標になること', () => {
    fc.assert(
      fc.property(fc.integer({ min: 0, max: 3 }), (errorCode) => {
        // 各イテレーションで独立したモックをセットアップ
        mockGeolocationError(errorCode)

        const { result, unmount } = renderHook(() => useRecommendContext(), { wrapper })

        // Geolocation エラーコールバックは同期的に呼ばれるため act で state を flush
        act(() => {})

        const coordLat = result.current.coord.lat
        const coordLon = result.current.coord.lon

        unmount()
        vi.restoreAllMocks()

        // デフォルト座標（栄: 35.1815, 136.9066）に等しいことを検証
        return (
          Math.abs(coordLat - 35.1815) < 0.0001 &&
          Math.abs(coordLon - 136.9066) < 0.0001
        )
      }),
      { numRuns: 4 }
    )
  })
})

// ============================================================
// Feature: context-aware-feed-map, Property 4: フィルタリセットの冪等性
// ============================================================

describe('RecommendContext — Property 4: フィルタリセットの冪等性', () => {
  // Validates: Requirements 3.5, 2.5
  it('Property 4: 任意のフィルタ変更後にリセットすると Context の自動取得値に戻ること', () => {
    mockGeolocationSuccess(35.1815, 136.9066)

    fc.assert(
      fc.property(
        fc.constantFrom<TimeSlot>('MORNING', 'AFTERNOON', 'EVENING', 'NIGHT'),
        fc.constantFrom<DayType>('WEEKDAY', 'HOLIDAY'),
        (newTimeSlot, newDayType) => {
          const { result, unmount } = renderHook(() => useRecommendContext(), { wrapper })

          // Context の自動取得値（変更不可）を記録
          const originalTimeSlot = result.current.timeSlot
          const originalDayType = result.current.dayType

          // フィルタを任意の値に変更
          act(() => {
            result.current.setFilterTimeSlot(newTimeSlot)
            result.current.setFilterDayType(newDayType)
          })

          // リセットを実行
          act(() => {
            result.current.resetFilters()
          })

          // リセット後の値を取得
          const filterTimeSlotAfterReset = result.current.filterTimeSlot
          const filterDayTypeAfterReset = result.current.filterDayType
          const isModifiedAfterReset = result.current.isFilterModified

          unmount()

          // 検証: filterTimeSlot === timeSlot, filterDayType === dayType, isFilterModified === false
          return (
            filterTimeSlotAfterReset === originalTimeSlot &&
            filterDayTypeAfterReset === originalDayType &&
            isModifiedAfterReset === false
          )
        }
      )
    )
  })
})
