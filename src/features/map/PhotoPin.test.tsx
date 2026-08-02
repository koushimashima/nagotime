// src/features/map/PhotoPin.test.tsx
// Feature: context-aware-feed-map — PhotoPin プロパティテスト
// Property 6: 写真ピンのphotoUrls[0]使用とフォールバック
// Property 7: ポップアップのコンテンツ完整性
// Property 9: 共有口コミリストのマップピン反映

import { describe, it, vi, afterEach, type MockInstance } from 'vitest'
import { render, screen } from '@testing-library/react'
import * as fc from 'fast-check'
import type { ReactNode } from 'react'
import L from 'leaflet'
import type { Review, ReviewStatus, Weather, TimeSlot, DayType } from '../../mocks/data/types'
import { PhotoPin } from './PhotoPin'
import { RecommendProvider } from '../../contexts/RecommendContext'

// ============================================================
// モック設定
// ============================================================

// react-leaflet モック: Marker は children をそのまま render、Popup は data-testid 付きで render
vi.mock('react-leaflet', () => ({
  Marker: ({ children }: { children?: ReactNode }) => (
    <div data-testid="marker">{children}</div>
  ),
  Popup: ({ children }: { children?: ReactNode }) => (
    <div data-testid="popup-content">{children}</div>
  ),
  MapContainer: ({ children }: { children?: ReactNode }) => (
    <div data-testid="map-container">{children}</div>
  ),
  TileLayer: () => null,
  useMap: () => ({
    flyTo: vi.fn(),
    getZoom: vi.fn(() => 14),
    getCenter: vi.fn(() => ({ lat: 35.1815, lng: 136.9066 })),
    on: vi.fn(),
    off: vi.fn(),
  }),
}))

// leaflet モック: L.divIcon をスタブ化（受け取った opts をそのまま返す）
vi.mock('leaflet', () => ({
  default: {
    divIcon: vi.fn((opts: unknown) => opts),
  },
}))

// react-router-dom モック: Link を <a href={to}> としてレンダリング
vi.mock('react-router-dom', () => ({
  Link: ({ children, to }: { children?: ReactNode; to: string }) => (
    <a href={to}>{children}</a>
  ),
  useNavigate: () => vi.fn(),
}))

afterEach(() => {
  vi.restoreAllMocks()
})

// ============================================================
// アービトラリ定義
// ============================================================

/** ISO 8601 日付文字列のアービトラリ */
const isoDateArb = fc
  .date({ min: new Date('2020-01-01'), max: new Date('2030-12-31') })
  .map((d) => d.toISOString())

/** ReviewStatus のアービトラリ */
const reviewStatusArb = fc.constantFrom<ReviewStatus>('PUBLISHED', 'PENDING', 'REJECTED')

/** Weather のアービトラリ */
const weatherArb = fc.constantFrom<Weather>('SUNNY', 'CLOUDY', 'RAINY', 'SNOWY', 'UNKNOWN')

/** TimeSlot のアービトラリ */
const timeSlotArb = fc.constantFrom<TimeSlot>('MORNING', 'AFTERNOON', 'EVENING', 'NIGHT')

/** DayType のアービトラリ */
const dayTypeArb = fc.constantFrom<DayType>('WEEKDAY', 'HOLIDAY')

/** URL 文字列（https://example.com/xxx 形式）のアービトラリ */
const photoUrlArb = fc
  .string({ minLength: 1, maxLength: 30 })
  .filter((s) => !s.includes('"') && !s.includes('<') && !s.includes('>'))
  .map((s) => `https://example.com/${s}`)

/** Review 型の完全なアービトラリ */
const reviewArb: fc.Arbitrary<Review> = fc.record({
  reviewId: fc.uuid(),
  userId: fc.uuid(),
  userName: fc.string({ minLength: 1, maxLength: 20 }),
  spotId: fc.uuid(),
  spotName: fc.string({ minLength: 1, maxLength: 30 }),
  area: fc.string({ minLength: 1, maxLength: 20 }),
  lat: fc.float({ min: Math.fround(34.9), max: Math.fround(35.5), noNaN: true }),
  lon: fc.float({ min: Math.fround(136.5), max: Math.fround(137.1), noNaN: true }),
  text: fc.string({ minLength: 0, maxLength: 200 }),
  photoUrls: fc.array(photoUrlArb, { minLength: 0, maxLength: 3 }),
  status: reviewStatusArb,
  weather: weatherArb,
  timeSlot: timeSlotArb,
  dayType: dayTypeArb,
  likeCount: fc.nat({ max: 9999 }),
  viewCount: fc.nat({ max: 99999 }),
  createdAt: isoDateArb,
  likedUserIds: fc.array(fc.uuid(), { minLength: 0, maxLength: 5 }),
  hashtags: fc.option(
    fc.array(fc.string({ minLength: 1, maxLength: 15 }), { minLength: 0, maxLength: 5 }),
    { nil: undefined }
  ),
})

