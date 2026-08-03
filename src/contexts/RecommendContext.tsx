// src/contexts/RecommendContext.tsx
// コンテキスト対応フィード・マップ連携 — コンテキストプロバイダー
// Requirements: 1.1, 1.2, 1.3, 1.4, 1.5, 1.6, 1.7, 3.5, 7.1, 7.2, 7.3

import {
  createContext,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState,
  type ReactNode,
} from 'react'
import type { Review, Weather, TimeSlot, DayType } from '../mocks/data/types'
import { calcTimeSlot, calcDayType } from '../utils/contextCalc'

// ---- 定数 ----

const DEFAULT_COORD = { lat: 35.1815, lon: 136.9066 } // 栄（名古屋）
const GEO_TIMEOUT_MS = 8000
const LOCATION_ERROR_CLEAR_MS = 3000

// ---- 型定義 ----

interface RecommendState {
  // コンテキスト値（自動取得）
  coord: { lat: number; lon: number }
  weather: Weather // 常に 'SUNNY'
  timeSlot: TimeSlot // 現在時刻から自動計算
  dayType: DayType // 現在曜日から自動計算

  // フィルタ状態（ユーザーが変更可能）
  filterTimeSlot: TimeSlot | null // null = フィルタ無効（すべて表示）
  filterDayType: DayType | null   // null = フィルタ無効（すべて表示）
  filterWeather: Weather | null   // null = フィルタ無効（すべて表示）
  setFilterTimeSlot: (ts: TimeSlot) => void
  setFilterDayType: (dt: DayType) => void
  setFilterWeather: (w: Weather) => void
  resetFilters: () => void
  clearFilters: () => void // フィルタを完全解除（すべての口コミを表示）
  isFilterModified: boolean // フィルタがデフォルト（Context値）から変更されているか
  isAnyFilterActive: boolean // いずれかのフィルタが有効な状態か

  // フィード表示中の口コミ（最大20件ずつ累積）
  // ※ MapPage は useRecommendFeed を独自に呼び出すため sharedAllReviews は不要
  sharedReviews: Review[]
  setSharedReviews: (reviews: Review[]) => void

  // ローディング・エラー状態
  locating: boolean // Geolocation取得中フラグ
  locationError: string | null // 位置情報エラーメッセージ（3秒で自動クリア）
}

// ---- Context 生成 ----

const RecommendContext = createContext<RecommendState | null>(null)

// ---- Provider ----

interface RecommendProviderProps {
  children: ReactNode
}

/**
 * アプリ全体にコンテキスト情報（現在地・天気・時間帯・曜日種別）を提供するプロバイダー。
 * MileProvider の内側、AppRoutes の外側に配置する。
 *
 * Requirements: 1.1, 1.2, 1.3, 1.4, 1.5, 1.6, 1.7, 7.1, 7.2, 7.3
 */
