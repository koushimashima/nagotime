# 実装計画: 口コミハッシュタグ機能（review-hashtag）

## 概要

既存の NagoTime SPA に対して、データモデル拡張・定数定義・UI コンポーネント新規作成・既存画面改修・MSW ハンドラー拡張の順でインクリメンタルに実装する。
すべての変更はクライアントサイドのみで完結し、TypeScript / React / Tailwind CSS の既存スタックを踏襲する。

---

## Tasks

- [x] 1. データモデルとバリデーション基盤の整備
  - [x] 1.1 `src/mocks/data/types.ts` の `Review` インターフェースに `hashtags?: string[]` を追加する
    - 後方互換性のため `optional` にする
    - _Requirements: 1.1, 1.2_
  - [x] 1.2 `src/constants/hashtags.ts` を新規作成し、`PRESET_CATEGORIES` と `ALL_PRESET_HASHTAGS` を定義する
    - 食事シーン・利用シーン・雰囲気/特徴の3カテゴリ・計30件のプリセットハッシュタグを定義する
    - _Requirements: 2.1_
  - [x] 1.3 `src/features/submit/hashtagValidator.ts` を新規作成し、再利用可能な純粋関数 `validateHashtag(tag: string)` を実装する
    - `#` で始まる、全体長 2〜31 文字、空白・改行なし の場合のみ valid を返す
    - _Requirements: 1.3, 3.4, 3.5_
  - [x] 1.4 `validateHashtag` のプロパティベーステスト（Property 1）を `src/features/submit/hashtagValidator.pbt.test.ts` に実装する
    - **Property 1: ハッシュタグ形式バリデーション**
    - **Validates: Requirements 1.3**

- [x] 2. MSW ハンドラーの拡張（API レイヤー）
  - [x] 2.1 `src/mocks/handlers/reviews.ts` の `POST /api/reviews` ハンドラーに `hashtags` バリデーションを追加する
    - 11件超 → 400 VALIDATION_ERROR（fields: ['hashtags']）
    - 31文字超のタグ → 400 VALIDATION_ERROR
    - 空白・改行を含むタグ → 400 VALIDATION_ERROR
    - 重複タグ → 400 VALIDATION_ERROR
    - フィールド省略 → `[]` として正常処理
    - `newReview` に `hashtags` フィールドを追加する
    - _Requirements: 7.1, 7.2, 7.3, 7.4, 7.5_
  - [x] 2.2 `GET /api/reviews` と `GET /api/reviews/:id` ハンドラーに `normalize` 関数を追加し、`hashtags` が未定義のレビューに `[]` を補完する
    - `GET /api/reviews/recommend` にも同様の補完を適用する
    - _Requirements: 8.3_
  - [x] 2.3 MSW ハンドラーの重複ハッシュタグ拒否プロパティテスト（Property 2）を `src/mocks/handlers/reviews.pbt.test.ts` に実装する
    - **Property 2: API 重複ハッシュタグ拒否**
    - **Validates: Requirements 1.5, 7.4**
  - [x] 2.4 MSW ハンドラーのハッシュタグ上限超過拒否プロパティテスト（Property 3）を実装する
    - **Property 3: API ハッシュタグ上限超過拒否**
    - **Validates: Requirements 1.4, 7.1**
  - [x] 2.5 GET レスポンスの `hashtags` 自動補完プロパティテスト（Property 4）を実装する
    - **Property 4: GET レスポンスのハッシュタグ自動補完**
    - **Validates: Requirements 1.2, 8.3**

- [x] 3. チェックポイント — API レイヤーの確認
  - すべてのテストがパスすることを確認し、疑問点があればユーザーに確認する。

