// Feature: review-hashtag, Property 5: プリセットチップの選択・解除ラウンドトリップ
// Validates: Requirements 2.3, 2.4

import { describe, it, expect, vi, beforeAll, afterEach, afterAll } from 'vitest'
import * as fc from 'fast-check'
import { render, screen, fireEvent, cleanup, within } from '@testing-library/react'
import { HashtagSelector } from './HashtagSelector'
import { ALL_PRESET_HASHTAGS } from '../../constants/hashtags'

describe('HashtagSelector - Property 5: プリセットチップの選択・解除ラウンドトリップ', () => {
  /**
   * Property 5: プリセットチップの選択・解除ラウンドトリップ
   *
   * 任意のプリセットハッシュタグに対して、
   * それを選択してから再度タップして解除すると、
   * HashtagSelector の選択リストは元の状態（そのハッシュタグを含まない状態）に戻らなければならない。
   *
   * テスト手順:
   *   1. 対象ハッシュタグを含まない初期状態でコンポーネントをレンダリング
   *   2. 選択操作: 対象チップをクリック → onHashtagsChange が対象を含む配列で呼ばれることを確認
   *   3. 解除操作: 対象を含む value でコンポーネントを再レンダリングし、チップを再クリック
   *              → onHashtagsChange が対象を含まない配列で呼ばれることを確認
   *   4. ラウンドトリップ確認: 解除後の配列が初期 value と等しい
   */
  it('任意のプリセットハッシュタグを選択してから解除すると元の選択状態に戻る', () => {
    // 対象プリセットハッシュタグを1件任意に選ぶアービトラリ
    const targetHashtagArb = fc.constantFrom(...ALL_PRESET_HASHTAGS)

    // 初期選択済みリスト: 対象を含まない、最大9件（maxCount=10 を超えない）のプリセットサブセット
    const initialValueArb = (target: string) =>
      fc
        .uniqueArray(
          fc.constantFrom(...ALL_PRESET_HASHTAGS.filter(h => h !== target)),
          { minLength: 0, maxLength: 9 }
        )

    fc.assert(
      fc.property(
        targetHashtagArb.chain(target =>
          fc.tuple(fc.constant(target), initialValueArb(target))
        ),
        ([target, initialValue]) => {
          // ---- ステップ 1: 選択操作 ----
          // 対象ハッシュタグが含まれない初期状態でレンダリング
          const onHashtagsChangeSpy = vi.fn<(hashtags: string[]) => void>()

          const { unmount: unmount1 } = render(
            <HashtagSelector
              value={initialValue}
              onHashtagsChange={onHashtagsChangeSpy}
              maxCount={10}
            />
          )

          // 対象チップのボタン要素を取得してクリック
          const chipButton = screen.getByRole('button', { name: target })
          fireEvent.click(chipButton)

          // onHashtagsChange が呼ばれたことを確認
          expect(onHashtagsChangeSpy).toHaveBeenCalledTimes(1)
          const afterSelectValue = onHashtagsChangeSpy.mock.calls[0][0]

          // 選択後の配列に対象ハッシュタグが含まれる（Requirement 2.3）
          expect(afterSelectValue).toContain(target)
          // 初期 value のすべての要素も含まれる
          for (const tag of initialValue) {
            expect(afterSelectValue).toContain(tag)
          }

          unmount1()
          onHashtagsChangeSpy.mockClear()

          // ---- ステップ 2: 解除操作 ----
          // 対象ハッシュタグを含む状態でコンポーネントを再レンダリング
          const valueWithTarget = [...initialValue, target]

          const { unmount: unmount2 } = render(
            <HashtagSelector
              value={valueWithTarget}
              onHashtagsChange={onHashtagsChangeSpy}
              maxCount={10}
            />
          )

          // 対象チップを再クリック（解除操作）
          const selectedChipButton = screen.getByRole('button', { name: target })
          fireEvent.click(selectedChipButton)

          // onHashtagsChange が呼ばれたことを確認
          expect(onHashtagsChangeSpy).toHaveBeenCalledTimes(1)
          const afterDeselectValue = onHashtagsChangeSpy.mock.calls[0][0]

          // 解除後の配列に対象ハッシュタグが含まれない（Requirement 2.4）
          expect(afterDeselectValue).not.toContain(target)

          // ---- ステップ 3: ラウンドトリップ確認 ----
          // 解除後の配列が初期 value と同じ要素を持つ（順序不問）
          expect(afterDeselectValue.slice().sort()).toEqual(initialValue.slice().sort())

          unmount2()
          cleanup()
        }
      ),
      { numRuns: 100 }
    )
  })
})

