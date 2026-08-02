# Weather Filter Button Fix — Bugfix Design

## Overview

フィード画面の `ContextFilterBar` に天気フィルターチップが表示されていない。現状では `RecommendContext` に `filterWeather` 状態が存在せず、`ContextFilterBar` に天気チップの UI も実装されていない。また `FeedPage` は `useRecommendFeed` の `weather` パラメータにコンテキスト自動取得の固定値（`'SUNNY'`）を渡しているため、ユーザーが仮に天気を選択できたとしてもフィードに反映されない。

修正方針は最小範囲に絞る：
1. `RecommendContext` に `filterWeather` / `setFilterWeather` を追加し、`resetFilters` と `isFilterModified` に組み込む
2. `ContextFilterBar` に天気チップ（ドロップダウン付き）を追加する
3. `FeedPage` の `weather` パラメータを `weather` → `filterWeather` に切り替える

---

## Glossary

- **Bug_Condition (C)**: 天気フィルターチップが `ContextFilterBar` に存在しない、かつ `FeedPage` が `filterWeather` ではなく固定の `weather` をフィード取得に渡している状態
- **Property (P)**: 天気チップが表示され、選択した天気でフィードが絞り込まれ、`isFilterModified` がリセットボタン表示に正しく反映される正しい動作
- **Preservation**: 時間帯・曜日種別チップ、ローディング・エラー表示、リセットボタン表示ロジック、`weather` 自動取得値（固定 `'SUNNY'`）など、修正対象外の既存動作
- **`filterWeather`**: ユーザーが選択した天気フィルター値。`RecommendContext` で管理される新規 state（初期値は自動取得の `weather`、すなわち `'SUNNY'`）
- **`weather`**: `RecommendContext` が自動取得するコンテキスト天気値。現状は常に `'SUNNY'` 固定（Requirements 1.6）。`filterWeather` の初期値として使用される
- **`isBugCondition`**: バグ発現入力を識別する擬似コード関数
- **`useRecommendFeed`**: `src/features/feed/useRecommendFeed.ts` で定義されるフィード取得カスタムフック。`weather` パラメータを受け取り API リクエストに使用する
- **`isFilterModified`**: フィルター値がデフォルト（コンテキスト自動取得値）と異なる場合に `true` になる算出値

---

## Bug Details

### Bug Condition

バグは以下の 2 つの構造的欠如によって発現する：

1. `RecommendContext` に `filterWeather` state が存在しないため、天気フィルターをどこにも保持できない
2. `ContextFilterBar` に天気チップ UI が実装されていないため、ユーザーが天気を選択できない
3. `FeedPage` が `filterWeather` ではなく `weather`（固定 `'SUNNY'`）を `useRecommendFeed` に渡している

**Formal Specification:**
```
FUNCTION isBugCondition(input)
  INPUT: input = { component: string, action: string }
  OUTPUT: boolean

  // 天気チップが存在しない欠如バグ
  IF input.component = 'ContextFilterBar'
     AND input.action IN ['render', 'user-weather-select']
     AND filterWeather_state_exists = false
  THEN RETURN true

  // FeedPage が filterWeather を使っていない欠如バグ
  IF input.component = 'FeedPage'
     AND input.action = 'fetch-feed'
     AND weather_param_source = 'context_weather_fixed'  // 'SUNNY' 固定
  THEN RETURN true

  RETURN false
END FUNCTION
```

### Examples

- **例 1（チップ未表示）**: ユーザーがフィード画面を開く → `ContextFilterBar` に天気チップが表示されない（期待: SUNNY/CLOUDY/RAINY/SNOWYのチップが見える）
- **例 2（選択不可）**: ユーザーが天気フィルターを変更しようとする → 選択 UI が存在しないため操作できない（期待: ドロップダウンで天気を選択できる）
- **例 3（フィード未反映）**: ユーザーが天気チップを仮に操作できたとしても `FeedPage` は常に `weather='SUNNY'` でフェッチするためフィードが変わらない（期待: `filterWeather` の値でフェッチされる）
- **例 4（エッジケース）**: `filterWeather` が `'SUNNY'`（デフォルト）のまま → `isFilterModified` は `false` のまま（期待: リセットボタンが非表示）

---

## Expected Behavior

### Preservation Requirements