export function RecommendProvider({ children }: RecommendProviderProps) {
  // 現在時刻・曜日から初期の timeSlot / dayType を計算
  const now = new Date()
  const initialTimeSlot = calcTimeSlot(now.getHours())
  const initialDayType = calcDayType(now.getDay())

  // ---- State ----

  const [coord, setCoord] = useState<{ lat: number; lon: number }>(DEFAULT_COORD)
  const [locating, setLocating] = useState<boolean>(true)
  const [locationError, setLocationError] = useState<string | null>(null)

  // weather は常に SUNNY 固定（Requirements 1.6）
  const weather: Weather = 'SUNNY'

  // timeSlot / dayType は初期化時に計算した値を保持（Requirements 1.4, 1.5）
  const timeSlot: TimeSlot = initialTimeSlot
  const dayType: DayType = initialDayType

  // フィルタ状態（初期値は timeSlot / dayType / weather と同じ。null = フィルタ無効）
  const [filterTimeSlot, setFilterTimeSlot] = useState<TimeSlot | null>(initialTimeSlot)
  const [filterDayType, setFilterDayType] = useState<DayType | null>(initialDayType)
  const [filterWeather, setFilterWeather] = useState<Weather | null>(weather)

  // 共有口コミリスト（FeedPage 表示中の口コミ、最大20件ずつ累積）
  const [sharedReviews, setSharedReviews] = useState<Review[]>([])

  // locationError の setTimeout を管理する ref（メモリリーク防止）
  const errorTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null)

  // ---- Geolocation 取得（Requirements 1.1, 1.2, 1.3, 7.1, 7.2, 7.3） ----

  useEffect(() => {
    // Geolocation API がブラウザに存在しない場合はデフォルト座標にフォールバック
    if (!navigator.geolocation) {
      setCoord(DEFAULT_COORD)
      setLocating(false)
      setLocationError('現在地を取得できませんでした')

      // 3秒後に自動クリア（Requirements 7.3）
      errorTimerRef.current = setTimeout(() => {
        setLocationError(null)
      }, LOCATION_ERROR_CLEAR_MS)

      return () => {
        if (errorTimerRef.current !== null) {
          clearTimeout(errorTimerRef.current)
        }
      }
    }

    // Requirements 1.1: Geolocation API を使って現在地取得を試みる
    navigator.geolocation.getCurrentPosition(
      // 成功コールバック（Requirements 1.2）
      (position) => {
        setCoord({
          lat: position.coords.latitude,
          lon: position.coords.longitude,
        })
        setLocating(false)
      },
      // 失敗・拒否コールバック（Requirements 1.3, 7.3）
      (_error) => {
        setCoord(DEFAULT_COORD)
        setLocating(false)
        setLocationError('現在地を取得できませんでした')

        // 3秒後に自動クリア（Requirements 7.3）
        errorTimerRef.current = setTimeout(() => {
          setLocationError(null)
        }, LOCATION_ERROR_CLEAR_MS)
      },
      // オプション
      {
        timeout: GEO_TIMEOUT_MS,
        enableHighAccuracy: false,
      },
    )

    // cleanup: タイマーが残っている場合はクリア（メモリリーク防止）
    return () => {
      if (errorTimerRef.current !== null) {
        clearTimeout(errorTimerRef.current)
      }
    }
  }, [])

  // ---- フィルタ操作 ----

  /**
   * フィルタを現在の Context 自動取得値にリセットする（Requirements 3.5）
   */
  function resetFilters(): void {
    setFilterTimeSlot(timeSlot)
    setFilterDayType(dayType)
    setFilterWeather(weather)
  }

  /**
   * フィルタを完全解除する（すべての口コミを表示）
   */
  function clearFilters(): void {
    setFilterTimeSlot(null)
    setFilterDayType(null)
    setFilterWeather(null)
  }

  // ---- isFilterModified（useMemo で算出） ----

  const isFilterModified = useMemo(
    () =>
      filterTimeSlot !== timeSlot ||
      filterDayType !== dayType ||
      filterWeather !== weather,
    [filterTimeSlot, filterDayType, filterWeather, timeSlot, dayType, weather],
  )

  // いずれかのフィルタが有効（非 null）かどうか
  const isAnyFilterActive = useMemo(
    () => filterTimeSlot !== null || filterDayType !== null || filterWeather !== null,
    [filterTimeSlot, filterDayType, filterWeather],
  )

  // ---- Context 値の組み立て ----

  const value: RecommendState = {
    coord,
    weather,
    timeSlot,
    dayType,
    filterTimeSlot,
    filterDayType,
    filterWeather,
    setFilterTimeSlot,
    setFilterDayType,
    setFilterWeather,
    resetFilters,
    clearFilters,
    isFilterModified,
    isAnyFilterActive,
    sharedReviews,
    setSharedReviews,
    locating,
    locationError,
  }

  return <RecommendContext.Provider value={value}>{children}</RecommendContext.Provider>
}

// ---- カスタムフック ----

/**
 * コンテキスト情報（現在地・天気・時間帯・曜日種別）にアクセスするカスタムフック。
 * RecommendProvider の外で呼び出した場合はエラーをスロー。
 *
 * Requirements: 1.7
 */
export function useRecommendContext(): RecommendState {
  const ctx = useContext(RecommendContext)
  if (ctx === null) {
    throw new Error('useRecommendContext は RecommendProvider の内側で使用してください')
  }
  return ctx
}