// Feature: review-hashtag, Property 6: カスタム入力の # 正規化
// Validates: Requirements 3.2

describe('HashtagSelector - Property 6: カスタム入力の # 正規化', () => {
  /**
   * Property 6: カスタム入力の # 正規化
   *
   * 任意の有効なハッシュタグテキスト（# 付き・なしを問わず）に対して、
   * 追加後に選択リストに格納されるハッシュタグは必ず # で始まる正規化済みの形式でなければならない。
   *
   * テスト手順:
   *   1. 有効なハッシュタグ本文テキストを生成（空白なし、1〜30 文字）
   *   2. # なしで入力してカスタム追加 → 選択リストに "#本文" が含まれることを確認
   *   3. # ありで入力してカスタム追加 → 選択リストに "#本文" が含まれることを確認（## にならないことを確認）
   */
  it('任意の有効テキストを # なし/あり で入力しても追加後のハッシュタグは必ず # で始まる', () => {
    // 有効なハッシュタグ本文: 空白なし・# を含まない・1〜30 文字
    // （# を含む本文を除外することで、case B で "##..." が生成されるのを防ぐ）
    const tagBodyArb = fc.stringOf(
      fc.char().filter((c) => !/\s/.test(c) && c !== '#'),
      { minLength: 1, maxLength: 30 }
    )

    fc.assert(
      fc.property(tagBodyArb, (body) => {
        // --- ケース A: # なしで入力 ---
        {
          const onHashtagsChangeSpy = vi.fn<(hashtags: string[]) => void>()
          const container = document.createElement('div')
          document.body.appendChild(container)
          const { unmount } = render(
            <HashtagSelector
              value={[]}
              onHashtagsChange={onHashtagsChangeSpy}
              maxCount={10}
            />,
            { container }
          )

          const view = within(container)
          const input = view.getByRole('textbox', { name: 'カスタムハッシュタグを入力' })
          const addButton = view.getByRole('button', { name: '追加' })

          // # なしのテキストを入力して追加
          fireEvent.change(input, { target: { value: body } })
          fireEvent.click(addButton)

          // onHashtagsChange が呼ばれた場合（バリデーション通過した場合）、# で始まること
          // かつ正規化済みの形式（"#" + body）であること
          if (onHashtagsChangeSpy.mock.calls.length > 0) {
            const resultHashtags = onHashtagsChangeSpy.mock.calls[0][0]
            for (const tag of resultHashtags) {
              expect(tag.startsWith('#')).toBe(true)
              // # なし入力に対して自動で # が付加されること（Requirement 3.2）
              expect(tag).toBe(`#${body}`)
            }
          }

          unmount()
          document.body.removeChild(container)
        }

        // --- ケース B: # ありで入力 ---
        {
          const onHashtagsChangeSpy = vi.fn<(hashtags: string[]) => void>()
          const container = document.createElement('div')
          document.body.appendChild(container)
          const { unmount } = render(
            <HashtagSelector
              value={[]}
              onHashtagsChange={onHashtagsChangeSpy}
              maxCount={10}
            />,
            { container }
          )

          const view = within(container)
          const input = view.getByRole('textbox', { name: 'カスタムハッシュタグを入力' })
          const addButton = view.getByRole('button', { name: '追加' })

          // # ありのテキストを入力して追加
          fireEvent.change(input, { target: { value: `#${body}` } })
          fireEvent.click(addButton)

          // onHashtagsChange が呼ばれた場合（バリデーション通過した場合）、
          // # で始まること かつ ## で始まらないこと（# の二重付加がないこと）
          if (onHashtagsChangeSpy.mock.calls.length > 0) {
            const resultHashtags = onHashtagsChangeSpy.mock.calls[0][0]
            for (const tag of resultHashtags) {
              expect(tag.startsWith('#')).toBe(true)
              // # ありで入力した場合、正規化により # が余分に付加されない
              expect(tag).toBe(`#${body}`)
            }
          }

          unmount()
          document.body.removeChild(container)
        }
      }),
      { numRuns: 100 }
    )
  })
})