**変更してはならない動作:**
- 時間帯チップ（MORNING/AFTERNOON/EVENING/NIGHT）の表示・選択・フィルタ反映は従来どおり動作する
- 曜日種別チップ（WEEKDAY/HOLIDAY）の表示・選択・フィルタ反映は従来どおり動作する
- ローディング中のスピナー表示ロジック（`locating === true`）は変わらない
- 位置情報エラー時のエラーメッセージ表示ロジック（`locationError !== null`）は変わらない
- リセットボタンは `isFilterModified === true` のときのみ表示されるロジックは変わらない
- `weather`（自動取得値、常に `'SUNNY'` 固定）は変更されない
- `filterWeather` の初期値は `weather`（`'SUNNY'`）であり、変更されない

**スコープ:**
天気フィルターに直接関係しない入力（時間帯・曜日種別チップの操作、マウスクリック、キーボード操作、ローディング/エラー状態の遷移）はこの修正によって完全に無影響でなければならない。

---

## Hypothesized Root Cause

バグ分析から、根本原因は実装の欠如（missing implementation）であり、既存コードのロジック誤りではない：

1. **`RecommendContext` に `filterWeather` state が未実装**: `RecommendState` インターフェースに `filterWeather: Weather` および `setFilterWeather: (w: Weather) => void` が存在しない。`useState<Weather>` も宣言されておらず、`resetFilters` と `isFilterModified` にも考慮が抜けている

2. **`ContextFilterBar` に天気チップ UI が未実装**: 時間帯・曜日種別チップは既に実装済みだが、天気チップ（ドロップダウン含む）のブロック全体が存在しない

3. **`FeedPage` が `filterWeather` ではなく `weather` を使用**: `useRecommendContext()` から `filterWeather` を取得せず、固定値 `weather` を `useRecommendFeed` の `weather` パラメータに渡している

---

## Correctness Properties

Property 1: Bug Condition — 天気フィルターチップの表示と選択反映

_For any_ ユーザーのフィード画面操作において、天気チップ選択の入力（`isBugCondition` が true となる入力）に対し、修正後の実装は天気チップを `ContextFilterBar` に表示し、選択した天気値を `filterWeather` に保存し、`FeedPage` が `filterWeather` を使ってフィードを取得するものとする（SHALL）。

**Validates: Requirements 2.1, 2.2, 2.3, 2.4**

Property 2: Preservation — 既存フィルターチップ動作の保護

_For any_ 天気フィルターに関与しない入力（`isBugCondition` が false となる入力、すなわち時間帯・曜日種別操作、ローディング/エラー表示、リセット操作など）に対し、修正後の実装はオリジナルの実装と完全に同一の動作を生じさせるものとする（SHALL）。

**Validates: Requirements 3.1, 3.2, 3.3, 3.4, 3.5, 3.6**

---

## Fix Implementation

### Changes Required

**File 1**: `src/contexts/RecommendContext.tsx`

**変更箇所:**

1. **`RecommendState` インターフェースへの追加**:
   ```ts
   filterWeather: Weather
   setFilterWeather: (w: Weather) => void
   ```
   `filterDayType` / `setFilterDayType` の直後に追加する

2. **`useState` の追加**:
   ```ts
   const [filterWeather, setFilterWeather] = useState<Weather>(weather)
   ```
   `filterDayType` の useState の直後に追加する

3. **`resetFilters` への追加**:
   ```ts
   function resetFilters(): void {
     setFilterTimeSlot(timeSlot)
     setFilterDayType(dayType)
     setFilterWeather(weather)  // 追加
   }
   ```

4. **`isFilterModified` の useMemo への追加**:
   ```ts
   const isFilterModified = useMemo(
     () =>
       filterTimeSlot !== timeSlot ||
       filterDayType !== dayType ||
       filterWeather !== weather,  // 追加
     [filterTimeSlot, filterDayType, filterWeather, timeSlot, dayType, weather],
   )
   ```

5. **`value` オブジェクトへの追加**:
   ```ts
   const value: RecommendState = {
     // ...既存フィールド...
     filterWeather,        // 追加
     setFilterWeather,     // 追加
   }
   ```

---

**File 2**: `src/components/ContextFilterBar.tsx`

**変更箇所:**

1. **インポート型への `Weather` 追加**:
   ```ts
   import type { TimeSlot, DayType, Weather } from '../mocks/data/types'
   ```

2. **`useRecommendContext()` の分割代入に追加**:
   ```ts
   const {
     filterWeather,
     setFilterWeather,
     // ...既存...
   } = useRecommendContext()
   ```

