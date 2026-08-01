// src/features/map/MapPage.tsx
// マップ画面 — 周辺スポットを地図上に表示
//
// - Geolocation API で現在地を取得。拒否時は栄（デフォルト座標）を使用
// - GET /api/map/spots で固定半径（2km）のスポットを取得し Marker + Popup で表示

import { useCallback, useEffect, useRef, useState } from 'react'
import { Link } from 'react-router-dom'
import { MapPin, AlertTriangle } from 'lucide-react'
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

/** 固定検索半径（メートル） */
const FIXED_RADIUS = 2000

// ---- 内部コンポーネント ----

function MapController({ center }: { center: LatLngExpression }) {
  const map = useMap()
  const prevCenterRef = useRef<LatLngExpression | null>(null)

  useEffect(() => {
    const [lat, lon] = center as [number, number]
    const prev = prevCenterRef.current as [number, number] | null
    if (prev && prev[0] === lat && prev[1] === lon) return

    map.setView(center, map.getZoom())
    prevCenterRef.current = center
  }, [center, map])

  return null
}

function SpotPopup({ spot }: { spot: Spot }) {
  return (
    <div className="w-44 text-sm">
      <img
        src={spot.thumbnailUrl}
        alt={spot.name}
        className="w-full h-24 object-cover rounded mb-1"
        loading="lazy"
      />
      <p className="font-semibold text-gray-900 leading-snug">{spot.name}</p>
      <p className="text-xs text-gray-500 mt-0.5">
        {spot.category} · {spot.area}
      </p>
      <p className="text-xs text-gray-600 mt-1">
        口コミ: <span className="font-medium">{spot.reviewCount}</span> 件
      </p>
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
  const [mapCenter, setMapCenter] = useState<LatLngExpression>(DEFAULT_CENTER)
  const [searchCoord, setSearchCoord] = useState<{ lat: number; lon: number }>({
    lat: 35.1815,
    lon: 136.9066,
  })
  const [spots, setSpots] = useState<Spot[]>([])
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [locationStatus, setLocationStatus] = useState<'pending' | 'granted' | 'denied'>('pending')

  // ---- スポット取得 ----
  const fetchSpots = useCallback(async (lat: number, lon: number) => {
    setLoading(true)
    setError(null)
    try {
      const res = await fetch(`/api/map/spots?lat=${lat}&lon=${lon}&radius=${FIXED_RADIUS}`)
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
  }, [])

  // ---- 現在地取得（マウント時 1 回） ----
  useEffect(() => {
    if (!navigator.geolocation) {
      setLocationStatus('denied')
      fetchSpots(searchCoord.lat, searchCoord.lon)
      return
    }

    navigator.geolocation.getCurrentPosition(
      (position) => {
        const { latitude, longitude } = position.coords
        setMapCenter([latitude, longitude])
        setSearchCoord({ lat: latitude, lon: longitude })
        setLocationStatus('granted')
        fetchSpots(latitude, longitude)
      },
      () => {
        setLocationStatus('denied')
        fetchSpots(searchCoord.lat, searchCoord.lon)
      },
      { timeout: 8000, maximumAge: 60000 },
    )
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  return (
    <div className="flex flex-col h-[calc(100vh-4rem)]">

      {/* ---- ステータスバー ---- */}
      <div className="bg-white border-b border-gray-200 px-4 py-2 flex items-center flex-shrink-0 z-10">
        {locationStatus === 'denied' && (
          <span className="flex items-center gap-1 text-xs text-gray-400">
            <MapPin className="w-3.5 h-3.5" aria-hidden="true" />
            栄（デフォルト）
          </span>
        )}
        {locationStatus === 'granted' && (
          <span className="flex items-center gap-1 text-xs text-green-600">
            <MapPin className="w-3.5 h-3.5" aria-hidden="true" />
            現在地
          </span>
        )}
        {loading && <LoadingSpinner size="sm" className="ml-auto" />}
      </div>

      {/* ---- エラーバナー ---- */}
      {error && (
        <div
          role="alert"
          className="px-4 py-2 bg-red-50 border-b border-red-200 text-sm text-red-700 flex-shrink-0 flex items-center gap-1.5"
        >
          <AlertTriangle className="w-4 h-4 flex-shrink-0" aria-hidden="true" />
          {error}
        </div>
      )}

      {/* ---- 地図 ---- */}
      <div className="flex-1">
        {loading && spots.length === 0 && (
          <div className="fixed inset-0 z-40 bg-white/70 flex flex-col items-center justify-center gap-3 pointer-events-none">
            <LoadingSpinner size="lg" />
            <p className="text-sm text-gray-500">スポットを読み込み中…</p>
          </div>
        )}

        <MapContainer
          center={DEFAULT_CENTER}
          zoom={DEFAULT_ZOOM}
          className="h-full w-full"
          preferCanvas={false}
        >
          <TileLayer
            url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
            attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
          />
          <MapController center={mapCenter} />
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