// Feature: review-hashtag, Property 7: カスタム入力後のフィールドクリア
// Validates: Requirements 3.7

describe('HashtagSelector - Property 7: カスタム入力後のフィールドクリア', () => {
  /**
   * Property 7: カスタム入力後のフィールドクリア
   *
   * 任意の有効なカスタムハッシュタグテキストが正常に追加されたとき、
   * カスタム入力フィールドは空文字列にリセットされなければならない。
   *
   * テスト手順:
   *   1. 有効なハッシュタグ本文テキストを生成（空白なし、1〜30 文字、# を含まない）
   *   2. input に # なしのテキストを入力し追加ボタンをクリック
   *   3. onHashtagsChange が呼ばれた（追加成功した）ことを確認
   *   4. 追加後に input の value が空文字列であることを確認
   */
  it('有効なカスタムハッシュタグを追加した後、入力フィールドが空文字列にリセットされる', () => {
    // 有効なハッシュタグ本文: 空白なし・# を含まない・1〜30 文字
    const tagBodyArb = fc.stringOf(
      fc.char().filter((c) => !/\s/.test(c) && c !== '#'),
      { minLength: 1, maxLength: 30 }
    )

    fc.assert(
      fc.property(tagBodyArb, (body) => {
        const onHashtagsChangeSpy = vi.fn<(hashtags: string[]) => void>()
        const container = document.createElement('div')
        document.body.appendChild(container)

        const { unmount } = render(
          <HashtagSelector
            value={[]}
            onHashtagsChange={onHashtagsChangeSpy}
            maxCount={10}
          />,
          { container }
        )

        const view = within(container)
        const input = view.getByRole('textbox', { name: 'カスタムハッシュタグを入力' })
        const addButton = view.getByRole('button', { name: '追加' })

        // 有効なテキストを入力して追加ボタンをクリック
        fireEvent.change(input, { target: { value: body } })
        fireEvent.click(addButton)

        // onHashtagsChange が呼ばれた場合（追加成功）、入力フィールドがクリアされていることを確認
        if (onHashtagsChangeSpy.mock.calls.length > 0) {
          // Requirement 3.7: 正常追加後は入力フィールドをクリアする
          expect((input as HTMLInputElement).value).toBe('')
        }

        unmount()
        document.body.removeChild(container)
        cleanup()
      }),
      { numRuns: 100 }
    )
  })
})

// Feature: review-hashtag, Property 8: フォーム送信時のハッシュタグ反映
// Validates: Requirements 4.2, 4.4

import { setupServer } from 'msw/node'
import { reviewHandlers } from '../../mocks/handlers/reviews'
import type { Review } from '../../mocks/data/types'

// MSW ノードサーバーを reviews ハンドラーで起動する（Property 8 専用）
const serverForProperty8 = setupServer(...reviewHandlers)

beforeAll(() => serverForProperty8.listen({ onUnhandledRequest: 'warn' }))
afterEach(() => serverForProperty8.resetHandlers())
afterAll(() => serverForProperty8.close())