- [x] 4. `HashtagSelector` コンポーネントの実装
  - [x] 4.1 `src/features/submit/HashtagSelector.tsx` を新規作成し、Props インターフェース・内部状態・カテゴリ別プリセットチップ表示を実装する
    - `value: string[]` / `onHashtagsChange: (hashtags: string[]) => void` / `maxCount?: number` の Props を定義する
    - `customHashtagPool?: string[]` prop も同時に定義する（後から追加して壊さないようにするため）
    - `PRESET_CATEGORIES` を読み込んでカテゴリごとにチップを描画する
    - 選択済みチップと未選択チップのスタイルを切り替える
    - _Requirements: 2.1, 2.2_
  - [x] 4.2 プリセットチップのタップ選択・解除ロジックを実装する
    - タップで選択リストへの追加・除去を行う
    - 選択数 10 件時に未選択チップと追加ボタンを `disabled` にする
    - 選択数 10 件時に「最大10個まで追加できます」メッセージを表示する
    - _Requirements: 2.3, 2.4, 2.5, 2.6_
  - [x] 4.3 カスタムハッシュタグ入力フィールドと追加ボタンを実装する
    - `validateHashtag` を呼び出してバリデーションし、エラー時はインラインメッセージを `role="alert"` で表示する
    - `#` 省略時は自動で先頭に付加してから追加する
    - 正常追加後は入力フィールドをクリアし `customError` をリセットする
    - _Requirements: 3.1, 3.2, 3.3, 3.4, 3.5, 3.6, 3.7_
  - [x] 4.4 プリセットチップの選択・解除ラウンドトリップのプロパティテスト（Property 5）を `src/features/submit/HashtagSelector.pbt.test.tsx` に実装する
    - **Property 5: プリセットチップの選択・解除ラウンドトリップ**
    - **Validates: Requirements 2.3, 2.4**
  - [x] 4.5 カスタム入力の `#` 正規化プロパティテスト（Property 6）を実装する
    - **Property 6: カスタム入力の `#` 正規化**
    - **Validates: Requirements 3.2**
  - [x] 4.6 カスタム入力後のフィールドクリアプロパティテスト（Property 7）を実装する
    - **Property 7: カスタム入力後のフィールドクリア**
    - **Validates: Requirements 3.7**

- [x] 5. `SubmitPage` へのハッシュタグ統合
  - [x] 5.1 `src/features/submit/SubmitPage.tsx` に `hashtags: string[]` フォーム状態を追加し、`HashtagSelector` を写真アップロードブロックの直後に配置する
    - `requestBody` に `hashtags` を追加する
    - `GET /api/reviews` から全レビューを取得し、`ALL_PRESET_HASHTAGS` に含まれないハッシュタグを重複なしで集めた `customHashtagPool` を `useMemo` で導出する
    - `customHashtagPool` を `HashtagSelector` の prop として渡す
    - _Requirements: 4.1, 4.2, 4.3, 4.5, 9.1_
  - [x] 5.2 フォーム送信時のハッシュタグ反映プロパティテスト（Property 8）を `src/features/submit/HashtagSelector.pbt.test.tsx` に追加する
    - **Property 8: フォーム送信時のハッシュタグ反映**
    - **Validates: Requirements 4.2, 4.4**

- [x] 6. チェックポイント — HashtagSelector と SubmitPage の確認
  - すべてのテストがパスすることを確認し、疑問点があればユーザーに確認する。

- [x] 7. `ReviewDetailPage` へのハッシュタグ表示統合
  - [x] 7.1 `src/features/review/ReviewDetailPage.tsx` の本文テキストブロック直後にハッシュタグチップセクションを追加する
    - `review.hashtags ?? []` が空の場合はエリアを描画しない
    - 最大 10 件のみ表示する（防御的表示）
    - 各チップは `#` プレフィックス付きで `bg-orange-100 text-orange-700 border-orange-200` のスタイルで表示する
    - _Requirements: 5.1, 5.2, 5.3, 5.4, 8.1_
  - [x] 7.2 ReviewDetailPage のチップ表示プロパティテスト（Property 9）を `src/features/review/ReviewDetailPage.pbt.test.tsx` に実装する
    - **Property 9: 詳細画面でのハッシュタグチップ表示**
    - **Validates: Requirements 5.1, 5.3**

