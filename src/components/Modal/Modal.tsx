// src/components/Modal/Modal.tsx
// 確認モーダル — オーバーレイ付き、ESC キーで閉じる（クーポン交換確認などで使用、Requirements 5.1）

import { useEffect, type ReactNode } from 'react'
import { LoadingSpinner } from '../LoadingSpinner'

interface ModalProps {
  isOpen: boolean
  onClose: () => void
  onConfirm?: () => void
  title: string
  children: ReactNode
  confirmLabel?: string
  cancelLabel?: string
  isLoading?: boolean
}

export function Modal({
  isOpen,
  onClose,
  onConfirm,
  title,
  children,
  confirmLabel = '確認',
  cancelLabel = 'キャンセル',
  isLoading = false,
}: ModalProps) {
  // ESC キーで閉じる
  useEffect(() => {
    if (!isOpen) return

    function handleKeyDown(event: KeyboardEvent) {
      if (event.key === 'Escape') {
        onClose()
      }
    }

    document.addEventListener('keydown', handleKeyDown)
    return () => {
      document.removeEventListener('keydown', handleKeyDown)
    }
  }, [isOpen, onClose])

  // モーダルが閉じている間はレンダリングしない
  if (!isOpen) return null

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-4"
      role="dialog"
      aria-modal="true"
      aria-labelledby="modal-title"
    >
      {/* オーバーレイ（背景暗転） */}
      <div
        className="absolute inset-0 bg-black/50"
        onClick={onClose}
        aria-hidden="true"
      />

      {/* モーダル本体 */}
      <div className="relative z-10 w-full max-w-md bg-white rounded-2xl shadow-xl">

        {/* ヘッダー */}
        <div className="flex items-center justify-between px-6 pt-5 pb-4 border-b border-gray-100">
          <h2
            id="modal-title"
            className="text-base font-semibold text-gray-900"
          >
            {title}
          </h2>
          <button
            type="button"
            onClick={onClose}
            className="text-gray-400 hover:text-gray-600 transition-colors"
            aria-label="閉じる"
          >
            <svg className="w-5 h-5" viewBox="0 0 20 20" fill="currentColor" aria-hidden="true">
              <path d="M6.28 5.22a.75.75 0 0 0-1.06 1.06L8.94 10l-3.72 3.72a.75.75 0 1 0 1.06 1.06L10 11.06l3.72 3.72a.75.75 0 1 0 1.06-1.06L11.06 10l3.72-3.72a.75.75 0 0 0-1.06-1.06L10 8.94 6.28 5.22Z" />
            </svg>
          </button>
        </div>

        {/* コンテンツ */}
        <div className="px-6 py-4 text-sm text-gray-700">
          {children}
        </div>

        {/* フッター（ボタン） */}
        <div className="flex items-center justify-end gap-3 px-6 pb-5 pt-2">
          <button
            type="button"
            onClick={onClose}
            disabled={isLoading}
            className="px-4 py-2 rounded-lg text-sm font-medium text-gray-600 border border-gray-300
                       hover:bg-gray-50 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {cancelLabel}
          </button>

          {onConfirm && (
            <button
              type="button"
              onClick={onConfirm}
              disabled={isLoading}
              className="inline-flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium
                         bg-orange-500 text-white hover:bg-orange-600 transition-colors
                         disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {isLoading && <LoadingSpinner size="sm" className="border-white border-t-transparent" />}
              {confirmLabel}
            </button>
          )}
        </div>

      </div>
    </div>
  )
}