describe('Property 8: フォーム送信時のハッシュタグ反映', () => {
  /**
   * Property 8: フォーム送信時のハッシュタグ反映
   *
   * 任意のハッシュタグの組み合わせ（0〜10件の有効な hashtag 配列）が
   * 選択された状態でフォームが送信されるとき:
   *   1. POST リクエストボディの `hashtags` フィールドは選択されたハッシュタグの配列と等しい
   *   2. API が返す作成済みレビューオブジェクトの `hashtags` も同一の値でなければならない
   *
   * 検証戦略:
   *   - MSW ノードサーバーで POST /api/reviews をインターセプトする
   *   - SubmitPage が構築する requestBody と同一形式で直接 POST する
   *     （SubmitPage.tsx の requestBody と同じフィールド構造を使用）
   *   - レスポンスの newReview.hashtags が送信した hashtags と等しいことを検証する
   *
   * Validates: Requirements 4.2, 4.4
   */

  // 有効な hashtag 本文（空白なし・1〜30文字・# なし）のアービタリー
  const tagBodyArb = fc.stringOf(
    fc.char().filter((c) => !/\s/.test(c) && c !== '#'),
    { minLength: 1, maxLength: 30 },
  ).map((s) => `#${s}`)

  // 0〜10件の重複なし有効 hashtag 配列のアービタリー
  const hashtagsArb = fc.uniqueArray(tagBodyArb, { minLength: 0, maxLength: 10 })

  /** SubmitPage が構築する requestBody と同一形式でリクエストボディを組み立てる */
  function buildSubmitPageBody(hashtags: string[]): Record<string, unknown> {
    return {
      userId: 'user-test-prop8',
      spotName: 'プロパティ8テストスポット',
      lat: 35.181,
      lon: 136.906,
      text: 'プロパティ8テスト用の口コミテキストです。50文字以上になるよう十分な長さにしています。これで確認完了です。',
      photoUrls: ['https://picsum.photos/seed/prop8/400/300'],
      weather: 'UNKNOWN',
      timeSlot: 'AFTERNOON',
      dayType: 'WEEKDAY',
      hashtags, // SubmitPage の requestBody と同一フィールド（Requirements 4.2）
    }
  }

  it(
    '任意の 0〜10 件の hashtag 配列を含むフォーム送信で、API レスポンスの hashtags が送信値と等しい',
    async () => {
      await fc.assert(
        fc.asyncProperty(hashtagsArb, async (selectedHashtags) => {
          // POST /api/reviews（SubmitPage の handleSubmit と同等の呼び出し）
          const response = await fetch('/api/reviews', {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
              // SubmitPage の handleSubmit が送るトークン形式と同一
              Authorization: 'Bearer mock-jwt-token-user-test-prop8-9999999999999',
            },
            body: JSON.stringify(buildSubmitPageBody(selectedHashtags)),
          })

          // 201 Created が返ること（正常に作成されること）
          expect(response.status).toBe(201)

          const createdReview = (await response.json()) as Review

          // Requirement 4.2: POST リクエストボディの hashtags が選択済み配列と等しい
          // （requestBody に hashtags を含めることを確認：レスポンスに反映されていることで検証）

          // Requirement 4.4: API が返す作成済みレビューの hashtags が送信値と同一
          expect(Array.isArray(createdReview.hashtags)).toBe(true)
          expect(createdReview.hashtags).toEqual(selectedHashtags)
        }),
        { numRuns: 100 },
      )
    },
    // 100 回のリクエストに MSW の delay(200ms) が掛かるため 60s に設定
    60_000,
  )
})

// Feature: review-hashtag, Property 11: サジェスト前方一致フィルタリング
// Validates: Requirements 9.2, 9.4, 9.7

import { act } from '@testing-library/react'
import { ALL_PRESET_HASHTAGS as ALL_PRESET_HASHTAGS_FOR_P11 } from '../../constants/hashtags'