- [x] 8. `ReviewCard` へのハッシュタグ表示統合
  - [x] 8.1 `src/components/ReviewCard/ReviewCard.tsx` の写真左上オーバーレイに縦3件 + `+N` インジケーターのハッシュタグ表示を追加する
    - `absolute top-2 left-2` に配置する
    - 各行は `max-w-[60%] truncate` で横切り詰め、`text-white text-[10px] font-medium` スタイルを使う（いいね数と同一スタイル）
    - `review.hashtags ?? []` が空の場合はエリアを描画しない
    - _Requirements: 6.1, 6.2, 6.3, 6.4, 6.5, 8.2_
  - [x] 8.2 ReviewCard の縦3件制限と余剰表示プロパティテスト（Property 10）を `src/components/ReviewCard/ReviewCard.pbt.test.tsx` に実装する
    - **Property 10: フィードカードの縦3件制限と余剰表示**
    - **Validates: Requirements 6.1, 6.2, 6.3**

- [x] 10. カスタムハッシュタグのサジェスト機能実装
  - [x] 10.1 `HashtagSelector` に `suggestions` / `showSuggestions` 内部状態を追加し、`customInput` 変化時のフィルタリングロジック（`useEffect`）を実装する
    - `customInput` が空、または選択数 ≥ `maxCount` の場合はドロップダウンを非表示にする
    - `#` 未付与の入力は先頭に付加してから前方一致（大文字小文字区別なし）でフィルタリングする
    - 選択済みハッシュタグを候補から除外する
    - 最大5件に絞り込む
    - _Requirements: 9.2, 9.3, 9.4, 9.5, 9.7, 9.8_
  - [x] 10.2 ドロップダウン UI を実装する（`role="listbox"` / `role="option"`）
    - `ul[role="listbox"]` の絶対配置ドロップダウンを入力フィールドの直下に描画する
    - 候補アイテムの `onMouseDown` で `handleSuggestionSelect` を呼び出す
    - Escape キーの `onKeyDown` でドロップダウンを閉じる（入力値は保持）
    - _Requirements: 9.6, 9.9, 9.10_
  - [x] 10.3 サジェストのフィルタリングプロパティテスト（Property 11）を `src/features/submit/HashtagSelector.pbt.test.tsx` に追加する
    - **Property 11: サジェスト前方一致フィルタリング**
    - **Validates: Requirements 9.2, 9.4, 9.7**
  - [x] 10.4 サジェスト候補上限プロパティテスト（Property 12）を実装する
    - **Property 12: サジェスト候補上限**
    - **Validates: Requirements 9.5**

- [x] 9. 最終チェックポイント — 全テストパス確認
  - すべてのテストがパスすることを確認し、疑問点があればユーザーに確認する。

---

## Notes

- `*` マークのサブタスクはオプションであり、MVP では省略可能
- チェックポイントタスクは実装の節目で品質を確認するための区切り
- プロパティベーステストには `fast-check` ライブラリを使用する（既存スタックの TypeScript/Vitest 環境に統合）
- 各プロパティテストは最低 100 回のイテレーションで実行し、コメントに `// Feature: review-hashtag, Property {番号}: {テキスト}` の形式でタグを付与する
- `hashtags` はすべてオプショナルフィールドのため、SubmitPage レベルのバリデーションエラーは不要

- `customHashtagPool` は `SubmitPage` が `useMemo` で導出し `HashtagSelector` へ prop として渡す（wave 6 の 5.1 で実装済み）
- タスク10（サジェスト機能）はタスク4（HashtagSelector の基盤実装）と5.1（customHashtagPool 導出）が完了した後に実施する

## Task Dependency Graph

```json
{
  "waves": [
    { "id": 0, "tasks": ["1.1", "1.2"] },
    { "id": 1, "tasks": ["1.3"] },
    { "id": 2, "tasks": ["1.4", "2.1"] },
    { "id": 3, "tasks": ["2.2", "2.3", "2.4"] },
    { "id": 4, "tasks": ["2.5", "4.1"] },
    { "id": 5, "tasks": ["4.2", "4.3"] },
    { "id": 6, "tasks": ["4.4", "4.5", "4.6", "5.1"] },
    { "id": 7, "tasks": ["5.2", "7.1", "8.1"] },
    { "id": 8, "tasks": ["7.2", "8.2"] },
    { "id": 9, "tasks": ["10.1"] },
    { "id": 10, "tasks": ["10.2", "10.3", "10.4"] }
  ]
}
```
