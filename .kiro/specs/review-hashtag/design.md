# 設計書: 口コミハッシュタグ機能（review-hashtag）

## 概要

本機能は、既存の NagoTime SPA に**ハッシュタグ付与・表示**能力を追加する。
変更範囲は次の5層にわたる。

1. **データモデル層** — `Review` 型に `hashtags?: string[]` フィールドを追加
2. **定数層** — 26種類のプリセットハッシュタグを定義する `src/constants/hashtags.ts` を新規作成
3. **UIコンポーネント層** — `HashtagSelector` コンポーネントを新規作成
4. **画面統合層** — `SubmitPage`・`ReviewDetailPage`・`ReviewCard` を改修
5. **モック API 層** — MSW ハンドラーのバリデーションを拡張、GET レスポンスにデフォルト値を補完

実装はすべてクライアントサイドであり、外部バックエンドへの変更は不要。

---

## アーキテクチャ

```mermaid
flowchart TD
    A[SubmitPage] -->|hashtags state| B[HashtagSelector]
    B -->|onHashtagsChange| A
    A -->|POST /api/reviews\n{ ...body, hashtags }| C[MSW reviewHandlers]
    C -->|Review with hashtags| D[in-memory reviews array]

    E[ReviewDetailPage] -->|GET /api/reviews/:id| C
    C -->|Review with hashtags default| E
    E -->|review.hashtags| F[Hashtag Chip Section]

    G[ReviewCard] -->|review.hashtags| H[Overlay Chips + +N]

    I[src/constants/hashtags.ts] -->|PRESET_HASHTAGS| B
    J[src/mocks/data/types.ts] -->|Review interface| A
    J -->|Review interface| E
    J -->|Review interface| G
```

### データフロー

1. ユーザーが `SubmitPage` でハッシュタグを選択・入力する
2. `HashtagSelector` が `onHashtagsChange(string[])` を通じて親 (`SubmitPage`) に通知する
3. `SubmitPage` がフォーム送信時に `hashtags` を `requestBody` に含めて `POST /api/reviews` を呼ぶ
4. MSW ハンドラーがバリデーションしてメモリ上の配列に永続化する
5. `ReviewDetailPage` / `ReviewCard` が `GET /api/reviews` から取得したデータを元にチップを描画する

---

## コンポーネントとインターフェース

### 1. `src/constants/hashtags.ts`（新規）

```typescript
export interface PresetCategory {
  label: string
  hashtags: string[]
}

export const PRESET_CATEGORIES: PresetCategory[] = [
  {
    label: '食事シーン',
    hashtags: [
      '#ランチ', '#ディナー', '#モーニング', '#ブランチ',
      '#テイクアウト', '#食べ歩き', '#食べ放題', '#スイーツ',
    ],
  },
  {
    label: '利用シーン',
    hashtags: [
      '#勉強スポット', '#デート', '#飲み会', '#大人数',
      '#一人', '#カフェ活', '#サークル', '#就活', '#ゼミ後', '#バイト帰り',
    ],
  },
  {
    label: '雰囲気・特徴',
    hashtags: [
      '#夜景', '#穴場', '#インスタ映え', '#コスパ良し',
      '#深夜営業', '#Wi-Fi完備', '#禁煙', '#テラス席', '#ペット可', '#予約不要',
    ],
  },
]

/** すべてのプリセットハッシュタグをフラットな配列で取得する */
export const ALL_PRESET_HASHTAGS: string[] = PRESET_CATEGORIES.flatMap(c => c.hashtags)
```

### 2. `src/features/submit/HashtagSelector.tsx`（新規）

#### Props インターフェース

```typescript
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
```

#### 内部状態

| state | 型 | 説明 |
|---|---|---|
| `customInput` | `string` | カスタム入力フィールドの現在値 |
| `customError` | `string \| null` | インラインバリデーションエラー |
| `suggestions` | `string[]` | 現在表示しているサジェスト候補（最大5件） |
| `showSuggestions` | `boolean` | ドロップダウンの表示フラグ |

#### ハッシュタグバリデーション関数（再利用可能・純粋関数）

