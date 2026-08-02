// Feature: context-aware-feed-map, Property 5: レコメンドAPIクエリパラメータの正確な伝達
// Validates: Requirements 2.2, 6.1

import { describe, it, expect, beforeAll, afterEach, afterAll } from 'vitest'
import * as fc from 'fast-check'
import { setupServer } from 'msw/node'
import { http, HttpResponse, delay } from 'msw'
import { renderHook, waitFor } from '@testing-library/react'
import { useRecommendFeed } from './useRecommendFeed'
import type { Weather, TimeSlot } from '../../mocks/data/types'

// ---- MSW サーバー ----

// キャプチャした URL を格納する変数（テストごとにリセットする）
let capturedUrl: string | null = null

const server = setupServer(
  http.get('/api/reviews/recommend', async ({ request }) => {
    capturedUrl = request.url
    await delay(200)
    return HttpResponse.json({ reviews: [] })
  }),
)

beforeAll(() => server.listen({ onUnhandledRequest: 'error' }))
afterEach(() => {
  capturedUrl = null
  server.resetHandlers()
})
afterAll(() => server.close())

// ============================================================
// Feature: context-aware-feed-map, Property 5: レコメンドAPIクエリパラメータの正確な伝達
// ============================================================

describe('useRecommendFeed — Property 5: レコメンドAPIクエリパラメータの正確な伝達', () => {
  /**
   * 任意の lat/lon/weather/timeSlot パラメータをフックに渡したとき、
   * MSW がキャプチャした URL が4つすべてのパラメータを正確に含むこと。
   *
   * Validates: Requirements 2.2, 6.1
   */
  it(
    'フックに渡した全パラメータが /api/reviews/recommend のクエリに正確に含まれる',
    async () => {
      await fc.assert(
        fc.asyncProperty(
          fc.record({
            lat: fc.float({ min: -90, max: 90, noNaN: true }),
            lon: fc.float({ min: -180, max: 180, noNaN: true }),
            weather: fc.constantFrom<Weather>('SUNNY'),
            timeSlot: fc.constantFrom<TimeSlot>('MORNING', 'AFTERNOON', 'EVENING', 'NIGHT'),
          }),
          async (params) => {
            capturedUrl = null

            const { result, unmount } = renderHook(() => useRecommendFeed(params))

            // ローディングが完了するまで待つ（MSW delay(200ms) を含む）
            await waitFor(
              () => {
                expect(result.current.loading).toBe(false)
              },
              { timeout: 5000 },
            )

            // URL がキャプチャされていることを確認
            expect(capturedUrl).not.toBeNull()

            // URL をパースしてクエリパラメータを検証する
            const parsedUrl = new URL(capturedUrl!, 'http://localhost')
            const sp = parsedUrl.searchParams

            // lat/lon は template literal で直接埋め込まれるため、
            // String(value) との比較が最も正確
            expect(sp.get('lat')).toBe(String(params.lat))
            expect(sp.get('lon')).toBe(String(params.lon))

            // weather と timeSlot は文字列の完全一致
            expect(sp.get('weather')).toBe(params.weather)
            expect(sp.get('timeSlot')).toBe(params.timeSlot)

            unmount()
          },
        ),
        { numRuns: 100 },
      )
    },
    // 100 回のリクエストに MSW の delay(200ms) が掛かるため、余裕を持って 60s に設定
    60_000,
  )
})
