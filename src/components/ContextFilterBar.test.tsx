// src/components/ContextFilterBar.test.tsx
// Feature: context-aware-feed-map, Property 8: aria-labelの動的生成

import { describe, it, expect, vi, afterEach } from 'vitest'
import { render, screen, fireEvent } from '@testing-library/react'
import * as fc from 'fast-check'
import { ContextFilterBar } from './ContextFilterBar'
import type { TimeSlot, DayType } from '../mocks/data/types'

// ---- useRecommendContext のモック ----

vi.mock('../contexts/RecommendContext', () => ({
  useRecommendContext: vi.fn(),
}))

import { useRecommendContext } from '../contexts/RecommendContext'

// モック型を明示的にキャスト
const mockUseRecommendContext = useRecommendContext as ReturnType<typeof vi.fn>

// ---- デフォルトのコンテキスト値ファクトリ ----

function makeContextValue(overrides: Partial<ReturnType<typeof useRecommendContext>> = {}) {
  return {
    coord: { lat: 35.1815, lon: 136.9066 },
    weather: 'SUNNY' as const,
    timeSlot: 'AFTERNOON' as TimeSlot,
    dayType: 'WEEKDAY' as DayType,
    filterTimeSlot: 'AFTERNOON' as TimeSlot,
    filterDayType: 'WEEKDAY' as DayType,
    setFilterTimeSlot: vi.fn(),
    setFilterDayType: vi.fn(),
    resetFilters: vi.fn(),
    isFilterModified: false,
    sharedReviews: [],
    setSharedReviews: vi.fn(),
    locating: false,
    locationError: null,
    ...overrides,
  }
}

// ============================================================
// ユニットテスト
// ============================================================

describe('ContextFilterBar — ユニットテスト', () => {
  afterEach(() => {
    vi.restoreAllMocks()
  })

  // ---- ローディング表示 ----
  it('locating=true のときスピナーが表示されること', () => {
    mockUseRecommendContext.mockReturnValue(
      makeContextValue({ locating: true })
    )

    render(<ContextFilterBar />)

    // LoadingSpinner は role="status" + aria-label="読み込み中"
    expect(screen.getByRole('status', { name: '読み込み中' })).toBeInTheDocument()
    // チップは表示されていない
    expect(screen.queryByRole('button')).toBeNull()
  })

  // ---- エラー表示（fake timers） ----
  it('locationError があるときエラーメッセージが表示されること', () => {
    vi.useFakeTimers()

    mockUseRecommendContext.mockReturnValue(
      makeContextValue({ locationError: '現在地を取得できませんでした' })
    )

    render(<ContextFilterBar />)

    expect(screen.getByRole('alert')).toHaveTextContent('現在地を取得できませんでした')

    vi.useRealTimers()
  })

  it('locationError の 3 秒後の消滅はコンテキスト側で管理されること（null になれば非表示）', async () => {
    vi.useFakeTimers()

    // まずエラーあり → 3 秒後に null になったことを simulate するため
    // 最初は error あり、次のレンダリングで null に切り替える
    mockUseRecommendContext.mockReturnValue(
      makeContextValue({ locationError: '現在地を取得できませんでした' })
    )

    const { rerender } = render(<ContextFilterBar />)
    expect(screen.getByRole('alert')).toBeInTheDocument()

    // Context 側が 3 秒後に null にクリアした状態を simulate
    mockUseRecommendContext.mockReturnValue(
      makeContextValue({ locationError: null })
    )
    rerender(<ContextFilterBar />)

    // エラー表示が消えてチップが表示される
    expect(screen.queryByRole('alert')).toBeNull()
    expect(screen.getAllByRole('button').length).toBeGreaterThanOrEqual(1)

    vi.useRealTimers()
  })

  // ---- リセットボタン ----
  it('isFilterModified=true のときリセットボタンが表示されること', () => {
    mockUseRecommendContext.mockReturnValue(
      makeContextValue({ isFilterModified: true })
    )

    render(<ContextFilterBar />)

    expect(
      screen.getByRole('button', { name: 'フィルタをリセット' })
    ).toBeInTheDocument()
  })

  it('isFilterModified=false のときリセットボタンが表示されないこと', () => {
    mockUseRecommendContext.mockReturnValue(
      makeContextValue({ isFilterModified: false })
    )

    render(<ContextFilterBar />)

    expect(
      screen.queryByRole('button', { name: 'フィルタをリセット' })
    ).toBeNull()
  })

  // ---- 時間帯チップタップでドロップダウン表示 ----
  it('時間帯チップをタップするとドロップダウンが表示されること', () => {
    mockUseRecommendContext.mockReturnValue(
      makeContextValue({ filterTimeSlot: 'AFTERNOON' })
    )

    render(<ContextFilterBar />)

    const timeSlotButton = screen.getByRole('button', {
      name: /時間帯フィルタ/,
    })

    // ドロップダウンは初期状態では非表示
    expect(screen.queryByRole('listbox', { name: '時間帯を選択' })).toBeNull()

    // チップをクリック
    fireEvent.click(timeSlotButton)

    // ドロップダウンが表示される
    const dropdown = screen.getByRole('listbox', { name: '時間帯を選択' })
    expect(dropdown).toBeInTheDocument()

    // 4 種類のオプションが表示される
    const options = screen.getAllByRole('option')
    expect(options).toHaveLength(4)
  })

  it('曜日種別チップをタップするとドロップダウンが表示されること', () => {
    mockUseRecommendContext.mockReturnValue(
      makeContextValue({ filterDayType: 'WEEKDAY' })
    )

    render(<ContextFilterBar />)

    const dayTypeButton = screen.getByRole('button', {
      name: /曜日フィルタ/,
    })

    fireEvent.click(dayTypeButton)

    const dropdown = screen.getByRole('listbox', { name: '曜日種別を選択' })
    expect(dropdown).toBeInTheDocument()

    const options = screen.getAllByRole('option')
    expect(options).toHaveLength(2)
  })

  // ---- リセットボタンが resetFilters を呼ぶ ----
  it('リセットボタンをクリックすると resetFilters が呼ばれること', () => {
    const resetFilters = vi.fn()
    mockUseRecommendContext.mockReturnValue(
      makeContextValue({ isFilterModified: true, resetFilters })
    )

    render(<ContextFilterBar />)

    fireEvent.click(screen.getByRole('button', { name: 'フィルタをリセット' }))

    expect(resetFilters).toHaveBeenCalledTimes(1)
  })
})

