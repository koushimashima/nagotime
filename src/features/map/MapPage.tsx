// src/features/map/MapPage.tsx
// マップ画面 — 周辺スポットを地図上に表示（Requirements 6.1〜6.7）
//
// - Geolocation API で現在地を取得。拒否時は栄（デフォルト座標）を使用
// - GET /api/map/spots で半径内スポットを取得し Marker + Popup で表示
// - 半径スライダー（500m / 1km / 2km / 5km）で検索範囲を変更

import { useCallback, useEffect, useRef, useState } from 'react'
import { Link } from 'react-router-dom'
import {
  MapContainer,
  TileLayer,
  Marker,
  Popup,
  useMap,
} from 'react-leaflet'
import type { LatLngExpression } from 'leaflet'
import { LoadingSpinner } from '../../components/LoadingSpinner'
import type { Spot } from '../../mocks/data/types'

// ---- 定数 ----

/** 栄（名古屋市中心部）デフォルト座標 */
const DEFAULT_CENTER: LatLngExpression = [35.1815, 136.9066]
const DEFAULT_ZOOM = 14

/** 半径選択肢（メートル） */
const RADIUS_OPTIONS = [
  { label: '500m', value: 500 },
  { label: '1km',  value: 1000 },
  { label: '2km',  value: 2000 },
  { label: '5km',  value: 5000 },
] as const

// ---- 内部コンポーネント ----

/**
 * MapContainer 内でのみ使用できる地図中心更新コンポーネント。
 * `center` が変わると `map.setView()` を呼び出す。
 */
function MapController({ center }: { center: LatLngExpression }) {
  const map = useMap()
  const prevCenterRef = useRef<LatLngExpression | null>(null)

  useEffect(() => {
    // 前回と同じ座標では再描画しない
    const [lat, lon] = center as [number, number]
    const prev = prevCenterRef.current as [number, number] | null
    if (prev && prev[0] === lat && prev[1] === lon) return

    map.setView(center, map.getZoom())
    prevCenterRef.current = center
  }, [center, map])

  return null
}

/**
 * スポットポップアップ内のコンテンツ。
 * サムネイル・スポット名・口コミ数・詳細リンクを表示する。
 */
function SpotPopup({ spot }: { spot: Spot }) {
  return (
    <div className="w-44 text-sm">
      {/* サムネイル */}
      <img
        src={spot.thumbnailUrl}
        alt={spot.name}
        className="w-full h-24 object-cover rounded mb-1"
        loading="lazy"
      />
      {/* スポット名 */}
      <p className="font-semibold text-gray-900 leading-snug">{spot.name}</p>
      {/* カテゴリ・エリア */}
      <p className="text-xs text-gray-500 mt-0.5">
        {spot.category} · {spot.area}
      </p>
      {/* 口コミ数 */}
      <p className="text-xs text-gray-600 mt-1">
        口コミ: <span className="font-medium">{spot.reviewCount}</span> 件
      </p>
      {/* 詳細リンク */}
      <Link
        to="/reviews"
        state={{ spotId: spot.spotId, spotName: spot.name }}
        className="mt-2 inline-block text-xs font-medium text-orange-500 hover:text-orange-700 underline underline-offset-2"
      >
        口コミを見る →
      </Link>
    </div>
  )
}

// ---- メインコンポーネント ----