```typescript
/**
 * ハッシュタグが有効かどうかを検証する。
 * バリデーションルール:
 *   - # で始まる
 *   - 全体の長さが 2〜31 文字（# を含む）
 *   - 空白・改行を含まない
 */
export function validateHashtag(tag: string): { valid: boolean; error?: string }
```

#### 動作仕様

- プリセットチップタップ時: `value` に含まれていれば除去、なければ追加
- `value.length === maxCount` 時: 未選択のプリセットチップと追加ボタンを `disabled` にする
- カスタム入力の `#` 省略: `#` で始まらない入力は自動的に `#` を先頭に付加してから追加
- エラークリア: 正常に追加できたとき `customError` を `null` にリセットし入力欄をクリアする

### 3. `src/mocks/data/types.ts`（改修）

```typescript
// 変更前
export interface Review {
  // ...既存フィールド
}

// 変更後
export interface Review {
  // ...既存フィールド
  hashtags?: string[]  // 追加（後方互換性のため optional）
}
```

### 4. `src/features/submit/SubmitPage.tsx`（改修）

- `HashtagSelector` を写真アップロードブロックの下に挿入する
- フォーム状態に `hashtags: string[]` を追加する（初期値: `[]`）
- `requestBody` に `hashtags` を追加する

```typescript
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
  hashtags,  // 追加
}
```

#### カスタムハッシュタグプールの導出（要件 9.1）

`SubmitPage` は全レビューを取得し、プリセットに含まれないハッシュタグを `customHashtagPool` として `HashtagSelector` に渡す。

```typescript
// SubmitPage.tsx 内
const allReviews = useReviews() // 既存フックを流用（GET /api/reviews）
const customHashtagPool = useMemo(() => {
  const all = allReviews.flatMap(r => r.hashtags ?? [])
  const unique = Array.from(new Set(all))
  return unique.filter(tag => !ALL_PRESET_HASHTAGS.includes(tag))
}, [allReviews])

// JSX
<HashtagSelector
  value={hashtags}
  onHashtagsChange={setHashtags}
  customHashtagPool={customHashtagPool}
/>
```

#### サジェストのフィルタリングロジック（HashtagSelector 内部）

`customInput` の変化を `useEffect` で監視し、サジェスト候補を都度算出する。

```typescript
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
```

#### ドロップダウン UI（HashtagSelector JSX）

```tsx
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
```

`handleSuggestionSelect` は選択したタグを `value` に追加し、`customInput` を空文字にリセット、`showSuggestions` を `false` にする。
Escape キーは `onKeyDown` で `key === 'Escape'` を検知して `setShowSuggestions(false)` のみ実行する（入力はクリアしない）。

### 5. `src/features/review/ReviewDetailPage.tsx`（改修）

本文テキストブロック（`<div className="bg-white rounded-xl p-4 ...">` の直後）にハッシュタグチップセクションを追加する。

```tsx
{/* ハッシュタグチップ（review.hashtags が空の場合は非表示） */}
{(review.hashtags ?? []).length > 0 && (
  <div className="flex flex-wrap gap-2 px-1">
    {(review.hashtags ?? []).slice(0, 10).map((tag) => (
      <span
        key={tag}
        className="inline-flex items-center px-2.5 py-1 rounded-full text-xs font-medium
                   bg-orange-100 text-orange-700 border border-orange-200"
      >
        {tag}
      </span>
    ))}
  </div>
)}
```

### 6. `src/components/ReviewCard/ReviewCard.tsx`（改修）

- 配置: `absolute top-2 left-2` — 写真左上オーバーレイ
- 表示件数: 縦最大3件 + 余剰は `+N` インジケーター（4行目）
- テキストスタイル: `text-white text-[10px] font-medium [filter:drop-shadow(0_1px_2px_rgba(0,0,0,0.35))]` — いいね数と同一スタイル、背景なし、視認性向上のための控えめなドロップシャドウ
- 横truncate: 各行を `max-w-[60%] truncate` で切り詰め、`…` で示す
- `+N` インジケーター: 同一スタイル（白字・背景なし）

