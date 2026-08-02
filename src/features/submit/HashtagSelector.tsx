// src/features/submit/HashtagSelector.tsx
// ハッシュタグセレクターコンポーネント（Requirements 2.1, 2.2, 2.3, 2.4, 2.5, 2.6）
//
// タスク 4.1 スコープ:
//   - Props インターフェース定義
//   - 内部状態定義
//   - PRESET_CATEGORIES を使ったカテゴリ別プリセットチップ描画
//   - 選択済み vs 未選択のスタイル切り替え
//
// タスク 4.2 スコープ:
//   - プリセットチップのタップ選択・解除ロジック（Requirements 2.3, 2.4）
//   - 選択数 maxCount 件時の未選択チップ・追加ボタン disabled 制御（Requirements 2.5）
//   - 選択数 maxCount 件時の「最大N個まで追加できます」メッセージ表示（Requirements 2.6）
//
// タスク 4.3 スコープ:
//   - カスタム入力フィールドの handleAddCustom ロジック（Requirements 3.1〜3.7）
//   - validateHashtag を呼び出したバリデーション・エラー表示
//   - # 省略時の自動付加、正常追加後の入力クリア

import { useState, useEffect } from 'react'
import { PRESET_CATEGORIES } from '../../constants/hashtags'
import { validateHashtag } from './hashtagValidator'

// ---- Props インターフェース ----

interface HashtagSelectorProps {
  /** 現在選択されているハッシュタグの配列（親コンポーネントが管理） */
  value: string[]
  /** 選択ハッシュタグが変化したときのコールバック */
  onHashtagsChange: (hashtags: string[]) => void
  /** 最大選択数（デフォルト: 10） */
  maxCount?: number
  /** サジェスト候補のソース（全レビューのカスタムハッシュタグ一覧）。省略時はサジェスト機能を無効化 */
  customHashtagPool?: string[]
}

// ---- コンポーネント ----

