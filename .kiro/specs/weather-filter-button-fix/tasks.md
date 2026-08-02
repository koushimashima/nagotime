# Implementation Plan

- [x] 1. バグ条件の探索的テストを書く
  - **Property 1: Bug Condition** - 天気フィルターチップ未実装バグ
  - **CRITICAL**: このテストは修正前コードで FAIL することが期待される — FAIL がバグの存在を証明する
  - **DO NOT attempt to fix the test or the code when it fails**
  - **NOTE**: このテストは期待される動作をエンコードしており、修正後に PASS することで修正を検証する
  - **GOAL**: バグの存在を示す反例（counterexample）を明らかにする
  - **Scoped PBT Approach**: 決定論的な欠如バグのため、具体的な失敗ケースにスコープを絞る
  - テスト対象のバグ条件（isBugCondition が true となる入力）:
    - `input.component = 'ContextFilterBar'` かつ `input.action = 'render'` のとき、天気チップが存在しないこと
    - `input.component = 'FeedPage'` かつ `input.action = 'fetch-feed'` のとき、`weather` パラメータが `'SUNNY'` 固定であること
  - テストケース 1: `ContextFilterBar` をレンダリングし、`aria-label` に `"天気フィルタ"` を含むボタンが DOM に**存在する**ことをアサート → 修正前は FAIL（ボタンが存在しないため）
  - テストケース 2: `FeedPage` をレンダリングし、`useRecommendFeed` に渡される `weather` パラメータが `filterWeather`（コンテキスト値）由来であることをアサート → 修正前は FAIL（`'SUNNY'` 固定のため）
  - テストケース 3: `RecommendContext` から `filterWeather` を取得し、`undefined` でないことをアサート → 修正前は FAIL
  - テストケース 4: `setFilterWeather('RAINY')` 後に `isFilterModified === true` になることをアサート → 修正前は FAIL
  - テストを修正前コードで実行する
  - **EXPECTED OUTCOME**: テスト FAIL（これが正しい — バグの存在を証明する）
  - 見つかった反例を記録し根本原因を把握する（例: `"天気フィルタ: ..."` ボタンが DOM に存在しない、`filterWeather` が `undefined`）
  - テストを書き、実行し、FAIL を記録したらタスク完了とする
  - _Requirements: 2.1, 2.2, 2.3, 2.4_

- [x] 2. 保護（Preservation）プロパティテストを書く（修正前に実施）
  - **Property 2: Preservation** - 既存フィルターチップ動作の保護
  - **IMPORTANT**: 観察ファースト方式に従う
  - **観察フェーズ**（修正前コードで isBugCondition が false となる入力を実行し動作を記録する）:
    - 時間帯チップ（MORNING/AFTERNOON/EVENING/NIGHT）が表示・選択・フィルタ反映されること
    - 曜日種別チップ（WEEKDAY/HOLIDAY）が表示・選択・フィルタ反映されること
    - `locating === true` のときスピナーが表示されること
    - `locationError !== null` のときエラーメッセージが表示されること
    - `isFilterModified === false` のときリセットボタンが非表示であること
    - `weather` 自動取得値は常に `'SUNNY'` 固定であること
  - **プロパティテストの実装**（観察した動作をもとにテストを作成）:
    - Property-based test: ランダムな `(TimeSlot, DayType)` の組み合わせを生成し、時間帯・曜日種別チップを操作しても `filterWeather` が変化しないことを確認
    - Property-based test: ランダムな `(TimeSlot, DayType)` のデフォルト値以外の組み合わせで `isFilterModified === true` になることを確認（天気は `'SUNNY'` 固定）
    - Property-based test: 全フィルターがデフォルト値（`timeSlot=初期値`, `dayType=初期値`, `weather='SUNNY'`）のとき `isFilterModified === false` になることを確認
    - ユニットテスト: `locating=true` のとき `ContextFilterBar` がスピナーを返すことを確認（天気チップ操作なし）
    - ユニットテスト: `locationError!=null` のとき `ContextFilterBar` がエラーメッセージを返すことを確認
    - ユニットテスト: `resetFilters()` 後に `filterTimeSlot` と `filterDayType` がデフォルト値に戻ることを確認
  - テストを修正前コードで実行する
  - **EXPECTED OUTCOME**: テスト全て PASS（修正前のベースライン動作を確認する）
  - テストを書き、実行し、PASS を確認したらタスク完了とする
  - _Requirements: 3.1, 3.2, 3.3, 3.4, 3.5, 3.6_

