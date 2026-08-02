// src/features/map/PhotoPin.tsx
// マップ上の口コミ写真ピンコンポーネント
// Requirements: 5.1, 5.2, 5.3, 5.5, 5.6, 5.7, 8.2, 8.3

import { useEffect, useRef, useState } from 'react'
import { Link } from 'react-router-dom'
import L from 'leaflet'
import { Marker, Popup } from 'react-leaflet'
import type { Review } from '../../mocks/data/types'

// ---- PhotoChipHtml ----
// DivIcon の html プロパティに渡す HTML 文字列を生成する純粋関数
// renderToStaticMarkup では onerror のようなインラインイベント属性が使えないため、
// 文字列で直接 HTML を組み立てる方式を採用する

const ORANGE_DOT_HTML =
  '<div class="w-10 h-10 rounded-full bg-orange-500 border-2 border-white shadow-md"></div>'

function buildIconHtml(review: Review): string {
  const { photoUrls, spotName } = review

  if (photoUrls.length > 0) {
    // onerror 属性で: 画像読み込み失敗時に img を非表示 → 次の sibling のオレンジドットを表示
    // Requirements 5.1, 5.2, 5.3, 8.2
    const escapedSrc = photoUrls[0].replace(/"/g, '&quot;')
    const escapedAlt = `${spotName} の口コミ写真`.replace(/"/g, '&quot;')
    const onerror =
      "this.style.display='none';if(this.nextElementSibling){this.nextElementSibling.style.display='block'}"
    return (
      `<img src="${escapedSrc}" alt="${escapedAlt}" ` +
      `class="w-10 h-10 rounded-full object-cover border-2 border-white shadow-md" ` +
      `onerror="${onerror}" />` +
      // フォールバック用オレンジドット（初期非表示）
      `<div class="w-10 h-10 rounded-full bg-orange-500 border-2 border-white shadow-md" style="display:none"></div>`
    )
  }

  // photoUrls が空の場合はオレンジドット（Requirements 5.7）
  return ORANGE_DOT_HTML
}

// ---- ReviewPopupContent ----
// Popup 内に表示するレビュー情報コンポーネント

interface ReviewPopupContentProps {
  review: Review
}

function ReviewPopupContent({ review }: ReviewPopupContentProps) {
  const { reviewId, spotName, text, likeCount } = review
  const truncatedText = text.slice(0, 60) + (text.length > 60 ? '…' : '')

  const popupRef = useRef<HTMLDivElement>(null)

  // role="dialog" を useEffect で DOM 操作して設定する
  // Leaflet の Popup コンテナ（.leaflet-popup-content-wrapper）に role を付与
  // Requirements 8.3
  useEffect(() => {
    if (!popupRef.current) return

    // .leaflet-popup-content-wrapper を探して role="dialog" を設定する
    const wrapper = popupRef.current.closest('.leaflet-popup-content-wrapper')
    if (wrapper) {
      wrapper.setAttribute('role', 'dialog')
      wrapper.setAttribute('aria-label', `${spotName} の口コミ`)
    }

    // ポップアップ内の最初のフォーカス可能要素にフォーカスを移動（Requirements 8.3）
    const focusable = popupRef.current.querySelector<HTMLElement>(
      'a, button, [tabindex]:not([tabindex="-1"])',
    )
    if (focusable) {
      // 次フレームでフォーカスを移動する（Leaflet のアニメーション完了後）
      const timerId = setTimeout(() => {
        focusable.focus()
      }, 100)
      return () => clearTimeout(timerId)
    }
  }, [spotName])

  return (
    <div ref={popupRef} className="w-44 text-sm">
      {/* spotName（太字）— Requirements 5.5 */}
      <p className="font-bold text-gray-900 leading-snug mb-1">{spotName}</p>

      {/* 本文 60 文字 — Requirements 5.5 */}
      <p className="text-xs text-gray-600 leading-snug mb-1">{truncatedText}</p>

      {/* likeCount — Requirements 5.5 */}
      <p className="text-xs text-gray-500 mb-2">
        いいね: <span className="font-medium">{likeCount}</span>
      </p>

      {/* 口コミを見るリンク — Requirements 5.6 */}
      <Link
        to={`/reviews/${reviewId}`}
        className="inline-block text-xs font-medium text-orange-500 hover:text-orange-700 underline underline-offset-2"
      >
        口コミを見る
      </Link>
    </div>
  )
}

// ---- PhotoPin ----
// マーカー本体コンポーネント

export interface PhotoPinProps {
  review: Review
}

export function PhotoPin({ review }: PhotoPinProps) {
  // buildIconHtml で HTML 文字列を生成（onerror 属性も含む）
  // Requirements 5.1, 5.7
  const [iconHtml] = useState(() => buildIconHtml(review))

  const icon = L.divIcon({
    html: iconHtml,
    className: '', // Leaflet デフォルトスタイルを除去（Requirements 5.2, 5.3）
    iconSize: [40, 40],
    iconAnchor: [20, 20], // アイコン中心をピン座標に合わせる
  })

  // Popup の eventHandlers でフォーカス移動のトリガーを設定
  // ReviewPopupContent 内の useEffect でフォーカスを制御する
  const popupEventHandlers = {
    add: () => {
      // ポップアップが DOM に追加されたタイミングで
      // ReviewPopupContent の useEffect が発火してフォーカスが移動する
    },
  }

  return (
    <Marker
      position={[review.lat, review.lon]}
      icon={icon}
    >
      <Popup
        maxWidth={200}
        autoPan
        eventHandlers={popupEventHandlers}
      >
        <ReviewPopupContent review={review} />
      </Popup>
    </Marker>
  )
}