```tsx
{/* ハッシュタグ（写真左上・縦3件・白字・背景なし） */}
{(review.hashtags ?? []).length > 0 && (
  <div
    className="absolute top-2 left-2 flex flex-col gap-0.5 pointer-events-none"
    aria-label={`ハッシュタグ: ${(review.hashtags ?? []).join(', ')}`}
  >
    {(review.hashtags ?? []).slice(0, 3).map((tag) => (
      <span
        key={tag}
        className="max-w-[60%] truncate text-[10px] font-medium text-white [filter:drop-shadow(0_1px_2px_rgba(0,0,0,0.35))] leading-none"
      >
        {tag}
      </span>
    ))}
    {(review.hashtags ?? []).length > 3 && (
      <span className="text-[10px] font-medium text-white [filter:drop-shadow(0_1px_2px_rgba(0,0,0,0.35))] leading-none">
        +{(review.hashtags ?? []).length - 3}
      </span>
    )}
  </div>
)}
```

### 7. `src/mocks/handlers/reviews.ts`（改修）

#### POST /api/reviews のバリデーション追加

```typescript
// hashtags バリデーション（要件 7.1〜7.5）
const hashtags = body.hashtags ?? []
if (Array.isArray(hashtags)) {
  // 上限チェック
  if (hashtags.length > 10) {
    validationErrors.push('hashtags')
  }
  // 各ハッシュタグの形式チェック
  const hasInvalid = hashtags.some(
    (tag: unknown) =>
      typeof tag !== 'string' ||
      tag.length > 31 ||
      /\s/.test(tag)
  )
  if (hasInvalid) validationErrors.push('hashtags')
  // 重複チェック
  if (new Set(hashtags).size !== hashtags.length) {
    validationErrors.push('hashtags')
  }
}
```

`newReview` への `hashtags` フィールド追加:
```typescript
const newReview: Review = {
  // ...既存フィールド
  hashtags: Array.isArray(hashtags) ? hashtags as string[] : [],
}
```

#### GET /api/reviews・GET /api/reviews/:id の後方互換対応

レスポンスを返す前に各レビューオブジェクトを正規化する:

```typescript
// hashtags フィールドが未定義の場合は [] にデフォルト
const normalize = (r: Review): Review => ({
  ...r,
  hashtags: r.hashtags ?? [],
})
```

---

## データモデル

### Review 型（拡張後）

```typescript
export interface Review {
  reviewId: string
  userId: string
  userName: string
  spotId: string
  spotName: string
  area: string
  lat: number
  lon: number
  text: string
  photoUrls: string[]        // 1〜5件
  status: ReviewStatus
  weather: Weather
  timeSlot: TimeSlot
  dayType: DayType
  likeCount: number
  viewCount: number
  createdAt: string          // ISO 8601
  likedUserIds: string[]
  hashtags?: string[]        // 新規追加（0〜10件、各 2〜31 文字、空白なし、重複なし）
}
```

### ハッシュタグバリデーションルール

| ルール | 値 |
|---|---|
| 先頭文字 | `#` |
| 最小文字数（`#` 含む） | 2 |
| 最大文字数（`#` 含む） | 31 |
| 禁止文字 | 空白・タブ・改行（`\s` にマッチする文字すべて） |
| 1レビューあたり最大件数 | 10 |
| 重複 | 不可 |

---

## 正確性プロパティ

*プロパティとは、システムのすべての有効な実行にわたって成立すべき特性または振る舞いのことであり、本質的には「システムが何をすべきか」に関する形式的な記述である。プロパティは人間が読める仕様と機械検証可能な正確性保証の橋渡しをする。*

### Property 1: ハッシュタグ形式バリデーション

*任意の* 文字列に対して、ハッシュタグバリデーターは、その文字列が `#` で始まり、全体の長さが2〜31文字であり、空白・改行を含まない場合かつその場合に限り、有効と判定しなければならない。

**Validates: Requirements 1.3**

### Property 2: API重複ハッシュタグ拒否

*任意の* 重複した値を含む `hashtags` 配列を持つ POST `/api/reviews` リクエストに対して、API は `VALIDATION_ERROR` の 400 レスポンスを返さなければならない。

**Validates: Requirements 1.5, 7.4**

### Property 3: API ハッシュタグ上限超過拒否

*任意の* 11件以上の `hashtags` 配列を含む POST `/api/reviews` リクエストに対して、API は `VALIDATION_ERROR` の 400 レスポンスを返さなければならない。

**Validates: Requirements 1.4, 7.1**

### Property 4: GET レスポンスのハッシュタグ自動補完

