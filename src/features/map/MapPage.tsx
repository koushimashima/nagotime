// src/features/map/MapPage.tsx
// マップ画面 — フィード口コミを写真ピンとして地図上に表示
//
// - useRecommendContext() から sharedReviews を取得して PhotoPin で表示する
// - Geolocation API で現在地を取得。拒否時は栄（デフォルト座標）を使用
// - sharedReviews が空のとき「現在の条件に一致する口コミがありません」を地図オーバーレイとして表示
// Requirements: 4.3, 4.4, 5.1〜5.7

import { useCallback, useEffect, useRef, useState } from 'react'
import { LocateFixed } from 'lucide-react'
import {
  MapContainer,
  TileLayer,
  CircleMarker,
  Popup,
  useMap,
} from 'react-leaflet'
import type { LatLngExpression } from 'leaflet'
import { LoadingSpinner } from '../../components/LoadingSpinner'
import { ContextFilterBar } from '../../components/ContextFilterBar'
import { useRecommendContext } from '../../contexts/RecommendContext'
import { PhotoPin } from './PhotoPin'

// ---- 定数 ----

/** 栄（名古屋市中心部）デフォルト座標 */
const DEFAULT_CENTER: LatLngExpression = [35.1815, 136.9066]
const DEFAULT_ZOOM = 14

// ---- 内部コンポーネント ----

function MapController({
  center,
  flyToTrigger,
}: {
  center: LatLngExpression
  flyToTrigger: number
}) {
  const map = useMap()
  const prevCenterRef = useRef<[number, number] | null>(null)
  const prevTriggerRef = useRef<number>(0)

  // プログラム的な中心移動
  useEffect(() => {
    const [lat, lon] = center as [number, number]
    const prev = prevCenterRef.current
    const isForcedFly = flyToTrigger !== prevTriggerRef.current

    // 座標が同じかつ強制フライでなければスキップ
    if (!isForcedFly && prev && prev[0] === lat && prev[1] === lon) return

    map.flyTo(center, map.getZoom(), { duration: 0.8 })
    // 値をコピーして保存（参照を共有しない）
    prevCenterRef.current = [lat, lon]
    prevTriggerRef.current = flyToTrigger
  }, [center, flyToTrigger, map])

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
    <div className="absolute bottom-20 right-4 z-[1000] md:bottom-4">
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

// ---- メインコンポーネント ----

export function MapPage() {
  const [mapCenter, setMapCenter] = useState<LatLngExpression>(DEFAULT_CENTER)
  // 現在地の実際の座標（取得できた場合のみ設定）
  const [userCoord, setUserCoord] = useState<{ lat: number; lon: number } | null>(null)
  const [locating, setLocating] = useState(false)
  // 現在地ボタン押下で強制 flyTo するためのカウンター
  const [flyToTrigger, setFlyToTrigger] = useState(0)

  // フィード・マップ間で共有された口コミリスト（Requirements 4.3）
  const { sharedReviews } = useRecommendContext()

  // ---- 現在地取得の共通処理 ----
  const locateUser = useCallback(() => {
    if (!navigator.geolocation) {
      return
    }
    setLocating(true)
    navigator.geolocation.getCurrentPosition(
      (position) => {
        const { latitude, longitude } = position.coords
        setUserCoord({ lat: latitude, lon: longitude })
        setMapCenter([latitude, longitude])
        setFlyToTrigger((n) => n + 1)
        setLocating(false)
      },
      () => {
        setLocating(false)
      },
      { timeout: 8000, maximumAge: 10000 },
    )
  }, [])

  // ---- 現在地取得（マウント時 1 回） ----
  useEffect(() => {
    locateUser()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  // ---- 現在地ボタン ----
  const handleLocateButton = useCallback(() => {
    locateUser()
  }, [locateUser])

  return (
    <div className="flex flex-col h-[calc(100vh-4rem)]">

      {/* ---- コンテキストフィルタバー ---- */}
      <div className="bg-white border-b border-gray-200 flex-shrink-0">
        <ContextFilterBar />
      </div>

      {/* ---- 地図 ---- */}
      <div className="flex-1 relative">

        {/* 空リスト時オーバーレイ（Requirements 4.4） */}
        {sharedReviews.length === 0 && (
          <div className="absolute inset-0 z-[999] flex items-center justify-center pointer-events-none">
            <div className="bg-white/90 backdrop-blur-sm rounded-xl px-6 py-4 shadow-lg text-center pointer-events-auto">
              <p className="text-sm font-medium text-gray-600">
                現在の条件に一致する口コミがありません
              </p>
            </div>
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
          <MapController center={mapCenter} flyToTrigger={flyToTrigger} />

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

          {/* 口コミ写真ピン表示（Requirements 4.3, 5.1〜5.7） */}
          {sharedReviews.map((review) => (
            <PhotoPin key={review.reviewId} review={review} />
          ))}
        </MapContainer>

        {/* 現在地ボタン（地図右下） */}
        <LocateButton onLocate={handleLocateButton} locating={locating} />
      </div>

      {/* ---- フッター情報（Requirements 4.3） ---- */}
      <div className="bg-white border-t border-gray-100 px-4 py-1.5 text-xs text-gray-400 flex-shrink-0 text-right">
        {sharedReviews.length > 0
          ? `${sharedReviews.length} 件の口コミを表示中`
          : '現在の条件に一致する口コミがありません'}
      </div>
    </div>
  )
}
