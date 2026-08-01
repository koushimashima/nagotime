// src/features/map/MapPage.tsx
// マップ画面 — 周辺スポットを地図上に表示
//
// - Geolocation API で現在地を取得。拒否時は栄（デフォルト座標）を使用
// - GET /api/map/spots で固定半径（2km）のスポットを取得し Marker + Popup で表示

import { useCallback, useEffect, useRef, useState } from 'react'
import { Link } from 'react-router-dom'
import { AlertTriangle, LocateFixed } from 'lucide-react'
import {
  MapContainer,
  TileLayer,
  Marker,
  Popup,
  CircleMarker,
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

function MapController({
  center,
  onMapMoved,
}: {
  center: LatLngExpression
  onMapMoved: (lat: number, lon: number) => void
}) {
  const map = useMap()
  const prevCenterRef = useRef<LatLngExpression | null>(null)

  // プログラム的な中心移動
  useEffect(() => {
    const [lat, lon] = center as [number, number]
    const prev = prevCenterRef.current as [number, number] | null
    if (prev && prev[0] === lat && prev[1] === lon) return

    map.setView(center, map.getZoom())
    prevCenterRef.current = center
  }, [center, map])

  // ユーザーがマップをドラッグ・ズームして移動したとき
  useEffect(() => {
    const handleMoveEnd = () => {
      const c = map.getCenter()
      onMapMoved(c.lat, c.lng)
    }
    map.on('moveend', handleMoveEnd)
    return () => {
      map.off('moveend', handleMoveEnd)
    }
  }, [map, onMapMoved])

  return null
}

/** 現在地ボタン（地図内に重ねて表示） */
function LocateButton({
  onLocate,
  locating,
}: {
  onLocate: () => void
  locating: boolean
}) {
  return (
    <div className="absolute bottom-20 right-4 z-[1000]">
      <button
        onClick={onLocate}
        disabled={locating}
        aria-label="現在地に移動"
        className="bg-white rounded-full w-12 h-12 flex items-center justify-center shadow-lg border border-gray-200 hover:bg-gray-50 active:scale-95 transition-transform disabled:opacity-50"
      >
        {locating ? (
          <LoadingSpinner size="sm" />
        ) : (
          <LocateFixed className="w-6 h-6 text-blue-600" aria-hidden="true" />
        )}
      </button>
    </div>
  )
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
  // マップ中心座標（スポット検索に使う）
  const [searchCoord, setSearchCoord] = useState<{ lat: number; lon: number }>({
    lat: (DEFAULT_CENTER as [number, number])[0],
    lon: (DEFAULT_CENTER as [number, number])[1],
  })
  // 現在地の実際の座標（取得できた場合のみ設定）
  const [userCoord, setUserCoord] = useState<{ lat: number; lon: number } | null>(null)
  const [spots, setSpots] = useState<Spot[]>([])
  const [loading, setLoading] = useState(false)
  const [locating, setLocating] = useState(false)
  const [error, setError] = useState<string | null>(null)
  // 「この範囲を検索」ボタン用：表示中心と検索済み座標が異なるか
  const [pendingSearch, setPendingSearch] = useState(false)

  // ---- スポット取得 ----
  const fetchSpots = useCallback(async (lat: number, lon: number) => {
    setLoading(true)
    setError(null)
    setPendingSearch(false)
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

  // ---- 現在地取得の共通処理 ----
  const locateUser = useCallback(
    (onSuccess?: () => void) => {
      if (!navigator.geolocation) {
        return
      }
      setLocating(true)
      navigator.geolocation.getCurrentPosition(
        (position) => {
          const { latitude, longitude } = position.coords
          setUserCoord({ lat: latitude, lon: longitude })
          setMapCenter([latitude, longitude])
          setSearchCoord({ lat: latitude, lon: longitude })
          setLocating(false)
          onSuccess?.()
          fetchSpots(latitude, longitude)
        },
        () => {
          setLocating(false)
        },
        { timeout: 8000, maximumAge: 10000 },
      )
    },
    [fetchSpots],
  )

  // ---- 現在地取得（マウント時 1 回） ----
  useEffect(() => {
    if (!navigator.geolocation) {
      fetchSpots(
        (DEFAULT_CENTER as [number, number])[0],
        (DEFAULT_CENTER as [number, number])[1],
      )
      return
    }
    locateUser(() => {
      // 初回取得成功時の追加処理があれば記述
    })
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  // ---- マップ移動ハンドラー ----
  const handleMapMoved = useCallback((lat: number, lon: number) => {
    setSearchCoord((prev) => {
      const moved = Math.abs(prev.lat - lat) > 0.0001 || Math.abs(prev.lon - lon) > 0.0001
      if (moved) setPendingSearch(true)
      return { lat, lon }
    })
  }, [])

  // ---- 「この範囲を検索」ボタン ----
  const handleSearchHere = useCallback(() => {
    fetchSpots(searchCoord.lat, searchCoord.lon)
  }, [fetchSpots, searchCoord])

  // ---- 現在地ボタン ----
  const handleLocateButton = useCallback(() => {
    locateUser()
  }, [locateUser])

  return (
    <div className="flex flex-col h-[calc(100vh-4rem)]">

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
      <div className="flex-1 relative">
        {/* この範囲を検索ボタン */}
        {pendingSearch && !loading && (
          <div className="absolute top-3 left-1/2 -translate-x-1/2 z-[1000]">
            <button
              onClick={handleSearchHere}
              className="bg-white text-orange-600 border border-orange-400 text-sm font-medium px-4 py-1.5 rounded-full shadow-md hover:bg-orange-50 active:scale-95 transition-transform"
            >
              この範囲を検索
            </button>
          </div>
        )}

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
          zoomControl={false}
          preferCanvas={false}
        >
          <TileLayer
            url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
            attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
          />
          <MapController center={mapCenter} onMapMoved={handleMapMoved} />

          {/* 現在地マーク（青い点 + 外縁リング） */}
          {userCoord && (
            <>
              {/* 精度リング */}
              <CircleMarker
                center={[userCoord.lat, userCoord.lon]}
                radius={16}
                pathOptions={{
                  color: '#3b82f6',
                  fillColor: '#3b82f6',
                  fillOpacity: 0.12,
                  weight: 1,
                }}
              />
              {/* 現在地の点 */}
              <CircleMarker
                center={[userCoord.lat, userCoord.lon]}
                radius={7}
                pathOptions={{
                  color: '#ffffff',
                  fillColor: '#3b82f6',
                  fillOpacity: 1,
                  weight: 2.5,
                }}
              >
                <Popup>現在地</Popup>
              </CircleMarker>
            </>
          )}

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

        {/* 現在地ボタン（地図右下） */}
        <LocateButton onLocate={handleLocateButton} locating={locating} />
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
