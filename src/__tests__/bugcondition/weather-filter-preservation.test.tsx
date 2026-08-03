// src/__tests__/bugcondition/weather-filter-preservation.test.tsx
// Feature: weather-filter-button-fix — Preservation Property Tests (Task 2)
//
// このテストは修正前コードで全て PASS することが期待される。
// 既存の動作（時間帯・曜日種別チップ、ローディング/エラー表示、
// リセットボタン、weather 固定値）がバグ修正後も変わらないことを検証するベースライン。
//
// Validates: Requirements 3.1, 3.2, 3.3, 3.4, 3.5, 3.6

import { describe, it, expect, vi, afterEach } from 'vitest'
import { renderHook, render, screen, fireEvent, act } from '@testing-library/react'
import * as fc from 'fast-check'
import type { ReactNode } from 'react'
import { RecommendProvider, useRecommendContext } from '../../contexts/RecommendContext'
import { ContextFilterBar } from '../../components/ContextFilterBar'
import type { TimeSlot, DayType, Weather } from '../../mocks/data/types'

// ============================================================
// セットアップヘルパー
// ============================================================

function mockGeolocationSuccess() {
  vi.stubGlobal('navigator', {
    geolocation: {
      getCurrentPosition: vi.fn((successCb: PositionCallback) => {
        successCb({
          coords: {
            latitude: 35.1815,
            longitude: 136.9066,
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

// 実 RecommendProvider を使う renderHook 用ラッパー
function realProviderWrapper({ children }: { children: ReactNode }) {
  return <RecommendProvider>{children}</RecommendProvider>
}

// モック用コンテキスト値ファクトリ
function makeContextValue(overrides: Partial<Record<string, unknown>> = {}) {
  return {
    coord: { lat: 35.1815, lon: 136.9066 },
    weather: 'SUNNY' as const,
    timeSlot: 'AFTERNOON' as TimeSlot,
    dayType: 'WEEKDAY' as DayType,
    filterTimeSlot: 'AFTERNOON' as TimeSlot | null,
    filterDayType: 'WEEKDAY' as DayType | null,
    filterWeather: 'SUNNY' as Weather | null,
    setFilterTimeSlot: vi.fn(),
    setFilterDayType: vi.fn(),
    setFilterWeather: vi.fn(),
    resetFilters: vi.fn(),
    clearFilters: vi.fn(),
    isFilterModified: false,
    isAnyFilterActive: true,
    sharedReviews: [],
    setSharedReviews: vi.fn(),
    locating: false,
    locationError: null,
    ...overrides,
  } as ReturnType<typeof useRecommendContext>
}

// useRecommendContext をモック（ContextFilterBar の UI テスト用）
vi.mock('../../contexts/RecommendContext', async (importOriginal) => {
  const actual = await importOriginal<typeof import('../../contexts/RecommendContext')>()
  return {
    ...actual,
    // useRecommendContext のみモック可能にする。RecommendProvider は実実装を維持する
    useRecommendContext: vi.fn(actual.useRecommendContext),
  }
})

afterEach(() => {
  vi.restoreAllMocks()
})

// ============================================================
// ユニットテスト — 実 RecommendProvider を使うテスト
// Validates: Requirements 3.3
// ============================================================

describe('Preservation — ユニットテスト: RecommendContext（修正前コードで PASS が期待される）', () => {

  // ----------------------------------------------------------
  // 要件 3.3 — resetFilters() 後に filterTimeSlot と filterDayType がデフォルト値に戻る
  // ----------------------------------------------------------
  it('UT-3: resetFilters() 後に filterTimeSlot と filterDayType がデフォルト値に戻ること', () => {
    mockGeolocationSuccess()

    // vi.fn(actual) でラップされているため、実実装を呼ぶにはモックをリセットして
    // 実装を直接実行する。ここでは実 RecommendProvider と renderHook を使う
    // vi.mock で actual.useRecommendContext をラップしているため、Provider 内では正常動作する
    const { result } = renderHook(() => useRecommendContext(), {
      wrapper: realProviderWrapper,
    })

    act(() => {})

    // デフォルト値を記録
    const defaultTimeSlot = result.current.timeSlot
    const defaultDayType = result.current.dayType

    // フィルタを変更
    act(() => {
      result.current.setFilterTimeSlot('NIGHT')
      result.current.setFilterDayType('HOLIDAY')
    })

    expect(result.current.filterTimeSlot).toBe('NIGHT')
    expect(result.current.filterDayType).toBe('HOLIDAY')

    // リセット
    act(() => {
      result.current.resetFilters()
    })

    // デフォルト値に戻ったことを確認
    expect(result.current.filterTimeSlot).toBe(defaultTimeSlot)
    expect(result.current.filterDayType).toBe(defaultDayType)
    expect(result.current.isFilterModified).toBe(false)
  })
})

// ============================================================
// プロパティテスト — 実 RecommendProvider を使うテスト
// Validates: Requirements 3.1, 3.2, 3.5, 3.6
// ============================================================

describe('Preservation — プロパティテスト: RecommendContext（修正前コードで全て PASS が期待される）', () => {

  // ----------------------------------------------------------
  // 要件 3.1, 3.2 — 時間帯・曜日種別チップ操作後も filterWeather は変化しない
  //
  // Property: ランダムな (TimeSlot, DayType) の組み合わせを生成し、
  //           時間帯・曜日種別チップを操作しても filterWeather が変化しないことを確認
  //
  // 観察: 修正前コードでは filterWeather 自体が存在しない（undefined）ため、
  //       時間帯・曜日種別の変更が filterWeather に影響しないことを確認する
  // Validates: Requirements 3.1, 3.2
  // ----------------------------------------------------------
  it('PBT-1: 任意の (TimeSlot, DayType) 操作後も filterWeather が変化しないこと（修正前: undefined のまま）', () => {
    mockGeolocationSuccess()

    fc.assert(
      fc.property(
        fc.constantFrom<TimeSlot>('MORNING', 'AFTERNOON', 'EVENING', 'NIGHT'),
        fc.constantFrom<DayType>('WEEKDAY', 'HOLIDAY'),
        (newTimeSlot, newDayType) => {
          const { result: ctxResult, unmount } = renderHook(
            () => useRecommendContext(),
            { wrapper: realProviderWrapper }
          )

          act(() => {})

          // 操作前の filterWeather を記録（修正前: undefined）
          const filterWeatherBefore = ctxResult.current.filterWeather

          // 時間帯・曜日種別フィルタを変更
          act(() => {
            ctxResult.current.setFilterTimeSlot(newTimeSlot)
            ctxResult.current.setFilterDayType(newDayType)
          })

          // 操作後の filterWeather を確認（変化していないこと）
          const filterWeatherAfter = ctxResult.current.filterWeather

          unmount()

          // filterWeather は時間帯・曜日種別の変更によって影響を受けない
          // 修正前: undefined === undefined → true
          return filterWeatherBefore === filterWeatherAfter
        }
      ),
      { numRuns: 8 }
    )
  })

  // ----------------------------------------------------------
  // 要件 3.6 — 全フィルターがデフォルト値のとき isFilterModified === false
  //
  // Property: 全フィルターがデフォルト値のとき isFilterModified が false になることを確認
  // Validates: Requirements 3.6
  // ----------------------------------------------------------
  it('PBT-2: 全フィルターがデフォルト値のとき isFilterModified === false になること', () => {
    mockGeolocationSuccess()

    const { result } = renderHook(() => useRecommendContext(), {
      wrapper: realProviderWrapper,
    })

    act(() => {})

    // 初期状態では filterTimeSlot === timeSlot, filterDayType === dayType
    expect(result.current.isFilterModified).toBe(false)

    // さらにリセットしても false のまま
    act(() => {
      result.current.resetFilters()
    })

    expect(result.current.isFilterModified).toBe(false)
  })

  // ----------------------------------------------------------
  // 要件 3.1, 3.2 — ランダムな (TimeSlot, DayType) のデフォルト値以外で isFilterModified === true
  //
  // Property: デフォルト値以外の (TimeSlot, DayType) を設定すると isFilterModified === true
  //           天気フィルターが存在しない修正前コードでも、時間帯・曜日種別のみで成立することを確認
  // Validates: Requirements 3.1, 3.2
  // ----------------------------------------------------------
  it('PBT-3: デフォルト値以外の (TimeSlot, DayType) を設定すると isFilterModified === true になること', () => {
    mockGeolocationSuccess()

    fc.assert(
      fc.property(
        fc.constantFrom<TimeSlot>('MORNING', 'AFTERNOON', 'EVENING', 'NIGHT'),
        fc.constantFrom<DayType>('WEEKDAY', 'HOLIDAY'),
        (newTimeSlot, newDayType) => {
          const { result: ctxResult, unmount } = renderHook(
            () => useRecommendContext(),
            { wrapper: realProviderWrapper }
          )

          act(() => {})

          const originalTimeSlot = ctxResult.current.timeSlot
          const originalDayType = ctxResult.current.dayType

          // デフォルト値と異なる値のみテスト
          const isDifferent = newTimeSlot !== originalTimeSlot || newDayType !== originalDayType

          if (!isDifferent) {
            unmount()
            return true // デフォルトと同じ場合はスキップ
          }

          // デフォルト値以外に変更
          act(() => {
            ctxResult.current.setFilterTimeSlot(newTimeSlot)
            ctxResult.current.setFilterDayType(newDayType)
          })

          const isModified = ctxResult.current.isFilterModified

          unmount()

          // デフォルト値以外に変更した場合、isFilterModified === true
          return isModified === true
        }
      ),
      { numRuns: 8 }
    )
  })

  // ----------------------------------------------------------
  // 要件 3.5 — weather 自動取得値は常に 'SUNNY' 固定
  //
  // Property: RecommendContext の weather 値は常に 'SUNNY' であること
  // Validates: Requirements 3.5
  // ----------------------------------------------------------
  it('PBT-4: weather 自動取得値は常に "SUNNY" 固定であること', () => {
    mockGeolocationSuccess()

    const { result } = renderHook(() => useRecommendContext(), {
      wrapper: realProviderWrapper,
    })

    act(() => {})

    // weather は常に 'SUNNY' 固定（Requirements 1.6）
    expect(result.current.weather).toBe('SUNNY')

    // 任意のフィルタ変更後も weather 自体は変わらない
    act(() => {
      result.current.setFilterTimeSlot('MORNING')
      result.current.setFilterDayType('HOLIDAY')
    })

    expect(result.current.weather).toBe('SUNNY')
  })
})

// ============================================================
// ユニットテスト — ContextFilterBar UI テスト（モックベース）
// Validates: Requirements 3.4, 3.1, 3.2, 3.3, 3.6
// ============================================================

describe('Preservation — ContextFilterBar ユニットテスト（モックベース、修正前コードで全て PASS が期待される）', () => {

  // ----------------------------------------------------------
  // 要件 3.4 — ローディング中はスピナーが表示される
  // ----------------------------------------------------------
  it('UT-1: locating=true のとき ContextFilterBar がスピナーを返すこと（天気チップ操作なし）', () => {
    vi.mocked(useRecommendContext).mockReturnValue(
      makeContextValue({ locating: true })
    )

    render(<ContextFilterBar />)

    // LoadingSpinner は role="status" + aria-label="読み込み中" で実装される
    expect(screen.getByRole('status', { name: '読み込み中' })).toBeInTheDocument()
    // チップは表示されていない
    expect(screen.queryByRole('button')).toBeNull()
  })

  // ----------------------------------------------------------
  // 要件 3.4 — 位置情報エラー時はエラーメッセージが表示される
  // ----------------------------------------------------------
  it('UT-2: locationError!=null のとき ContextFilterBar がエラーメッセージを返すこと', () => {
    vi.mocked(useRecommendContext).mockReturnValue(
      makeContextValue({ locationError: '現在地を取得できませんでした' })
    )

    render(<ContextFilterBar />)

    const alert = screen.getByRole('alert')
    expect(alert).toBeInTheDocument()
    expect(alert).toHaveTextContent('現在地を取得できませんでした')
  })
})

// ============================================================
// ContextFilterBar レンダリング保護テスト（モックベース）
// Validates: Requirements 3.1, 3.2, 3.3, 3.6
// ============================================================

describe('Preservation — ContextFilterBar レンダリング保護テスト（修正前コードで全て PASS が期待される）', () => {

  // ----------------------------------------------------------
  // 要件 3.1 — 時間帯チップが全4種類表示される
  // ----------------------------------------------------------
  it('CFB-1: 時間帯チップが表示されドロップダウンに4つのオプションが存在すること', () => {
    vi.mocked(useRecommendContext).mockReturnValue(
      makeContextValue({ filterTimeSlot: 'AFTERNOON', locating: false, locationError: null })
    )

    render(<ContextFilterBar />)

    const timeSlotButton = screen.getByRole('button', { name: /時間帯フィルタ/ })
    expect(timeSlotButton).toBeInTheDocument()

    // ドロップダウンを開く
    fireEvent.click(timeSlotButton)

    const options = screen.getAllByRole('option')
    expect(options).toHaveLength(4)
  })

  // ----------------------------------------------------------
  // 要件 3.2 — 曜日種別チップが全2種類表示される
  // ----------------------------------------------------------
  it('CFB-2: 曜日種別チップが表示されドロップダウンに2つのオプションが存在すること', () => {
    vi.mocked(useRecommendContext).mockReturnValue(
      makeContextValue({ filterDayType: 'WEEKDAY', locating: false, locationError: null })
    )

    render(<ContextFilterBar />)

    const dayTypeButton = screen.getByRole('button', { name: /曜日フィルタ/ })
    expect(dayTypeButton).toBeInTheDocument()

    fireEvent.click(dayTypeButton)

    const options = screen.getAllByRole('option')
    expect(options).toHaveLength(2)
  })

  // ----------------------------------------------------------
  // 要件 3.6 — isFilterModified=false のときリセットボタンが非表示
  // ----------------------------------------------------------
  it('CFB-3: isFilterModified=false のときリセットボタンが表示されないこと', () => {
    vi.mocked(useRecommendContext).mockReturnValue(
      makeContextValue({ isFilterModified: false })
    )

    render(<ContextFilterBar />)

    expect(screen.queryByRole('button', { name: 'フィルタをリセット' })).toBeNull()
  })

  // ----------------------------------------------------------
  // 要件 3.3 — isFilterModified=true のときリセットボタンが表示される
  // ----------------------------------------------------------
  it('CFB-4: isFilterModified=true のときリセットボタンが表示され、クリックで resetFilters が呼ばれること', () => {
    const resetFilters = vi.fn()
    vi.mocked(useRecommendContext).mockReturnValue(
      makeContextValue({ isFilterModified: true, resetFilters })
    )

    render(<ContextFilterBar />)

    const resetButton = screen.getByRole('button', { name: 'フィルタをリセット' })
    expect(resetButton).toBeInTheDocument()

    fireEvent.click(resetButton)
    expect(resetFilters).toHaveBeenCalledTimes(1)
  })

  // ----------------------------------------------------------
  // 要件 3.1 — 任意の TimeSlot で時間帯チップの aria-label が正しく設定される
  // Validates: Requirements 3.1
  // ----------------------------------------------------------
  it('CFB-PBT: 任意の TimeSlot で時間帯チップの aria-label が正しく設定されること', () => {
    const TIME_SLOT_META: Record<TimeSlot, { label: string; range: string }> = {
      MORNING:   { label: '朝',   range: '5〜9時' },
      AFTERNOON: { label: '昼',   range: '10〜16時' },
      EVENING:   { label: '夕方', range: '17〜20時' },
      NIGHT:     { label: '夜',   range: '21〜4時' },
    }

    fc.assert(
      fc.property(
        fc.constantFrom<TimeSlot>('MORNING', 'AFTERNOON', 'EVENING', 'NIGHT'),
        (timeSlot) => {
          vi.mocked(useRecommendContext).mockReturnValue(
            makeContextValue({ filterTimeSlot: timeSlot, locating: false, locationError: null })
          )

          const { unmount } = render(<ContextFilterBar />)

          const chip = screen.getByRole('button', { name: /時間帯フィルタ/ })
          const ariaLabel = chip.getAttribute('aria-label') ?? ''

          unmount()

          const meta = TIME_SLOT_META[timeSlot]
          return ariaLabel.includes(meta.label) && ariaLabel.includes(meta.range)
        }
      )
    )
  })

  // ----------------------------------------------------------
  // 要件 3.2 — 任意の DayType で曜日種別チップの aria-label が正しく設定される
  // Validates: Requirements 3.2
  // ----------------------------------------------------------
  it('CFB-PBT2: 任意の DayType で曜日種別チップの aria-label が正しく設定されること', () => {
    const DAY_TYPE_LABEL: Record<DayType, string> = {
      WEEKDAY: '平日',
      HOLIDAY: '休日',
    }

    fc.assert(
      fc.property(
        fc.constantFrom<DayType>('WEEKDAY', 'HOLIDAY'),
        (dayType) => {
          vi.mocked(useRecommendContext).mockReturnValue(
            makeContextValue({ filterDayType: dayType, locating: false, locationError: null })
          )

          const { unmount } = render(<ContextFilterBar />)

          const chip = screen.getByRole('button', { name: /曜日フィルタ/ })
          const ariaLabel = chip.getAttribute('aria-label') ?? ''

          unmount()

          return ariaLabel.includes(DAY_TYPE_LABEL[dayType])
        }
      )
    )
  })
})
