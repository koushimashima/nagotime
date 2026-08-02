// src/components/ContextFilterBar.tsx
// コンテキストフィルタバー — 時間帯・曜日種別・天気フィルタチップ UI
// Requirements: 2.1, 2.2, 3.1, 3.2, 3.3, 3.4, 3.5, 3.6, 7.1, 7.2, 7.3, 8.1, 8.4

import { useState } from 'react'
import { useRecommendContext } from '../contexts/RecommendContext'
import { LoadingSpinner } from './LoadingSpinner'
import type { TimeSlot, DayType, Weather } from '../mocks/data/types'

// ---- ラベル・区間マッピング ----

interface TimeSlotMeta {
  label: string
  range: string
}

const TIME_SLOT_META: Record<TimeSlot, TimeSlotMeta> = {
  MORNING:   { label: '朝',   range: '5〜9時'   },
  AFTERNOON: { label: '昼',   range: '10〜16時' },
  EVENING:   { label: '夕方', range: '17〜20時' },
  NIGHT:     { label: '夜',   range: '21〜4時'  },
}

const DAY_TYPE_LABEL: Record<DayType, string> = {
  WEEKDAY: '平日',
  HOLIDAY: '休日',
}

const TIME_SLOT_ORDER: TimeSlot[] = ['MORNING', 'AFTERNOON', 'EVENING', 'NIGHT']
const DAY_TYPE_ORDER: DayType[]   = ['WEEKDAY', 'HOLIDAY']

// ---- 天気メタデータ ----

const WEATHER_LABEL: Record<Weather, string> = {
  SUNNY: '晴れ', CLOUDY: '曇り', RAINY: '雨', SNOWY: '雪', UNKNOWN: '不明',
}
const WEATHER_ICON: Record<Weather, string> = {
  SUNNY: '☀️', CLOUDY: '☁️', RAINY: '🌧', SNOWY: '❄️', UNKNOWN: '？',
}
const WEATHER_ORDER: Weather[] = ['SUNNY', 'CLOUDY', 'RAINY', 'SNOWY']

// ---- コンポーネント ----

/**
 * 時間帯・曜日種別フィルタチップ UI。
 * props は持たず、useRecommendContext() からすべてのデータを取得する。
 *
 * Requirements: 3.1, 3.2, 3.3, 3.4, 3.5, 3.6, 7.1, 7.2, 7.3, 8.1, 8.4
 */