export function HashtagSelector({
  value,
  onHashtagsChange,
  maxCount = 10,
  customHashtagPool,
}: HashtagSelectorProps) {
  // ---- 内部状態 ----
  const [customInput, setCustomInput] = useState<string>('')
  const [customError, setCustomError] = useState<string | null>(null)
  const [suggestions, setSuggestions] = useState<string[]>([])
  const [showSuggestions, setShowSuggestions] = useState<boolean>(false)

  // ---- サジェストフィルタリングロジック (Requirements 9.2, 9.3, 9.4, 9.5, 9.7, 9.8) ----
  useEffect(() => {
    if (!customInput || !customHashtagPool) {
      setSuggestions([])
      setShowSuggestions(false)
      return
    }
    if (value.length >= (maxCount ?? 10)) {
      setSuggestions([])
      setShowSuggestions(false)
      return
    }
    const normalized = customInput.startsWith('#') ? customInput : `#${customInput}`
    const filtered = customHashtagPool
      .filter(tag =>
        !value.includes(tag) &&
        tag.toLowerCase().startsWith(normalized.toLowerCase())
      )
      .slice(0, 5)
    setSuggestions(filtered)
    setShowSuggestions(filtered.length > 0)
  }, [customInput, customHashtagPool, value, maxCount])

  const isAtMax = value.length >= maxCount

  // ---- サジェスト選択ハンドラー (Requirements 9.6) ----
  const handleSuggestionSelect = (tag: string) => {
    onHashtagsChange([...value, tag])
    setCustomInput('')
    setShowSuggestions(false)
  }

  // ---- カスタムハッシュタグの追加ハンドラー (Requirements 3.1〜3.7) ----
  const handleAddCustom = () => {
    const trimmed = customInput.trim()

    // 空入力または "#" のみは何もしない（バリデーション不通過・エラーなし）
    if (!trimmed || trimmed === '#') {
      return
    }

    // # が先頭になければ自動付加 (Requirement 3.2)
    const normalizedTag = trimmed.startsWith('#') ? trimmed : `#${trimmed}`

    // 重複チェック (Requirement 3.3)
    if (value.includes(normalizedTag)) {
      setCustomError('同じハッシュタグはすでに追加されています')
      return
    }

    // フォーマットバリデーション (Requirements 3.4, 3.5)
    const result = validateHashtag(normalizedTag)
    if (!result.valid) {
      // validateHashtag が返すエラー文字列をそのままマップ
      setCustomError(result.error ?? 'ハッシュタグが無効です')
      return
    }

    // 正常追加 (Requirements 3.2, 3.7)
    onHashtagsChange([...value, normalizedTag])
    setCustomInput('')
    setCustomError(null)
  }

  // ---- プリセットチップのクリックハンドラー (Requirements 2.3, 2.4) ----
  const handlePresetChipClick = (tag: string) => {
    if (value.includes(tag)) {
      // 選択済み → 除去 (Requirement 2.4)
      onHashtagsChange(value.filter((t) => t !== tag))
    } else if (!isAtMax) {
      // 未選択 かつ 上限未達 → 追加 (Requirement 2.3)
      onHashtagsChange([...value, tag])
    }
  }

  // ---- 選択済みタグの削除ハンドラー ----
  const handleRemoveTag = (tag: string) => {
    onHashtagsChange(value.filter((t) => t !== tag))
  }

  // ---- レンダリング ----
  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <p className="text-sm font-medium text-gray-700">
          ハッシュタグ
          <span className="text-gray-400 font-normal ml-1.5">（最大{maxCount}個・任意）</span>
        </p>
        <span className="text-xs text-gray-400 tabular-nums">
          {value.length} / {maxCount}
        </span>
      </div>

      {/* 上限到達メッセージ（タスク 4.2 で実装） */}
      {isAtMax && (
        <p className="text-xs text-amber-600 bg-amber-50 border border-amber-200 rounded-lg px-3 py-2">
          最大{maxCount}個まで追加できます
        </p>
      )}

      {/* ---- カテゴリ別プリセットチップ ---- */}
      <div className="space-y-3">
        {PRESET_CATEGORIES.map((category) => (
          <div key={category.label}>
            <p className="text-xs font-medium text-gray-500 mb-1.5">{category.label}</p>
            <div className="flex flex-wrap gap-1.5">
              {category.hashtags.map((tag) => {
                const isSelected = value.includes(tag)
                const isDisabled = !isSelected && isAtMax

                return (
                  <button
                    key={tag}
                    type="button"
                    onClick={() => handlePresetChipClick(tag)}
                    disabled={isDisabled}
                    aria-pressed={isSelected}
                    className={[
                      'inline-flex items-center px-2.5 py-1 rounded-full text-xs font-medium border transition-colors',
                      'focus:outline-none focus:ring-2 focus:ring-orange-400 focus:ring-offset-1',
                      isSelected
                        ? 'bg-orange-500 text-white border-orange-500'
                        : isDisabled
                        ? 'bg-white text-gray-400 border-gray-200 opacity-50 cursor-not-allowed'
                        : 'bg-white text-gray-700 border-gray-300 hover:border-orange-400 hover:text-orange-600',
                    ].join(' ')}
                  >
                    {tag}
                  </button>
                )
              })}
            </div>
          </div>
        ))}
      </div>

      {/* ---- カスタム入力フィールド（タスク 4.3 で実装） ---- */}
      <div className="relative">
        <div className="flex gap-2">
          <input
            type="text"
            value={customInput}
            onChange={(e) => setCustomInput(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === 'Enter') {
                e.preventDefault()
                handleAddCustom()
              }
              if (e.key === 'Escape') {
                setShowSuggestions(false)
                // 入力値は保持する（Requirements 9.9）
              }
            }}
            placeholder="カスタムハッシュタグを入力（例: #栄ランチ）"
            disabled={isAtMax}
            aria-label="カスタムハッシュタグを入力"
            className={[
              'flex-1 px-3 py-2 border rounded-lg text-sm',
              'focus:outline-none focus:ring-2 focus:ring-orange-400 focus:border-transparent',
              'placeholder-gray-400 transition-colors',
              isAtMax
                ? 'bg-gray-50 border-gray-200 text-gray-400 cursor-not-allowed'
                : 'border-gray-300 bg-white hover:border-gray-400',
            ].join(' ')}
          />
          <button
            type="button"
            disabled={isAtMax}
            onClick={handleAddCustom}
            className={[
              'px-3 py-2 rounded-lg text-sm font-medium border transition-colors',
              'focus:outline-none focus:ring-2 focus:ring-orange-400 focus:ring-offset-1',
              isAtMax
                ? 'bg-gray-100 text-gray-400 border-gray-200 cursor-not-allowed'
                : 'bg-orange-500 text-white border-orange-500 hover:bg-orange-600 active:bg-orange-700',
            ].join(' ')}
          >
            追加
          </button>
        </div>

        {/* インラインバリデーションエラー（タスク 4.3 で実装） */}
        {customError && (
          <p role="alert" className="mt-1 text-xs text-red-600">
            {customError}
          </p>
        )}

        {/* サジェストドロップダウン（Requirements 9.6, 9.9, 9.10） */}
        {showSuggestions && (
          <ul
            role="listbox"
            aria-label="ハッシュタグの候補"
            className="absolute z-10 w-full bg-white border border-gray-200 rounded-lg shadow-md mt-1 overflow-hidden"
          >
            {suggestions.map(tag => (
              <li
                key={tag}
                role="option"
                aria-selected={false}
                onMouseDown={() => handleSuggestionSelect(tag)}
                className="px-3 py-2 text-sm cursor-pointer hover:bg-orange-50 text-gray-700"
              >
                {tag}
              </li>
            ))}
          </ul>
        )}
      </div>

      {/* ---- 選択済みハッシュタグ一覧 ---- */}
      {value.length > 0 && (
        <div>
          <p className="text-xs font-medium text-gray-500 mb-1.5">選択中</p>
          <div className="flex flex-wrap gap-1.5">
            {value.map((tag) => (
              <span
                key={tag}
                className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-medium
                           bg-orange-500 text-white border border-orange-500"
              >
                {tag}
                <button
                  type="button"
                  onClick={() => handleRemoveTag(tag)}
                  aria-label={`${tag} を削除`}
                  className="ml-0.5 hover:text-orange-200 focus:outline-none rounded-full"
                >
                  <svg className="w-3 h-3" fill="none" viewBox="0 0 24 24" stroke="currentColor" aria-hidden="true">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M6 18L18 6M6 6l12 12" />
                  </svg>
                </button>
              </span>
            ))}
          </div>
        </div>
      )}
    </div>
  )
}