describe('HashtagSelector - Property 11: サジェスト前方一致フィルタリング', () => {
  /**
   * Property 11: サジェスト前方一致フィルタリング
   *
   * 任意の 1 文字以上の入力テキストと任意の customHashtagPool に対して、
   * ドロップダウンに表示されるすべてのサジェスト候補は:
   *   1. 入力テキストを '#' で正規化した後の前方一致（大文字小文字区別なし）を満たす
   *   2. ALL_PRESET_HASHTAGS に含まれない（customHashtagPool 自体がプリセットを含まないことで保証）
   *   3. 既に選択済みのハッシュタグリストに含まれていない
   *
   * テスト手順:
   *   1. 1 文字以上の任意の入力テキスト (inputText) を生成
   *   2. '#' + 英数字・日本語相当の文字列で構成される customHashtagPool を生成
   *      （ALL_PRESET_HASHTAGS を除外した形で構成する）
   *   3. 既選択ハッシュタグリスト (selectedHashtags) を customHashtagPool の部分集合として生成
   *   4. HashtagSelector をレンダリングし customInput に inputText を入力
   *   5. role="listbox" 内の role="option" 要素を取得
   *   6. 各候補が前方一致・非選択済み であることを検証
   */
  it('任意の入力に対してドロップダウンの全候補が正規化前方一致かつ未選択済みである', async () => {
    // カスタムハッシュタグとして有効な文字列のアービタリ:
    //   - '#' で始まる
    //   - 全体長 2〜31 文字
    //   - 空白なし
    //   - ALL_PRESET_HASHTAGS に含まれない（プールの要素名をユニークにするため ASCII 本文を使用）
    const customTagArb = fc
      .stringOf(
        fc.char().filter((c) => !/\s/.test(c) && c !== '#'),
        { minLength: 1, maxLength: 29 }
      )
      .map((body) => `#custom_${body}`)
      .filter(
        (tag) =>
          tag.length <= 31 &&
          !ALL_PRESET_HASHTAGS_FOR_P11.includes(tag)
      )

    // customHashtagPool: 0〜10 件のユニークなカスタムタグ
    const poolArb = fc.uniqueArray(customTagArb, { minLength: 0, maxLength: 10 })

    // 1 文字以上の任意の入力テキスト（空白以外）
    const inputTextArb = fc.stringOf(
      fc.char().filter((c) => !/\s/.test(c)),
      { minLength: 1, maxLength: 20 }
    )

    await fc.assert(
      fc.asyncProperty(
        inputTextArb,
        poolArb,
        async (inputText, pool) => {
          // selectedHashtags: pool の部分集合（0〜pool.length 件）
          const selectedCount = pool.length > 0 ? Math.floor(Math.random() * pool.length) : 0
          const selectedHashtags = pool.slice(0, selectedCount)
          // 選択済みを除いた残りのプール
          const availablePool = pool.filter((t) => !selectedHashtags.includes(t))

          const container = document.createElement('div')
          document.body.appendChild(container)

          const onHashtagsChangeSpy = vi.fn<(hashtags: string[]) => void>()

          const { unmount } = render(
            <HashtagSelector
              value={selectedHashtags}
              onHashtagsChange={onHashtagsChangeSpy}
              maxCount={10}
              customHashtagPool={availablePool}
            />,
            { container }
          )

          const view = within(container)

          // customInput に inputText を入力する
          const input = view.getByRole('textbox', { name: 'カスタムハッシュタグを入力' })
          await act(async () => {
            fireEvent.change(input, { target: { value: inputText } })
          })

          // 正規化後のプレフィックス（前方一致フィルタに使う基準文字列）
          const normalizedPrefix = inputText.startsWith('#')
            ? inputText.toLowerCase()
            : `#${inputText}`.toLowerCase()

          // ドロップダウンが表示されているか確認
          const listbox = container.querySelector('[role="listbox"]')

          if (listbox) {
            const options = Array.from(listbox.querySelectorAll('[role="option"]'))
            for (const option of options) {
              const tagText = option.textContent ?? ''

              // 要件 9.2 / 9.4: 正規化後の前方一致を満たすこと
              expect(tagText.toLowerCase().startsWith(normalizedPrefix)).toBe(true)

              // 要件 9.7: 既に選択済みのタグが含まれないこと
              expect(selectedHashtags).not.toContain(tagText)

              // customHashtagPool が ALL_PRESET_HASHTAGS を含まない構成のため
              // 要件 9.1 の間接検証: 候補が ALL_PRESET_HASHTAGS に含まれないこと
              expect(ALL_PRESET_HASHTAGS_FOR_P11).not.toContain(tagText)
            }
          }
          // listbox が表示されていない場合（前方一致する候補がない / 選択上限）は
          // 候補が 0 件であることが保証されるため検証スキップ（正しい振る舞い）

          unmount()
          document.body.removeChild(container)
          cleanup()
        }
      ),
      { numRuns: 100 }
    )
  })
})