export function ContextFilterBar() {
  const {
    filterTimeSlot,
    filterDayType,
    filterWeather,
    setFilterTimeSlot,
    setFilterDayType,
    setFilterWeather,
    resetFilters,
    isFilterModified,
    locating,
    locationError,
  } = useRecommendContext()

  // ドロップダウン開閉状態
  const [openDropdown, setOpenDropdown] = useState<'timeSlot' | 'dayType' | 'weather' | null>(null)

  // ---- ローディング表示 ----
  if (locating) {
    return (
      <div className="flex items-center justify-center px-4 py-2">
        <LoadingSpinner size="sm" />
      </div>
    )
  }

  // ---- エラー表示 ----
  if (locationError !== null) {
    return (
      <div
        role="alert"
        className="px-4 py-2 text-sm text-red-600"
      >
        {locationError}
      </div>
    )
  }

  // ---- チップのスタイル ----
  const chipBase =
    'relative inline-flex items-center gap-1 px-3 py-1 rounded-full text-sm font-medium cursor-pointer select-none border transition-colors'
  const chipNormal    = 'bg-gray-100 text-gray-700 border-gray-200 hover:bg-gray-200'
  const chipModified  = 'bg-orange-500 text-white border-orange-500 hover:bg-orange-600'
  const chipClassName = `${chipBase} ${isFilterModified ? chipModified : chipNormal}`

  // ---- ドロップダウン共通スタイル ----
  const dropdownBase =
    'absolute top-full left-0 mt-1 z-50 min-w-max rounded-lg shadow-lg border border-gray-200 bg-white overflow-hidden'

  // ---- イベントハンドラ ----

  function handleTimeSlotChipClick() {
    setOpenDropdown(prev => (prev === 'timeSlot' ? null : 'timeSlot'))
  }

  function handleDayTypeChipClick() {
    setOpenDropdown(prev => (prev === 'dayType' ? null : 'dayType'))
  }

  function handleSelectTimeSlot(ts: TimeSlot) {
    setFilterTimeSlot(ts)
    setOpenDropdown(null)
  }

  function handleSelectDayType(dt: DayType) {
    setFilterDayType(dt)
    setOpenDropdown(null)
  }

  function handleWeatherChipClick() {
    setOpenDropdown(prev => (prev === 'weather' ? null : 'weather'))
  }

  function handleSelectWeather(w: Weather) {
    setFilterWeather(w)
    setOpenDropdown(null)
  }

  function handleReset() {
    resetFilters()
    setOpenDropdown(null)
  }

  // ---- アリアラベル ----
  const timeSlotMeta = TIME_SLOT_META[filterTimeSlot]
  const timeSlotAriaLabel = `時間帯フィルタ: ${timeSlotMeta.label} (${timeSlotMeta.range})`
  const dayTypeAriaLabel  = `曜日フィルタ: ${DAY_TYPE_LABEL[filterDayType]}`

  return (
    <div
      className="flex items-center gap-2 px-4 py-2 flex-wrap"
      // クリック伝播でドロップダウンを閉じる（チップ外クリック時）
      onClick={(e) => {
        // チップ自体のクリックは各ハンドラで管理するため、バブル時のみ閉じる
        const target = e.target as HTMLElement
        if (!target.closest('[data-chip]')) {
          setOpenDropdown(null)
        }
      }}
    >
      {/* 時間帯チップ */}
      <div className="relative" data-chip>
        <button
          type="button"
          className={chipClassName}
          aria-label={timeSlotAriaLabel}
          aria-haspopup="listbox"
          aria-expanded={openDropdown === 'timeSlot'}
          onClick={handleTimeSlotChipClick}
        >
          {timeSlotMeta.label}
          <span className="text-xs opacity-75">({timeSlotMeta.range})</span>
          <span className="ml-1 text-xs opacity-60" aria-hidden="true">▾</span>
        </button>

        {/* 時間帯ドロップダウン */}
        {openDropdown === 'timeSlot' && (
          <ul
            role="listbox"
            aria-label="時間帯を選択"
            className={dropdownBase}
          >
            {TIME_SLOT_ORDER.map((ts) => {
              const meta = TIME_SLOT_META[ts]
              const isSelected = ts === filterTimeSlot
              return (
                <li
                  key={ts}
                  role="option"
                  aria-selected={isSelected}
                  className={`px-4 py-2 text-sm cursor-pointer hover:bg-orange-50 transition-colors ${
                    isSelected ? 'bg-orange-100 text-orange-700 font-medium' : 'text-gray-700'
                  }`}
                  onClick={() => handleSelectTimeSlot(ts)}
                >
                  {meta.label}
                  <span className="ml-1 text-xs text-gray-400">({meta.range})</span>
                </li>
              )
            })}
          </ul>
        )}
      </div>

      {/* 曜日種別チップ */}
      <div className="relative" data-chip>
        <button
          type="button"
          className={chipClassName}
          aria-label={dayTypeAriaLabel}
          aria-haspopup="listbox"
          aria-expanded={openDropdown === 'dayType'}
          onClick={handleDayTypeChipClick}
        >
          {DAY_TYPE_LABEL[filterDayType]}
          <span className="ml-1 text-xs opacity-60" aria-hidden="true">▾</span>
        </button>

        {/* 曜日種別ドロップダウン */}
        {openDropdown === 'dayType' && (
          <ul
            role="listbox"
            aria-label="曜日種別を選択"
            className={dropdownBase}
          >
            {DAY_TYPE_ORDER.map((dt) => {
              const isSelected = dt === filterDayType
              return (
                <li
                  key={dt}
                  role="option"
                  aria-selected={isSelected}
                  className={`px-4 py-2 text-sm cursor-pointer hover:bg-orange-50 transition-colors ${
                    isSelected ? 'bg-orange-100 text-orange-700 font-medium' : 'text-gray-700'
                  }`}
                  onClick={() => handleSelectDayType(dt)}
                >
                  {DAY_TYPE_LABEL[dt]}
                </li>
              )
            })}
          </ul>
        )}
      </div>

      {/* 天気チップ */}
      <div className="relative" data-chip>
        <button
          type="button"
          className={chipClassName}
          aria-label={`天気フィルタ: ${WEATHER_LABEL[filterWeather]}`}
          aria-haspopup="listbox"
          aria-expanded={openDropdown === 'weather'}
          onClick={handleWeatherChipClick}
        >
          {WEATHER_ICON[filterWeather]}{WEATHER_LABEL[filterWeather]}
          <span className="ml-1 text-xs opacity-60" aria-hidden="true">▾</span>
        </button>

        {/* 天気ドロップダウン */}
        {openDropdown === 'weather' && (
          <ul
            role="listbox"
            aria-label="天気を選択"
            className={dropdownBase}
          >
            {WEATHER_ORDER.map((w) => {
              const isSelected = w === filterWeather
              return (
                <li
                  key={w}
                  role="option"
                  aria-selected={isSelected}
                  className={`px-4 py-2 text-sm cursor-pointer hover:bg-orange-50 transition-colors ${
                    isSelected ? 'bg-orange-100 text-orange-700 font-medium' : 'text-gray-700'
                  }`}
                  onClick={() => handleSelectWeather(w)}
                >
                  {WEATHER_ICON[w]} {WEATHER_LABEL[w]}
                </li>
              )
            })}
          </ul>
        )}
      </div>

      {/* リセットボタン（フィルタ変更時のみ表示） */}
      {isFilterModified && (
        <button
          type="button"
          aria-label="フィルタをリセット"
          className="inline-flex items-center gap-1 px-3 py-1 rounded-full text-sm font-medium
                     bg-white text-orange-500 border border-orange-400
                     hover:bg-orange-50 transition-colors cursor-pointer"
          onClick={handleReset}
        >
          <span aria-hidden="true">✕</span>
          リセット
        </button>
      )}
    </div>
  )
}