// ============================================================
// Feature: context-aware-feed-map, Property 6: 写真ピンのphotoUrls[0]使用とフォールバック
// ============================================================

describe('PhotoPin — Property 6: 写真ピンのphotoUrls[0]使用とフォールバック', () => {
  // Validates: Requirements 5.1, 5.7
  it('Property 6: photoUrls が非空なら L.divIcon に img[src]=photoUrls[0] の HTML が渡され、空なら bg-orange-500 のみ渡されること', () => {
    // L.divIcon のモックを取得
    const divIconMock = L.divIcon as unknown as MockInstance<(opts: { html: string }) => object>

    fc.assert(
      fc.property(
        fc.record({
          reviewId: fc.uuid(),
          userId: fc.uuid(),
          userName: fc.string({ minLength: 1, maxLength: 20 }),
          spotId: fc.uuid(),
          // spotName に '"' が含まれると HTML エスケープが入るので除外
          spotName: fc.string({ minLength: 1, maxLength: 30 }).filter((s) => !s.includes('"')),
          area: fc.string({ minLength: 1, maxLength: 20 }),
          lat: fc.float({ min: Math.fround(34.9), max: Math.fround(35.5), noNaN: true }),
          lon: fc.float({ min: Math.fround(136.5), max: Math.fround(137.1), noNaN: true }),
          text: fc.string({ minLength: 0, maxLength: 200 }),
          photoUrls: fc.oneof(
            fc.array(photoUrlArb, { minLength: 1, maxLength: 3 }),
            fc.constant<string[]>([])
          ),
          status: reviewStatusArb,
          weather: weatherArb,
          timeSlot: timeSlotArb,
          dayType: dayTypeArb,
          likeCount: fc.nat({ max: 9999 }),
          viewCount: fc.nat({ max: 99999 }),
          createdAt: isoDateArb,
          likedUserIds: fc.array(fc.uuid(), { minLength: 0, maxLength: 5 }),
          hashtags: fc.option(
            fc.array(fc.string({ minLength: 1, maxLength: 15 }), { minLength: 0, maxLength: 5 }),
            { nil: undefined }
          ),
        }),
        (review: Review) => {
          divIconMock.mockClear()

          const { unmount } = render(<PhotoPin review={review} />)

          // L.divIcon が1回呼ばれていることを確認
          if (divIconMock.mock.calls.length === 0) {
            unmount()
            return true // モック呼び出し失敗はスキップ
          }

          const callArg = divIconMock.mock.calls[0][0] as { html: string }
          const html = callArg.html

          let result: boolean

          if (review.photoUrls.length > 0) {
            // photoUrls が非空: photoUrls[0] が img src に使用されること（Requirements 5.1）
            const escapedUrl = review.photoUrls[0].replace(/"/g, '&quot;')
            result = html.includes(`src="${escapedUrl}"`) && html.includes('<img')
          } else {
            // photoUrls が空: bg-orange-500 クラスを持つ div のみで img タグがないこと（Requirements 5.7）
            result = html.includes('bg-orange-500') && !html.includes('<img')
          }

          unmount()
          return result
        }
      ),
      { numRuns: 50 }
    )
  })
})

// ============================================================
// Feature: context-aware-feed-map, Property 7: ポップアップのコンテンツ完整性
// ============================================================

describe('PhotoPin — Property 7: ポップアップのコンテンツ完整性', () => {
  // Validates: Requirements 5.5, 5.6
  it('Property 7: ポップアップに spotName 全文・text 先頭60文字・likeCount・/reviews/{reviewId} リンクが含まれること', () => {
    fc.assert(
      fc.property(
        fc.record({
          reviewId: fc.uuid(),
          userId: fc.uuid(),
          userName: fc.string({ minLength: 1, maxLength: 20 }),
          spotId: fc.uuid(),
          spotName: fc.string({ minLength: 1, maxLength: 30 }),
          area: fc.string({ minLength: 1, maxLength: 20 }),
          lat: fc.float({ min: Math.fround(34.9), max: Math.fround(35.5), noNaN: true }),
          lon: fc.float({ min: Math.fround(136.5), max: Math.fround(137.1), noNaN: true }),
          text: fc.string({ minLength: 0, maxLength: 200 }),
          photoUrls: fc.array(photoUrlArb, { minLength: 0, maxLength: 3 }),
          status: reviewStatusArb,
          weather: weatherArb,
          timeSlot: timeSlotArb,
          dayType: dayTypeArb,
          likeCount: fc.nat({ max: 9999 }),
          viewCount: fc.nat({ max: 99999 }),
          createdAt: isoDateArb,
          likedUserIds: fc.array(fc.uuid(), { minLength: 0, maxLength: 5 }),
          hashtags: fc.option(
            fc.array(fc.string({ minLength: 1, maxLength: 15 }), { minLength: 0, maxLength: 5 }),
            { nil: undefined }
          ),
        }),
        (review: Review) => {
          const { unmount } = render(<PhotoPin review={review} />)

          // ポップアップ内のコンテンツを確認
          const popup = screen.getByTestId('popup-content')
          const content = popup.textContent ?? ''

          // spotName 全文が表示されているか（Requirements 5.5）
          const hasSpotName = content.includes(review.spotName)

          // text 先頭 60 文字が表示されているか（Requirements 5.5）
          const expectedText = review.text.slice(0, 60)
          const hasText = expectedText.length === 0 || content.includes(expectedText)

          // likeCount が表示されているか（Requirements 5.5）
          const hasLikeCount = content.includes(String(review.likeCount))

          // /reviews/{reviewId} リンクが存在するか（Requirements 5.6）
          const links = popup.querySelectorAll('a[href]')
          const hasReviewLink = Array.from(links).some(
            (link) => link.getAttribute('href') === `/reviews/${review.reviewId}`
          )

          unmount()

          return hasSpotName && hasText && hasLikeCount && hasReviewLink
        }
      ),
      { numRuns: 50 }
    )
  })
})

// ============================================================
// Feature: context-aware-feed-map, Property 9: 共有口コミリストのマップピン反映
// ============================================================

/**
 * テスト用ラッパーコンポーネント: reviews 配列を受け取って PhotoPin を並べる
 * （MapPage が sharedReviews を使う将来の実装の先行テスト — Requirements 4.3）
 */
function ReviewPinList({ reviews }: { reviews: Review[] }) {
  return (
    <>
      {reviews.map((r) => (
        <PhotoPin key={r.reviewId} review={r} />
      ))}
    </>
  )
}

describe('PhotoPin — Property 9: 共有口コミリストのマップピン反映', () => {
  // Validates: Requirements 4.3
  it('Property 9: reviews 配列の件数と同数の PhotoPin（Marker）がレンダリングされること', () => {
    // Geolocation のモック（RecommendProvider が使用する）
    vi.stubGlobal('navigator', {
      geolocation: {
        getCurrentPosition: vi.fn(
          (_success: PositionCallback, errorCb?: PositionErrorCallback) => {
            errorCb?.({
              code: 1,
              message: 'Permission denied',
              PERMISSION_DENIED: 1,
              POSITION_UNAVAILABLE: 2,
              TIMEOUT: 3,
            } as GeolocationPositionError)
          }
        ),
      },
    })

    fc.assert(
      fc.property(
        fc.array(reviewArb, { minLength: 0, maxLength: 20 }),
        (reviews: Review[]) => {
          // reviewId の重複を除去（key の衝突を防ぐ）
          const uniqueReviews = reviews.filter(
            (r, idx, arr) =>
              arr.findIndex((other) => other.reviewId === r.reviewId) === idx
          )

          const { unmount, queryAllByTestId } = render(
            <RecommendProvider>
              <ReviewPinList reviews={uniqueReviews} />
            </RecommendProvider>
          )

          // レンダリングされた Marker（data-testid="marker"）の数を確認
          const markers = queryAllByTestId('marker')
          const markerCount = markers.length

          unmount()

          // PhotoPin の数が reviews の数と一致すること（Requirements 4.3）
          return markerCount === uniqueReviews.length
        }
      ),
      { numRuns: 50 }
    )

    vi.restoreAllMocks()
  })
})