- [x] 3. 天気フィルターチップ未実装バグの修正

  - [x] 3.1 `RecommendContext.tsx` に `filterWeather` state を追加する
    - `RecommendState` インターフェースに `filterWeather: Weather` と `setFilterWeather: (w: Weather) => void` を追加（`filterDayType` の直後）
    - `const [filterWeather, setFilterWeather] = useState<Weather>(weather)` を追加（`filterDayType` の useState の直後）
    - `resetFilters()` に `setFilterWeather(weather)` を追加
    - `isFilterModified` の useMemo に `filterWeather !== weather` の条件と依存配列エントリを追加
    - `value` オブジェクトに `filterWeather` と `setFilterWeather` を追加
    - _Bug_Condition: isBugCondition(input) where input.component='ContextFilterBar' AND filterWeather_state_exists=false_
    - _Expected_Behavior: expectedBehavior(result) where 'weather-chip' IN result.renderedChips AND result.fetchParam.weather = selectedFilterWeather_
    - _Preservation: 時間帯・曜日種別チップ、ローディング/エラー表示、リセットボタン表示ロジックは変わらない_
    - _Requirements: 2.1, 2.3, 2.4, 3.5, 3.6_

  - [x] 3.2 `ContextFilterBar.tsx` に天気チップ UI を追加する
    - `Weather` 型のインポートを追加（`import type { TimeSlot, DayType, Weather } from '../mocks/data/types'`）
    - `useRecommendContext()` の分割代入に `filterWeather`、`setFilterWeather` を追加
    - `WEATHER_LABEL`、`WEATHER_ICON`、`WEATHER_ORDER` メタデータを追加
    - `openDropdown` の型に `'weather'` を追加（`'timeSlot' | 'dayType' | 'weather' | null`）
    - `handleWeatherChipClick` と `handleSelectWeather` ハンドラを追加
    - 天気チップブロック（ドロップダウン付き）を曜日種別チップの直後に挿入
    - aria-label: `"天気フィルタ: {WEATHER_LABEL[filterWeather]}"` （例: `"天気フィルタ: 晴れ"`）
    - _Bug_Condition: isBugCondition(input) where input.component='ContextFilterBar' AND input.action='render'_
    - _Expected_Behavior: 天気チップが DOM に存在し、ドロップダウンで SUNNY/CLOUDY/RAINY/SNOWY が選択可能_
    - _Preservation: 時間帯・曜日種別チップの動作は変わらない_
    - _Requirements: 2.1, 2.2, 3.1, 3.2_

  - [x] 3.3 `FeedPage.tsx` の `weather` パラメータを `filterWeather` に変更する
    - `useRecommendContext()` の分割代入に `filterWeather` を追加
    - `useRecommendFeed` の `weather: weather` を `weather: filterWeather` に変更
    - `weather` 変数が他に使われていない場合は分割代入から削除する
    - _Bug_Condition: isBugCondition(input) where input.component='FeedPage' AND weather_param_source='context_weather_fixed'_
    - _Expected_Behavior: result.fetchParam.weather = selectedFilterWeather（filterWeather の値）_
    - _Preservation: フィード取得ロジック自体（lat/lon/timeSlot など）は変わらない_
    - _Requirements: 2.3, 3.3_

  - [x] 3.4 バグ条件探索的テストが PASS することを確認する
    - **Property 1: Expected Behavior** - 天気フィルターチップ表示と選択反映
    - **IMPORTANT**: タスク 1 の同じテストを再実行する — 新しいテストを書かない
    - タスク 1 のテストは期待動作をエンコードしており、修正後に PASS することで修正を検証する
    - タスク 1 の探索的テストを再実行する
    - **EXPECTED OUTCOME**: テスト PASS（バグが修正されたことを確認）
    - _Requirements: 2.1, 2.2, 2.3, 2.4_

  - [x] 3.5 保護プロパティテストが引き続き PASS することを確認する
    - **Property 2: Preservation** - 既存フィルターチップ動作の保護
    - **IMPORTANT**: タスク 2 の同じテストを再実行する — 新しいテストを書かない
    - タスク 2 の保護プロパティテストを再実行する
    - **EXPECTED OUTCOME**: テスト全て PASS（リグレッションなしを確認）
    - 修正後も全テストが PASS していることを確認する

- [x] 4. チェックポイント — 全テスト PASS の確認
  - 探索的テスト（タスク 1）が PASS していることを確認する
  - 保護プロパティテスト（タスク 2）が PASS していることを確認する
  - ユニットテスト・インテグレーションテスト全体を実行し、PASS を確認する
  - 疑問点が生じた場合はユーザーに確認する