3. **天気メタデータの追加**:
   ```ts
   const WEATHER_LABEL: Record<Weather, string> = {
     SUNNY: '晴れ', CLOUDY: '曇り', RAINY: '雨', SNOWY: '雪', UNKNOWN: '不明',
   }
   const WEATHER_ICON: Record<Weather, string> = {
     SUNNY: '☀️', CLOUDY: '☁️', RAINY: '🌧', SNOWY: '❄️', UNKNOWN: '？',
   }
   const WEATHER_ORDER: Weather[] = ['SUNNY', 'CLOUDY', 'RAINY', 'SNOWY']
   ```

4. **ドロップダウン開閉状態の型拡張**:
   ```ts
   const [openDropdown, setOpenDropdown] = useState<'timeSlot' | 'dayType' | 'weather' | null>(null)
   ```

5. **天気チップ用ハンドラの追加**:
   ```ts
   function handleWeatherChipClick() {
     setOpenDropdown(prev => (prev === 'weather' ? null : 'weather'))
   }
   function handleSelectWeather(w: Weather) {
     setFilterWeather(w)
     setOpenDropdown(null)
   }
   ```

6. **天気チップブロックのレンダリング追加**（曜日種別チップの直後に挿入）:
   ```tsx
   {/* 天気チップ */}
   <div className="relative" data-chip>
     <button
       type="button"
       className={chipClassName}
       aria-label={`天気フィルタ: ${WEATHER_LABEL[filterWeather]}`}
       aria-haspopup="listbox"
       aria-expanded={openDropdown === 'weather'}
       onClick={handleWeatherChipClick}
     >
       {WEATHER_ICON[filterWeather]}{WEATHER_LABEL[filterWeather]}
       <span className="ml-1 text-xs opacity-60" aria-hidden="true">▾</span>
     </button>
     {openDropdown === 'weather' && (
       <ul role="listbox" aria-label="天気を選択" className={dropdownBase}>
         {WEATHER_ORDER.map((w) => {
           const isSelected = w === filterWeather
           return (
             <li key={w} role="option" aria-selected={isSelected}
               className={`px-4 py-2 text-sm cursor-pointer hover:bg-orange-50 transition-colors ${
                 isSelected ? 'bg-orange-100 text-orange-700 font-medium' : 'text-gray-700'
               }`}
               onClick={() => handleSelectWeather(w)}
             >
               {WEATHER_ICON[w]} {WEATHER_LABEL[w]}
             </li>
           )
         })}
       </ul>
     )}
   </div>
   ```

---

**File 3**: `src/features/feed/FeedPage.tsx`

**変更箇所:**

1. **`useRecommendContext()` の分割代入に `filterWeather` を追加**:
   ```ts
   const {
     coord,
     weather,       // filterWeather の初期値用に残す（または削除可）
     filterWeather, // 追加
     filterTimeSlot,
     setSharedReviews,
   } = useRecommendContext()
   ```

2. **`useRecommendFeed` の `weather` パラメータ変更**:
   ```ts
   const { reviews, loading, error } = useRecommendFeed({
     lat: coord.lat,
     lon: coord.lon,
     weather: filterWeather,  // weather → filterWeather
     timeSlot: filterTimeSlot,
   })
   ```
   ※ `weather` 変数の参照が他に残らない場合は分割代入から削除する

---

## Testing Strategy

### Validation Approach

二段階のアプローチを取る：まず修正前のコードでバグ発現を確認（探索的チェック）し、修正後に Fix Checking と Preservation Checking を行う。

### Exploratory Bug Condition Checking

**Goal**: 修正前のコードでバグが発現することを確認し、根本原因仮説を検証する。

**Test Plan**: `ContextFilterBar` のレンダリングテストで天気チップの不在を確認し、`FeedPage` のレンダリングテストで `useRecommendFeed` に渡される `weather` パラメータが常に `'SUNNY'` であることを確認する。

**Test Cases**:
1. **天気チップ未表示テスト**: `ContextFilterBar` をレンダリングし、天気関連の button/listbox が存在しないことをアサート（修正前は pass、修正後は fail → 修正後に否定アサートに変換）
2. **固定 weather パラメータテスト**: `FeedPage` をレンダリングし、`useRecommendFeed` の `weather` パラメータが `'SUNNY'` 固定であることをアサート（修正前は pass）
3. **`filterWeather` 未存在テスト**: `RecommendContext` から `filterWeather` を取得しようとすると `undefined` になることを確認（修正前）
4. **`isFilterModified` 未反映テスト**: `filterWeather` を変えても `isFilterModified` が変化しないことを確認（修正前）