*任意の* `hashtags` フィールドを持たないレビューオブジェクトがストアに存在するとき、GET `/api/reviews` および GET `/api/reviews/:id` のレスポンスに含まれる各レビューオブジェクトは必ず `hashtags: []` を含まなければならない。

**Validates: Requirements 1.2, 8.3**

### Property 5: プリセットチップの選択・解除ラウンドトリップ

*任意の* プリセットハッシュタグに対して、それを選択してから再度タップして解除すると、HashtagSelector の選択リストは元の状態（そのハッシュタグを含まない状態）に戻らなければならない。

**Validates: Requirements 2.3, 2.4**

### Property 6: カスタム入力の `#` 正規化

*任意の* 有効なハッシュタグテキスト（`#` 付き・なしを問わず）に対して、追加後に選択リストに格納されるハッシュタグは必ず `#` で始まる正規化済みの形式でなければならない。

**Validates: Requirements 3.2**

### Property 7: カスタム入力後のフィールドクリア

*任意の* 有効なカスタムハッシュタグテキストが正常に追加されたとき、カスタム入力フィールドは空文字列にリセットされなければならない。

**Validates: Requirements 3.7**

### Property 8: フォーム送信時のハッシュタグ反映

*任意の* ハッシュタグの組み合わせが選択された状態でフォームが送信されるとき、POST リクエストボディの `hashtags` フィールドは選択されたハッシュタグの配列と等しく、API が返す作成済みレビューオブジェクトの `hashtags` も同一の値でなければならない。

**Validates: Requirements 4.2, 4.4**

### Property 9: 詳細画面でのハッシュタグチップ表示

*任意の* 1件以上のハッシュタグを持つレビューに対して、ReviewDetailPage はそれぞれのハッシュタグに対応するチップを `#` プレフィックス付きで表示しなければならない。

**Validates: Requirements 5.1, 5.3**

### Property 10: フィードカードの縦3件制限と余剰表示

*任意の* N件のハッシュタグ（N > 0）を持つレビューに対して、ReviewCard は最初の min(N, 3) 件のハッシュタグを写真左上に縦並びで白字表示し、N > 3 の場合は `+{N-3}` のインジケーターを4行目に追加表示しなければならない。

**Validates: Requirements 6.1, 6.2, 6.3**

### Property 11: サジェスト前方一致フィルタリング

*任意の* 1文字以上の入力テキストと任意の `customHashtagPool` に対して、ドロップダウンに表示されるすべてのサジェスト候補は、入力テキストを `#` で正規化した後の前方一致（大文字小文字区別なし）を満たし、かつ `ALL_PRESET_HASHTAGS` に含まれず、かつ既に選択済みのハッシュタグリストに含まれていてはならない。

**Validates: Requirements 9.2, 9.4, 9.7**

### Property 12: サジェスト候補上限

*任意の* 入力テキストと任意のサイズの `customHashtagPool` に対して、ドロップダウンに表示されるサジェスト候補の件数は最大5件を超えてはならない。

**Validates: Requirements 9.5**

---

## エラーハンドリング

### フロントエンド（HashtagSelector）

| エラー条件 | 表示メッセージ | 動作 |
|---|---|---|
| 重複ハッシュタグ | 「同じハッシュタグはすでに追加されています」 | 追加しない、入力はクリアしない |
| 31文字超過 | 「ハッシュタグは30文字以内で入力してください」 | 追加しない、入力はクリアしない |
| 空白・改行を含む | 「ハッシュタグにスペースや改行は使用できません」 | 追加しない、入力はクリアしない |
| 入力が空（`#` のみ含む） | エラーなし、何も追加しない | バリデーション不通過 |

エラーメッセージは `role="alert"` の `<p>` 要素として入力フィールド直下に表示し、次の正常な追加操作時にクリアする。

### フロントエンド（SubmitPage）

ハッシュタグはオプショナルフィールドであるため、SubmitPage レベルのバリデーションエラーは発生しない。
API から `VALIDATION_ERROR` が返った場合、既存の `errors.submit` に API のエラーメッセージを表示する。

### モック API（MSW ハンドラー）