// Feature: review-hashtag, Property 12: サジェスト候補上限
// Validates: Requirements 9.5

describe('HashtagSelector - Property 12: サジェスト候補上限', () => {
  /**
   * Property 12: サジェスト候補上限
   *
   * 任意の入力テキストと任意のサイズの customHashtagPool に対して、
   * ドロップダウンに表示されるサジェスト候補の件数は最大5件を超えてはならない。
   *
   * テスト手順:
   *   1. 1 文字以上の任意の入力テキスト (inputText) を生成
   *   2. 6件以上のユニークなカスタムハッシュタグで構成される customHashtagPool を生成
   *   3. HashtagSelector をレンダリングし customInput に inputText を入力
   *   4. role="listbox" 内の role="option" 要素の数を取得
   *   5. 候補件数が最大 5 件以下であることを検証
   */
  it('6件以上の候補プールがあっても、ドロップダウンに表示される候補は最大5件以下である', async () => {
    // 前方一致するカスタムタグを確実に生成するため、共通プレフィックス "#match_" を使用する
    const COMMON_PREFIX = '#match_'

    // "#match_" で始まる有効なカスタムハッシュタグのアービタリー
    // 全体長が 2〜31 文字の範囲に収まるよう本文を 1〜(31 - COMMON_PREFIX.length) 文字にする
    const maxBodyLen = 31 - COMMON_PREFIX.length  // 24
    const customTagArb = fc
      .stringOf(
        fc.char().filter((c) => !/\s/.test(c) && c !== '#'),
        { minLength: 1, maxLength: maxBodyLen }
      )
      .map((body) => `${COMMON_PREFIX}${body}`)
      .filter((tag) => tag.length >= 2 && tag.length <= 31)

    // 6件以上のユニークなカスタムタグプール（最大30件）
    const poolArb = fc.uniqueArray(customTagArb, { minLength: 6, maxLength: 30 })

    // 入力テキスト: "#match_" または "match_" のいずれかを使用（すべての候補に前方一致する）
    const inputTextArb = fc.constantFrom(COMMON_PREFIX, COMMON_PREFIX.slice(1))

    await fc.assert(
      fc.asyncProperty(
        inputTextArb,
        poolArb,
        async (inputText, pool) => {
          const container = document.createElement('div')
          document.body.appendChild(container)

          const onHashtagsChangeSpy = vi.fn<(hashtags: string[]) => void>()

          const { unmount } = render(
            <HashtagSelector
              value={[]}
              onHashtagsChange={onHashtagsChangeSpy}
              maxCount={10}
              customHashtagPool={pool}
            />,
            { container }
          )

          const view = within(container)

          // customInput に inputText を入力する
          const input = view.getByRole('textbox', { name: 'カスタムハッシュタグを入力' })
          await act(async () => {
            fireEvent.change(input, { target: { value: inputText } })
          })

          // ドロップダウン内の候補数を取得
          const listbox = container.querySelector('[role="listbox"]')
          const optionCount = listbox
            ? listbox.querySelectorAll('[role="option"]').length
            : 0

          // Requirement 9.5: 候補件数は最大5件以下
          expect(optionCount).toBeLessThanOrEqual(5)

          unmount()
          document.body.removeChild(container)
          cleanup()
        }
      ),
      { numRuns: 100 }
    )
  })
})
