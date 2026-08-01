// src/features/submit/SubmitPage.tsx
// 口コミ投稿画面（Requirements 1.1〜1.14）
//
// - テキストエリア: リアルタイム文字数カウンター（50〜1000文字）
// - 写真アップロード: ドラッグ&ドロップ + クリック選択（1〜5枚）
// - スポット名入力（1〜100文字）
// - 「現在地を取得」ボタン（Geolocation API）
// - バリデーションエラーをフィールド下にインライン表示
// - POST /api/reviews → 成功時 addMiles(10) → navigate('/')

import { useRef, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { useAuth } from '../../contexts/AuthContext'
import { useMile } from '../../contexts/MileContext'
import { validateTextLength, validatePhotoCount, validateCoordinates, validateSpotName } from '../../utils/validators'
import {
  TEXT_LENGTH_ERROR,
  PHOTO_COUNT_ERROR,
  COORDINATES_ERROR,
  SPOT_NAME_ERROR,
  ERROR_LOCATION_MISSING,
} from '../../utils/errorMessages'
import { getTimeSlot, getDayType } from '../../utils/timeUtils'
import { LoadingSpinner } from '../../components/LoadingSpinner'

// ---- 型定義 ----

interface FormErrors {
  text?: string
  photos?: string
  spotName?: string
  location?: string
  submit?: string
}

// ---- コンポーネント ----

export function SubmitPage() {
  const navigate = useNavigate()
  const { user } = useAuth()
  const { addMiles } = useMile()

  // ---- フォーム状態 ----
  const [text, setText] = useState('')
  const [photos, setPhotos] = useState<File[]>([])
  const [photoPreviews, setPhotoPreviews] = useState<string[]>([])
  const [spotName, setSpotName] = useState('')
  const [lat, setLat] = useState<number | null>(null)
  const [lon, setLon] = useState<number | null>(null)
  const [errors, setErrors] = useState<FormErrors>({})
  const [submitting, setSubmitting] = useState(false)
  const [geoLoading, setGeoLoading] = useState(false)
  const [isDragging, setIsDragging] = useState(false)

  // ファイル入力の ref（非表示 input をラベルからトリガー）
  const fileInputRef = useRef<HTMLInputElement>(null)

  // ---- 写真追加ロジック ----
  function addPhotoFiles(files: File[]) {
    const imageFiles = files.filter((f) => f.type.startsWith('image/'))
    const combined = [...photos, ...imageFiles].slice(0, 5)

    // プレビュー URL を生成
    const newPreviews = combined.map((f, i) => {
      // すでに生成済みのものはそのまま使う
      if (i < photos.length && photos[i] === f) return photoPreviews[i]
      return URL.createObjectURL(f)
    })

    setPhotos(combined)
    setPhotoPreviews(newPreviews)

    // エラーをクリア（1枚以上あれば）
    if (combined.length >= 1) {
      setErrors((prev) => ({ ...prev, photos: undefined }))
    }
  }

  function handleFileChange(e: React.ChangeEvent<HTMLInputElement>) {
    if (!e.target.files) return
    addPhotoFiles(Array.from(e.target.files))
    // 同じファイルを再選択できるように value をリセット
    e.target.value = ''
  }

  function handleRemovePhoto(index: number) {
    // プレビュー URL を解放
    URL.revokeObjectURL(photoPreviews[index])
    setPhotos((prev) => prev.filter((_, i) => i !== index))
    setPhotoPreviews((prev) => prev.filter((_, i) => i !== index))
  }

  // ---- ドラッグ&ドロップ ----
  function handleDragOver(e: React.DragEvent) {
    e.preventDefault()
    setIsDragging(true)
  }

  function handleDragLeave() {
    setIsDragging(false)
  }

  function handleDrop(e: React.DragEvent) {
    e.preventDefault()
    setIsDragging(false)
    const files = Array.from(e.dataTransfer.files)
    addPhotoFiles(files)
  }

  // ---- 現在地取得 ----
  function handleGetLocation() {
    if (!navigator.geolocation) {
      setErrors((prev) => ({ ...prev, location: ERROR_LOCATION_MISSING }))
      return
    }

    setGeoLoading(true)
    setErrors((prev) => ({ ...prev, location: undefined }))

    navigator.geolocation.getCurrentPosition(
      (position) => {
        setLat(position.coords.latitude)
        setLon(position.coords.longitude)
        setGeoLoading(false)
      },
      () => {
        // 取得失敗（Requirements 1.12）
        setErrors((prev) => ({ ...prev, location: ERROR_LOCATION_MISSING }))
        setGeoLoading(false)
      },
    )
  }

  // ---- バリデーション ----
  function validate(): boolean {
    const newErrors: FormErrors = {}

    // テキスト（Requirements 1.2, 1.8）
    if (!validateTextLength(text)) {
      newErrors.text = TEXT_LENGTH_ERROR
    }

    // 写真枚数（Requirements 1.3, 1.9）
    if (!validatePhotoCount(photos.length)) {
      newErrors.photos = PHOTO_COUNT_ERROR
    }

    // スポット名（Requirements 1.7, 1.10）
    if (!validateSpotName(spotName)) {
      newErrors.spotName = SPOT_NAME_ERROR
    }

    // 位置情報（Requirements 1.7, 1.10, 1.12）
    if (lat === null || lon === null) {
      newErrors.location = ERROR_LOCATION_MISSING
    } else if (!validateCoordinates(lat, lon)) {
      newErrors.location = COORDINATES_ERROR
    }

    setErrors(newErrors)
    return Object.keys(newErrors).length === 0
  }

  // ---- 送信ハンドラー ----
  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()

    if (!validate()) return
    if (!user) {
      navigate('/login')
      return
    }

    setSubmitting(true)
    setErrors((prev) => ({ ...prev, submit: undefined }))

    const now = new Date()
    const timeSlot = getTimeSlot(now)
    const dayType = getDayType(now)

    // photoUrls: デモなので picsum.photos の seed ベース URL に変換
    const photoUrls = photos.map(
      (_, i) => `https://picsum.photos/seed/${user.userId}-${Date.now()}-${i}/400/300`,
    )

    const requestBody = {
      userId: user.userId,
      spotName,
      lat: lat!,
      lon: lon!,
      text,
      photoUrls,
      weather: 'UNKNOWN',
      timeSlot,
      dayType,
    }

    try {
      const res = await fetch('/api/reviews', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer mock-jwt-token-${user.userId}-${Date.now()}`,
        },
        body: JSON.stringify(requestBody),
      })

      if (!res.ok) {
        const data = await res.json().catch(() => null)
        const message =
          data?.error?.message ?? '投稿に失敗しました。もう一度お試しください。'
        setErrors((prev) => ({ ...prev, submit: message }))
        setSubmitting(false)
        return
      }

      // 成功時: マイル付与（Requirements 1.13, 1.14）
      try {
        addMiles(10)
      } catch {
        // マイル付与失敗でも投稿は維持（Requirements 1.14）
        console.warn('マイル付与に失敗しました')
      }

      // フィードにリダイレクト
      navigate('/')
    } catch {
      setErrors((prev) => ({
        ...prev,
        submit: 'ネットワークエラーが発生しました。もう一度お試しください。',
      }))
      setSubmitting(false)
    }
  }

  // ---- レンダリング ----
  const charCount = text.length
  const isOverLimit = charCount > 1000
  const isUnderMin = charCount > 0 && charCount < 50

  return (
    <div className="min-h-screen bg-gray-50 pb-20">

      {/* ---- ヘッダー ---- */}
      <div className="bg-white border-b border-gray-200 px-4 py-3 sticky top-0 z-10 flex items-center gap-3">
        <button
          type="button"
          onClick={() => navigate(-1)}
          aria-label="前のページに戻る"
          className="p-1.5 rounded-full hover:bg-gray-100 transition-colors text-gray-600"
        >
          <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" aria-hidden="true">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
          </svg>
        </button>
        <h1 className="text-base font-semibold text-gray-900">口コミを投稿</h1>
      </div>

      {/* ---- フォーム ---- */}
      <form onSubmit={handleSubmit} noValidate className="max-w-2xl mx-auto px-4 py-5 space-y-6">

        {/* ---- スポット名 ---- */}
        <div>
          <label htmlFor="spotName" className="block text-sm font-medium text-gray-700 mb-1">
            スポット名 <span className="text-red-500">*</span>
          </label>
          <input
            id="spotName"
            type="text"
            value={spotName}
            onChange={(e) => {
              setSpotName(e.target.value)
              if (validateSpotName(e.target.value)) {
                setErrors((prev) => ({ ...prev, spotName: undefined }))
              }
            }}
            placeholder="例: 名古屋テレビ塔"
            maxLength={100}
            aria-describedby={errors.spotName ? 'spotName-error' : undefined}
            aria-invalid={!!errors.spotName}
            className={`w-full px-3 py-2.5 border rounded-lg text-sm
              focus:outline-none focus:ring-2 focus:ring-orange-400 focus:border-transparent
              placeholder-gray-400 transition-colors
              ${errors.spotName ? 'border-red-400 bg-red-50' : 'border-gray-300 bg-white hover:border-gray-400'}`}
          />
          {errors.spotName && (
            <p id="spotName-error" role="alert" className="mt-1 text-xs text-red-600">
              {errors.spotName}
            </p>
          )}
        </div>

        {/* ---- 位置情報 ---- */}
        <div>
          <p className="block text-sm font-medium text-gray-700 mb-1">
            位置情報 <span className="text-red-500">*</span>
          </p>
          <div className="flex items-center gap-3">
            <button
              type="button"
              onClick={handleGetLocation}
              disabled={geoLoading}
              className="flex items-center gap-2 px-4 py-2.5 bg-orange-500 hover:bg-orange-600
                         active:bg-orange-700 disabled:opacity-60 disabled:cursor-wait
                         text-white text-sm font-medium rounded-lg transition-colors
                         focus:outline-none focus:ring-2 focus:ring-orange-400 focus:ring-offset-2"
            >
              {geoLoading ? (
                <>
                  <LoadingSpinner size="sm" />
                  <span>取得中…</span>
                </>
              ) : (
                <>
                  <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" aria-hidden="true">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
                      d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z" />
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
                      d="M15 11a3 3 0 11-6 0 3 3 0 016 0z" />
                  </svg>
                  <span>現在地を取得</span>
                </>
              )}
            </button>

            {/* 取得済み座標の表示 */}
            {lat !== null && lon !== null && !errors.location && (
              <span className="text-xs text-green-700 bg-green-50 border border-green-200 rounded-full px-2.5 py-1">
                ✓ 位置情報を取得済み
              </span>
            )}
          </div>

          {errors.location && (
            <p id="location-error" role="alert" className="mt-1 text-xs text-red-600">
              {errors.location}
            </p>
          )}

          {lat !== null && lon !== null && (
            <p className="mt-1 text-xs text-gray-400">
              緯度: {lat.toFixed(6)}　経度: {lon.toFixed(6)}
            </p>
          )}
        </div>

        {/* ---- 口コミテキスト ---- */}
        <div>
          <div className="flex items-center justify-between mb-1">
            <label htmlFor="reviewText" className="text-sm font-medium text-gray-700">
              口コミテキスト <span className="text-red-500">*</span>
            </label>
            <span
              className={`text-xs tabular-nums font-medium ${
                isOverLimit
                  ? 'text-red-600'
                  : isUnderMin
                  ? 'text-amber-600'
                  : charCount >= 50
                  ? 'text-green-600'
                  : 'text-gray-400'
              }`}
              aria-live="polite"
              aria-label={`現在 ${charCount} 文字 / 最大 1000 文字`}
            >
              {charCount} / 1000
            </span>
          </div>

          <textarea
            id="reviewText"
            value={text}
            onChange={(e) => {
              setText(e.target.value)
              if (validateTextLength(e.target.value)) {
                setErrors((prev) => ({ ...prev, text: undefined }))
              }
            }}
            placeholder="このスポットの魅力を50文字以上で教えてください。雰囲気・おすすめポイント・行った時の状況など、詳しく書くと他のユーザーの参考になります。"
            rows={5}
            aria-describedby={errors.text ? 'text-error' : undefined}
            aria-invalid={!!errors.text}
            className={`w-full px-3 py-2.5 border rounded-lg text-sm resize-none
              focus:outline-none focus:ring-2 focus:ring-orange-400 focus:border-transparent
              placeholder-gray-400 transition-colors leading-relaxed
              ${errors.text ? 'border-red-400 bg-red-50' : 'border-gray-300 bg-white hover:border-gray-400'}`}
          />

          {/* 進捗バー */}
          <div className="mt-1.5 h-1 bg-gray-200 rounded-full overflow-hidden">
            <div
              className={`h-full rounded-full transition-all ${
                isOverLimit ? 'bg-red-500' : charCount >= 50 ? 'bg-green-500' : 'bg-orange-400'
              }`}
              style={{ width: `${Math.min((charCount / 1000) * 100, 100)}%` }}
              aria-hidden="true"
            />
          </div>

          {errors.text && (
            <p id="text-error" role="alert" className="mt-1 text-xs text-red-600">
              {errors.text}
            </p>
          )}
        </div>

        {/* ---- 写真アップロード ---- */}
        <div>
          <p className="block text-sm font-medium text-gray-700 mb-1">
            写真 <span className="text-red-500">*</span>
            <span className="text-gray-400 font-normal ml-1.5">（1〜5枚）</span>
          </p>

          {/* ドロップゾーン */}
          {photos.length < 5 && (
            <div
              onDragOver={handleDragOver}
              onDragLeave={handleDragLeave}
              onDrop={handleDrop}
              className={`relative border-2 border-dashed rounded-xl p-6 text-center cursor-pointer
                transition-colors
                ${isDragging
                  ? 'border-orange-400 bg-orange-50'
                  : errors.photos
                  ? 'border-red-300 bg-red-50 hover:border-red-400'
                  : 'border-gray-300 bg-white hover:border-orange-400 hover:bg-orange-50'
                }`}
            >
              <label
                htmlFor="photoInput"
                className="flex flex-col items-center gap-2 cursor-pointer"
                aria-label="写真を選択またはドロップ"
              >
                <svg
                  className={`w-10 h-10 ${isDragging ? 'text-orange-500' : 'text-gray-300'}`}
                  fill="none"
                  viewBox="0 0 24 24"
                  stroke="currentColor"
                  aria-hidden="true"
                >
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5}
                    d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" />
                </svg>
                <span className="text-sm text-gray-500">
                  {isDragging
                    ? 'ここにドロップ'
                    : <>
                        <span className="text-orange-500 font-medium">クリックして選択</span>
                        <span>またはドラッグ&ドロップ</span>
                      </>
                  }
                </span>
                <span className="text-xs text-gray-400">
                  あと {5 - photos.length} 枚追加できます
                </span>
              </label>

              <input
                ref={fileInputRef}
                id="photoInput"
                type="file"
                multiple
                accept="image/*"
                onChange={handleFileChange}
                className="sr-only"
                aria-label="写真ファイルを選択"
              />
            </div>
          )}

          {/* プレビューサムネイル */}
          {photos.length > 0 && (
            <div className="mt-3 grid grid-cols-3 gap-2 sm:grid-cols-5">
              {photos.map((file, index) => (
                <div key={`${file.name}-${index}`} className="relative group aspect-square">
                  <img
                    src={photoPreviews[index]}
                    alt={`アップロード写真 ${index + 1}`}
                    className="w-full h-full object-cover rounded-lg border border-gray-200"
                  />
                  {/* 削除ボタン */}
                  <button
                    type="button"
                    onClick={() => handleRemovePhoto(index)}
                    aria-label={`写真 ${index + 1} を削除`}
                    className="absolute -top-1.5 -right-1.5 w-5 h-5 bg-red-500 hover:bg-red-600
                               text-white rounded-full flex items-center justify-center
                               opacity-0 group-hover:opacity-100 transition-opacity
                               focus:opacity-100 focus:outline-none focus:ring-2 focus:ring-red-400"
                  >
                    <svg className="w-3 h-3" fill="none" viewBox="0 0 24 24" stroke="currentColor" aria-hidden="true">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M6 18L18 6M6 6l12 12" />
                    </svg>
                  </button>
                </div>
              ))}
            </div>
          )}

          {/* 枚数インジケーター */}
          {photos.length > 0 && (
            <p className="mt-1.5 text-xs text-gray-400">
              {photos.length} / 5 枚選択中
            </p>
          )}

          {errors.photos && (
            <p id="photos-error" role="alert" className="mt-1 text-xs text-red-600">
              {errors.photos}
            </p>
          )}
        </div>

        {/* ---- 送信エラー ---- */}
        {errors.submit && (
          <div
            role="alert"
            className="p-3 bg-red-50 border border-red-200 rounded-lg text-sm text-red-700"
          >
            {errors.submit}
          </div>
        )}

        {/* ---- 送信ボタン ---- */}
        <button
          type="submit"
          disabled={submitting}
          className="w-full py-3 bg-orange-500 hover:bg-orange-600 active:bg-orange-700
                     disabled:opacity-60 disabled:cursor-wait
                     text-white text-base font-semibold rounded-xl shadow-sm
                     transition-colors focus:outline-none focus:ring-2 focus:ring-orange-400 focus:ring-offset-2"
        >
          {submitting ? (
            <span className="flex items-center justify-center gap-2">
              <LoadingSpinner size="sm" />
              <span>投稿中…</span>
            </span>
          ) : (
            '口コミを投稿する'
          )}
        </button>

        <p className="text-xs text-gray-400 text-center">
          <span className="text-red-500">*</span> は必須項目です
        </p>

      </form>
    </div>
  )
}