ハッシュタグバリデーション違反（上限超過・形式違反・重複）はすべて `400 VALIDATION_ERROR` として返却し、`fields: ['hashtags']` を含む。
`hashtags` フィールドが省略された場合は `[]` として扱い、正常処理する。

---

## テスト戦略

### 方針

本機能には**純粋なバリデーションロジック**（`validateHashtag`）と**UIのステート管理**（選択・追加・削除）が含まれ、入力空間が広いためプロパティベーステストが適している。
一方で、プリセットの一覧表示・特定エラーメッセージの表示など特定の例に依存するものは例示ベースのテストで補う。

### ユニットテスト（例示ベース）

対象ファイル: `src/features/submit/HashtagSelector.test.tsx`、`src/mocks/handlers/reviews.test.ts`

- プリセット26件がすべて表示されること（要件 2.1）
- 選択数が10件のとき警告メッセージ「最大10個まで追加できます」が表示されること（要件 2.6）
- 選択数が10件のとき追加ボタンが disabled になること（要件 3.6）
- ハッシュタグなしでフォームを送信できること（要件 4.5）
- `hashtags` フィールドを省略した POST が 201 を返すこと（要件 7.5）
- 入力フィールドが空のときドロップダウンが非表示になること（要件 9.3）
- Escape キー押下でドロップダウンが閉じ、入力値が保持されること（要件 9.9）
- 選択数が10件のときドロップダウンが非表示になること（要件 9.8）
- ドロップダウンの `<ul>` に `role="listbox"`、各 `<li>` に `role="option"` が付与されていること（要件 9.10）

### プロパティベーステスト（fast-check）

対象ファイル: `src/features/submit/HashtagSelector.pbt.test.tsx`、`src/mocks/handlers/reviews.pbt.test.ts`

使用ライブラリ: **fast-check**（TypeScript / Node.js エコシステムに最適）

各プロパティテストは最低100回のイテレーションで実行し、テストコメントに以下の形式でタグを付与する:

> `// Feature: review-hashtag, Property {番号}: {プロパティテキスト}`

#### プロパティテスト一覧

| プロパティ番号 | テスト対象 | ジェネレーター |
|---|---|---|
| Property 1 | `validateHashtag` 関数 | 任意の文字列 |
| Property 2 | POST /api/reviews（重複ハッシュタグ） | 重複を含む hashtag 配列 |
| Property 3 | POST /api/reviews（11件以上） | 長さ11〜50の hashtag 配列 |
| Property 4 | GET /api/reviews（hashtags 補完） | hashtags フィールドなしの Review オブジェクト |
| Property 5 | HashtagSelector 選択ラウンドトリップ | プリセットハッシュタグから任意の1件 |
| Property 6 | HashtagSelector カスタム入力正規化 | # あり・なしの有効なハッシュタグ文字列 |
| Property 7 | HashtagSelector 入力フィールドクリア | 有効なカスタムハッシュタグ文字列 |
| Property 8 | フォーム送信 + API 永続化 | 0〜10件の有効な hashtag 配列 |
| Property 9 | ReviewDetailPage チップ表示 | 1〜10件の hashtag を持つ Review |
| Property 10 | ReviewCard 縦3件制限＋N表示 | 1〜10件の hashtag を持つ Review |
| Property 11 | HashtagSelector サジェストフィルタリング | 任意の入力文字列（1文字以上）× 任意の customHashtagPool |
| Property 12 | HashtagSelector サジェスト候補上限 | 任意の入力文字列 × 5件超の customHashtagPool |

### エッジケーステスト

- `hashtags: []` のレビューで詳細画面・フィードカードにハッシュタグエリアが描画されないこと（要件 5.2, 6.5）
- `hashtags` フィールド自体が存在しない Review オブジェクトが詳細画面・フィードカードで正常に描画されること（要件 8.1, 8.2）
- 31文字超のカスタム入力が追加されないこと（要件 3.4）
- 空白を含むカスタム入力が追加されないこと（要件 3.5）
- 4件以上のハッシュタグを持つレビューのフィードカードで、4行目に +N インジケーターが表示されること（要件 6.3）
- 長いハッシュタグテキストがフィードカードで … で切り詰められること（要件 6.4）
- 防御的表示として10件超のハッシュタグを持つレビューで詳細画面が最初の10件のみ表示すること（要件 5.4）