export function MapPage() {
  // 地図中心座標（現在地 or デフォルト）
  const [mapCenter, setMapCenter] = useState<LatLngExpression>(DEFAULT_CENTER)
  // 検索に使用する座標
  const [searchCoord, setSearchCoord] = useState<{ lat: number; lon: number }>({
    lat: 35.1815,
    lon: 136.9066,
  })
  const [radius, setRadius] = useState<number>(2000)
  const [spots, setSpots] = useState<Spot[]>([])
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [locationStatus, setLocationStatus] = useState<'pending' | 'granted' | 'denied'>('pending')

  // ---- スポット取得 ----
  const fetchSpots = useCallback(
    async (lat: number, lon: number, r: number) => {
      setLoading(true)
      setError(null)
      try {
        const res = await fetch(`/api/map/spots?lat=${lat}&lon=${lon}&radius=${r}`)
        if (!res.ok) {
          const body = await res.json().catch(() => ({}))
          throw new Error(body?.error?.message ?? `HTTP ${res.status}`)
        }
        const data = await res.json()
        setSpots(data.spots ?? [])
      } catch (err) {
        setError(err instanceof Error ? err.message : 'スポットの取得に失敗しました')
        setSpots([])
      } finally {
        setLoading(false)
      }
    },
    [],
  )

  // ---- 現在地取得（マウント時 1 回） ----
  useEffect(() => {
    if (!navigator.geolocation) {
      // Geolocation 非対応ブラウザ → デフォルト座標で検索
      setLocationStatus('denied')
      fetchSpots(searchCoord.lat, searchCoord.lon, radius)
      return
    }

    navigator.geolocation.getCurrentPosition(
      (position) => {
        const { latitude, longitude } = position.coords
        const newCenter: LatLngExpression = [latitude, longitude]
        setMapCenter(newCenter)
        setSearchCoord({ lat: latitude, lon: longitude })
        setLocationStatus('granted')
        fetchSpots(latitude, longitude, radius)
      },
      () => {
        // 拒否 or エラー → デフォルト座標で検索
        setLocationStatus('denied')
        fetchSpots(searchCoord.lat, searchCoord.lon, radius)
      },
      { timeout: 8000, maximumAge: 60000 },
    )
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []) // マウント時 1 回のみ

  // ---- 半径変更ハンドラ ----
  function handleRadiusChange(newRadius: number) {
    setRadius(newRadius)
    fetchSpots(searchCoord.lat, searchCoord.lon, newRadius)
  }

  return (
    <div className="flex flex-col h-[calc(100vh-4rem)]">

      {/* ---- ツールバー ---- */}
      <div className="bg-white border-b border-gray-200 px-4 py-2 flex items-center gap-3 flex-shrink-0 z-10">
        <span className="text-sm text-gray-600 font-medium whitespace-nowrap">検索範囲:</span>

        {/* 半径セレクター */}
        <div className="flex gap-1" role="group" aria-label="検索範囲を選択">
          {RADIUS_OPTIONS.map(({ label, value }) => (
            <button
              key={value}
              type="button"
              onClick={() => handleRadiusChange(value)}
              aria-pressed={radius === value}
              className={[
                'px-3 py-1 text-xs font-medium rounded-full border transition-colors',
                radius === value
                  ? 'bg-orange-500 border-orange-500 text-white'
                  : 'bg-white border-gray-300 text-gray-600 hover:border-orange-400 hover:text-orange-500',
              ].join(' ')}
            >
              {label}
            </button>
          ))}
        </div>

        {/* 位置情報ステータス */}
        {locationStatus === 'denied' && (
          <span className="ml-auto text-xs text-gray-400 whitespace-nowrap">
            📍 栄（デフォルト）
          </span>
        )}
        {locationStatus === 'granted' && (
          <span className="ml-auto text-xs text-green-600 whitespace-nowrap">
            📍 現在地
          </span>
        )}

        {/* ローディングインジケーター */}
        {loading && <LoadingSpinner size="sm" className="ml-auto" />}
      </div>

      {/* ---- エラーバナー ---- */}
      {error && (
        <div
          role="alert"
          className="px-4 py-2 bg-red-50 border-b border-red-200 text-sm text-red-700 flex-shrink-0"
        >
          ⚠️ {error}
        </div>
      )}

      {/* ---- 地図 ---- */}
      <div className="flex-1 relative">
        {/* 地図上ローディングオーバーレイ（初回ロード中） */}
        {loading && spots.length === 0 && (
          <div className="absolute inset-0 z-[1000] bg-white/70 flex flex-col items-center justify-center gap-3">
            <LoadingSpinner size="lg" />
            <p className="text-sm text-gray-500">スポットを読み込み中…</p>
          </div>
        )}

        <MapContainer
          center={DEFAULT_CENTER}
          zoom={DEFAULT_ZOOM}
          className="h-full w-full"
          // タイル読み込み中に白地図を表示しないためのオプション
          preferCanvas={false}
        >
          {/* OpenStreetMap タイル */}
          <TileLayer
            url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
            attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
          />

          {/* 地図中心の動的更新（useMap() を使うため MapContainer 内に配置） */}
          <MapController center={mapCenter} />

          {/* スポットマーカー */}
          {spots.map((spot) => (
            <Marker
              key={spot.spotId}
              position={[spot.lat, spot.lon] as LatLngExpression}
            >
              <Popup maxWidth={200} autoPan>
                <SpotPopup spot={spot} />
              </Popup>
            </Marker>
          ))}
        </MapContainer>
      </div>

      {/* ---- フッター情報 ---- */}
      {!loading && !error && (
        <div className="bg-white border-t border-gray-100 px-4 py-1.5 text-xs text-gray-400 flex-shrink-0 text-right">
          {spots.length > 0
            ? `${spots.length} 件のスポットを表示中`
            : '範囲内にスポットがありません'}
        </div>
      )}
    </div>
  )
}