// ============================================================
// Feature: context-aware-feed-map, Property 8: aria-labelの動的生成
// Validates: Requirements 8.1
// ============================================================

describe('ContextFilterBar — Property 8: aria-labelの動的生成', () => {
  const TIME_SLOT_META: Record<
    TimeSlot,
    { label: string; range: string }
  > = {
    MORNING:   { label: '朝',   range: '5〜9時'   },
    AFTERNOON: { label: '昼',   range: '10〜16時' },
    EVENING:   { label: '夕方', range: '17〜20時' },
    NIGHT:     { label: '夜',   range: '21〜4時'  },
  }

  afterEach(() => {
    vi.restoreAllMocks()
  })

  // Validates: Requirements 8.1
  it('Property 8: 任意の TimeSlot で時間帯チップの aria-label に日本語ラベルと時間帯区間が含まれること', () => {
    fc.assert(
      fc.property(
        fc.constantFrom<TimeSlot>('MORNING', 'AFTERNOON', 'EVENING', 'NIGHT'),
        (timeSlot) => {
          const meta = TIME_SLOT_META[timeSlot]

          mockUseRecommendContext.mockReturnValue(
            makeContextValue({
              filterTimeSlot: timeSlot,
              isFilterModified: false,
              locating: false,
              locationError: null,
            })
          )

          const { unmount } = render(<ContextFilterBar />)

          // 時間帯チップ（aria-label 属性で検索）
          const chip = screen.getByRole('button', {
            name: new RegExp(`時間帯フィルタ`),
          })
          const ariaLabel = chip.getAttribute('aria-label') ?? ''

          unmount()

          // aria-label に日本語ラベルが含まれること
          const hasLabel = ariaLabel.includes(meta.label)
          // aria-label に時間帯区間文字列が含まれること
          const hasRange = ariaLabel.includes(meta.range)

          return hasLabel && hasRange
        }
      )
    )
  })
})