**Expected Counterexamples**:
- 天気チップボタンが DOM に存在しない
- `filterWeather` が `undefined`
- `useRecommendFeed` の `weather` 引数が常に `'SUNNY'`

### Fix Checking

**Goal**: バグ条件が成立する入力に対して、修正後の実装が正しい動作を示すことを検証する。

**Pseudocode:**
```
FOR ALL input WHERE isBugCondition(input) DO
  result := fixedImplementation(input)
  ASSERT expectedBehavior(result)
END FOR
```

**expectedBehavior の擬似コード:**
```
FUNCTION expectedBehavior(result)
  INPUT: result = { renderedChips, fetchParam, isFilterModified }
  OUTPUT: boolean

  RETURN 'weather-chip' IN result.renderedChips
         AND result.fetchParam.weather = selectedFilterWeather
         AND (selectedFilterWeather != 'SUNNY' => result.isFilterModified = true)
END FUNCTION
```

### Preservation Checking

**Goal**: バグ条件が成立しない入力（時間帯・曜日種別操作など）に対して、修正後の実装がオリジナルと同一動作をすることを検証する。

**Pseudocode:**
```
FOR ALL input WHERE NOT isBugCondition(input) DO
  ASSERT originalImplementation(input) = fixedImplementation(input)
END FOR
```

**Testing Approach**: Property-based testing を推奨する理由：
- 時間帯・曜日種別の組み合わせ（4×2=8通り）を自動生成できる
- `isFilterModified` の計算ロジックが `filterWeather` 追加後も既存条件に対して変わらないことを網羅的に確認できる
- 手動ユニットテストでは見落としやすいエッジケース（例: 時間帯だけ変更した場合）もカバーできる

**Test Cases**:
1. **時間帯チップ操作保護テスト**: 時間帯を変更したとき `filterTimeSlot` が更新され `filterWeather` は変化しないことを確認
2. **曜日種別チップ操作保護テスト**: 曜日種別を変更したとき `filterDayType` が更新され `filterWeather` は変化しないことを確認
3. **リセット操作保護テスト**: リセットボタン押下で `filterTimeSlot`・`filterDayType`・`filterWeather` がすべてデフォルト値に戻ることを確認
4. **ローディング/エラー表示保護テスト**: `locating=true` / `locationError!=null` の状態でフィルタバーが天気チップを表示せずスピナー/エラーを返すことを確認
5. **`isFilterModified` false 保護テスト**: 3フィルター全てデフォルト値のとき `isFilterModified` が `false` のままであることを確認（Property-based: ランダムな (timeSlot=初期値, dayType=初期値, filterWeather='SUNNY') の組み合わせを生成）

### Unit Tests

- `RecommendContext`: `filterWeather` の初期値が `weather`（`'SUNNY'`）であることを確認
- `RecommendContext`: `setFilterWeather('RAINY')` 後に `filterWeather === 'RAINY'` かつ `isFilterModified === true` を確認
- `RecommendContext`: `resetFilters()` 後に `filterWeather` が `'SUNNY'` に戻り `isFilterModified` が `false` になることを確認
- `ContextFilterBar`: 天気チップが4種類（SUNNY/CLOUDY/RAINY/SNOWY）表示されることを確認
- `ContextFilterBar`: 天気チップクリックでドロップダウンが開き、選択で `setFilterWeather` が呼ばれることを確認
- `ContextFilterBar`: `aria-label="天気フィルタ: 晴れ"` など aria 属性が正しいことを確認
- `FeedPage`: `useRecommendFeed` に渡す `weather` が `filterWeather` の値であることを確認

### Property-Based Tests

- ランダムな `Weather` 値（SUNNY/CLOUDY/RAINY/SNOWY）を生成し、`filterWeather !== 'SUNNY'` のとき常に `isFilterModified === true` になることを確認
- ランダムな `(TimeSlot, DayType)` の組み合わせで `filterWeather` が変わらないことを確認（preservation）
- ランダムな3フィルター組み合わせで、全てデフォルト値のときのみ `isFilterModified === false` になることを確認

### Integration Tests

- フィード画面を開き、天気チップで `RAINY` を選択 → `useRecommendFeed` が `weather='RAINY'` でフェッチされることを確認
- 天気チップ変更後にリセットボタンが表示され、押下でチップが `SUNNY` に戻ることを確認
- 時間帯・曜日種別・天気の3チップが同時に表示され、それぞれ独立して操作できることを確認
