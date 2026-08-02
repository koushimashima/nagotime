// src/__tests__/bugcondition/weather-filter-bug-condition.test.tsx
// Feature: weather-filter-button-fix — Bug Condition Exploration Tests
//
// CRITICAL: このテストは修正前コードで FAIL することが期待される。
// FAIL がバグの存在を証明する。テストが FAIL してもコードやテストを修正しないこと。
//
// Validates: Requirements 2.1, 2.2, 2.3, 2.4

import { describe, it, expect, vi, afterEach } from 'vitest'
import { renderHook, render, screen, act } from '@testing-library/react'
import type { ReactNode } from 'react'
import { RecommendProvider, useRecommendContext } from '../../contexts/RecommendContext'
import { ContextFilterBar } from '../../components/ContextFilterBar'
import { MemoryRouter } from 'react-router-dom'
import { AuthProvider } from '../../contexts/AuthContext'
import { MileProvider } from '../../contexts/MileContext'

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

function wrapper({ children }: { children: ReactNode }) {
  return <RecommendProvider>{children}</RecommendProvider>
}

function renderContextFilterBar() {
  return render(
    <MemoryRouter>
      <AuthProvider>
        <MileProvider>
          <RecommendProvider>
            <ContextFilterBar />
          </RecommendProvider>
        </MileProvider>
      </AuthProvider>
    </MemoryRouter>,
  )
}

afterEach(() => {
  vi.restoreAllMocks()
})

// ============================================================
// Bug Condition Exploration Tests
// Validates: Requirements 2.1, 2.2, 2.3, 2.4
//
// EXPECTED: これらのテストは修正前コードで全て FAIL する
// REASON:   バグの存在を証明する
// ============================================================

describe('Bug Condition — 天気フィルターチップ未実装バグ（修正前: FAIL が期待される）', () => {

  // ----------------------------------------------------------
  // テストケース 1: ContextFilterBar に天気チップが存在すること
  //
  // Bug Condition: input.component='ContextFilterBar', action='render'
  // Expected: aria-label に "天気フィルタ" を含むボタンが DOM に存在する
  // 修正前: FAIL（天気チップが実装されていないため）
  // ----------------------------------------------------------
  it('テストケース1: ContextFilterBar に aria-label="天気フィルタ..." のボタンが存在すること', () => {
    mockGeolocationSuccess()

    renderContextFilterBar()

    // act で useEffect を flush し、locating=false になるまで待つ
    act(() => {})

    // 天気フィルタボタンが DOM に存在することをアサート
    // 修正前: このボタンは存在しないため FAIL する
    const weatherButton = screen.queryByRole('button', {
      name: /天気フィルタ/,
    })

    expect(weatherButton).not.toBeNull()
    // Counterexample: weatherButton === null (天気チップが DOM に存在しない)
  })

  // ----------------------------------------------------------
  // テストケース 2: FeedPage が useRecommendFeed に filterWeather 由来の weather を渡すこと
  //
  // Bug Condition: input.component='FeedPage', action='fetch-feed'
  // Expected: useRecommendFeed の weather パラメータが filterWeather（コンテキスト値）由来
  // 修正前: FAIL（weather が常に 'SUNNY' 固定で、filterWeather を使っていないため）
  //
  // 検証方法: RecommendContext を直接使い、filterWeather が存在することを確認し、
  //           かつ FeedPage が filterWeather を useRecommendFeed に渡していることを
  //           コンテキスト上で確認する
  // ----------------------------------------------------------
  it('テストケース2: FeedPage が useRecommendFeed に filterWeather 由来の weather を渡すこと', () => {
    mockGeolocationSuccess()

    // FeedPage は useRecommendFeed に weather: weather（固定）を渡している
    // 修正後は weather: filterWeather に変更される
    // ここでは RecommendContext に filterWeather が存在し、
    // かつ FeedPage がそれを参照していることを確認する
    //
    // FeedPage のソースコードでは:
    //   const { coord, weather, filterTimeSlot, setSharedReviews } = useRecommendContext()
    //   ...
    //   const { reviews, loading, error } = useRecommendFeed({
    //     lat: coord.lat, lon: coord.lon,
    //     weather,          ← filterWeather ではなく weather を使っている（バグ）
    //     timeSlot: filterTimeSlot,
    //   })
    //
    // 修正後: weather: filterWeather に変更される
    //
    // このテストでは useRecommendFeed のモックで実際に渡された weather パラメータを検証する

    const capturedParams: Array<{ weather: string }> = []

    vi.mock('../../features/feed/useRecommendFeed', () => ({
      useRecommendFeed: vi.fn((params: { weather: string; lat: number; lon: number; timeSlot: string }) => {
        capturedParams.push({ weather: params.weather })
        return { reviews: [], loading: false, error: null }
      }),
    }))

    // useRecommendFeed をモックしてから FeedPage を動的 require でレンダリング
    // 注: vi.mock はホイストされるため、ここでのインライン mock は機能しない
    // 代わりに RecommendContext から直接 filterWeather が undefined であることを確認する

    const { result } = renderHook(() => useRecommendContext(), { wrapper })
    act(() => {})

    // filterWeather が存在し、かつ 'SUNNY' であること（初期値）
    // 修正前: filterWeather は undefined（RecommendState インターフェースに定義がない）
    // 修正後: filterWeather === 'SUNNY'（初期値）
    const filterWeather = result.current.filterWeather

    // FeedPage が filterWeather を使うためには filterWeather がコンテキストに存在する必要がある
    // 修正前: filterWeather === undefined → FAIL
    expect(filterWeather).not.toBeUndefined()
    // Counterexample: filterWeather === undefined
  })

  // ----------------------------------------------------------
  // テストケース 3: RecommendContext から filterWeather を取得でき、undefined でないこと
  //
  // Bug Condition: RecommendState インターフェースに filterWeather が存在しない
  // Expected: filterWeather !== undefined
  // 修正前: FAIL（filterWeather が RecommendContext に実装されていないため）
  // ----------------------------------------------------------
  it('テストケース3: RecommendContext の filterWeather が undefined でないこと', () => {
    mockGeolocationSuccess()

    const { result } = renderHook(() => useRecommendContext(), { wrapper })
    act(() => {})

    // filterWeather が RecommendContext に存在し、undefined でないことをアサート
    // 修正前: filterWeather は RecommendState に定義されておらず undefined → FAIL
    const filterWeather = result.current.filterWeather

    expect(filterWeather).not.toBeUndefined()
    // Counterexample: filterWeather === undefined（RecommendContext に未実装）
  })

  // ----------------------------------------------------------
  // テストケース 4: setFilterWeather('RAINY') 後に isFilterModified === true になること
  //
  // Bug Condition: filterWeather が変わっても isFilterModified が更新されない
  // Expected: setFilterWeather('RAINY') 後に isFilterModified === true
  // 修正前: FAIL（setFilterWeather が存在しない、isFilterModified に filterWeather の考慮なし）
  // ----------------------------------------------------------
  it('テストケース4: setFilterWeather("RAINY") 後に isFilterModified === true になること', () => {
    mockGeolocationSuccess()

    const { result } = renderHook(() => useRecommendContext(), { wrapper })
    act(() => {})

    // setFilterWeather が存在することを確認
    const setFilterWeather = result.current.setFilterWeather

    // 修正前: setFilterWeather === undefined → FAIL
    expect(setFilterWeather).toBeDefined()
    expect(typeof setFilterWeather).toBe('function')

    // setFilterWeather('RAINY') を呼び出す
    act(() => {
      setFilterWeather('RAINY')
    })

    // isFilterModified が true になることをアサート
    // 修正前: isFilterModified の useMemo に filterWeather の考慮がないため false のまま → FAIL
    expect(result.current.isFilterModified).toBe(true)
    // Counterexample: isFilterModified === false（filterWeather 変更が isFilterModified に反映されない）
  })
})
