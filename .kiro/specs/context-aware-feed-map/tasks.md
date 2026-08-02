# 実装計画: コンテキスト対応フィード・マップ連携

## 概要

コンテキスト計算ユーティリティの実装を起点に、RecommendContext → useRecommendFeed →
ContextFilterBar → PhotoPin の順で新規モジュールを構築し、最後に既存の App.tsx・FeedPage.tsx・
MapPage.tsx を差し替える。各ステップで単体テスト・PBT を追加し、インクリメンタルに動作を確認する。
実装言語は TypeScript（React / Vitest / fast-check）。

---

## タスク

- [ ] 1. contextCalc ユーティリティの実装
  - [ ] 1.1 `src/utils/contextCalc.ts` を新規作成し、`calcTimeSlot` と `calcDayType` 純粋関数を実装する
    - `calcTimeSlot(hour: number): TimeSlot` — 0〜23 の整数を受け取り、要件 1.4 の境界値に従いタイムスロットを返す
    - `calcDayType(day: number): DayType` — 0〜6 の整数を受け取り、要件 1.5 の規則で曜日種別を返す
    - `TimeSlot`・`DayType` は `../../mocks/data/types` からインポートすること
    - _Requirements: 1.4, 1.5_

  - [ ]* 1.2 `src/utils/contextCalc.test.ts` を新規作成し、Property 1・2 のプロパティテストを実装する
    - **Property 1: 時間帯変換の網羅性** — `fc.integer({ min: 0, max: 23 })` で hour を生成し、全時刻で正しい TimeSlot を返すことを検証する
    - **Validates: Requirements 1.4**
    - **Property 2: 曜日種別変換の網羅性** — `fc.integer({ min: 0, max: 6 })` で day を生成し、0・6 が HOLIDAY、1〜5 が WEEKDAY になることを検証する
    - **Validates: Requirements 1.5**
    - テストタグ: `// Feature: context-aware-feed-map, Property 1: 時間帯変換の網羅性`、`// Feature: context-aware-feed-map, Property 2: 曜日種別変換の網羅性`

- [ ] 2. RecommendContext の実装
  - [ ] 2.1 `src/contexts/RecommendContext.tsx` を新規作成し、`RecommendProvider` と `useRecommendContext` フックを実装する
    - `createContext<RecommendState | null>(null)` で初期化し、`useRecommendContext()` は Provider 外使用時にエラーをスローする
    - `Geolocation.getCurrentPosition()` を呼び出し、成功時は取得座標を、失敗・拒否時はデフォルト座標（35.1815, 136.9066）を `coord` に設定する（タイムアウト 8000ms）
    - 失敗・拒否時は `locationError` に `'現在地を取得できませんでした'` をセットし、`setTimeout` で 3 秒後に `null` にリセットする
    - `calcTimeSlot(new Date().getHours())` と `calcDayType(new Date().getDay())` で `timeSlot`・`dayType` を初期設定する
    - `weather` は `'SUNNY'` 固定
    - `filterTimeSlot`・`filterDayType` の初期値は `timeSlot`・`dayType` と同じにする
    - `isFilterModified` は `filterTimeSlot !== timeSlot || filterDayType !== dayType` を `useMemo` で算出する
    - `sharedReviews: Review[]` と `setSharedReviews` を提供する
    - `locating: boolean` で Geolocation 取得中フラグを管理する
    - _Requirements: 1.1, 1.2, 1.3, 1.4, 1.5, 1.6, 1.7, 3.5, 7.1, 7.2, 7.3_

  - [ ]* 2.2 `src/contexts/RecommendContext.test.tsx` を新規作成し、Property 3・4 のプロパティテストとユニットテストを実装する
    - **Property 3: 位置取得失敗時のデフォルトフォールバック** — 任意の Geolocation エラーコード（0〜3）でモックを失敗させ、`coord` がデフォルト座標（35.1815, 136.9066）になることを検証する
    - **Validates: Requirements 1.3**
    - **Property 4: フィルタリセットの冪等性** — `fc.constantFrom('MORNING', 'AFTERNOON', 'EVENING', 'NIGHT')` と `fc.constantFrom('WEEKDAY', 'HOLIDAY')` で任意の変更値を生成し、変更→リセット後に `filterTimeSlot === timeSlot`、`filterDayType === dayType`、`isFilterModified === false` になることを検証する
    - **Validates: Requirements 3.5, 2.5**
    - ユニットテスト: 初期 `weather` が `'SUNNY'`、ロード完了後に `locating` が `false` になること
    - テストタグ: `// Feature: context-aware-feed-map, Property 3: 位置取得失敗時のデフォルトフォールバック`、`// Feature: context-aware-feed-map, Property 4: フィルタリセットの冪等性`

- [ ] 3. useRecommendFeed フックの実装
  - [ ] 3.1 `src/features/feed/useRecommendFeed.ts` を新規作成し、`/api/reviews/recommend` を呼び出すカスタムフックを実装する
    - インターフェース: `useRecommendFeed(params: RecommendFeedParams): RecommendFeedState`
    - `params` の変化を `JSON.stringify(params)` のキーで検知し、変化のたびに再フェッチする（`useEffect` の依存配列に `paramsKey` を使う）
    - クエリ文字列: `/api/reviews/recommend?lat=${lat}&lon=${lon}&weather=${weather}&timeSlot=${timeSlot}`
    - レスポンス型: `{ reviews: Review[] }`、ページネーションなし（最大 20 件）
    - エラー時は `error` state にメッセージをセットする
    - _Requirements: 2.2, 6.1, 6.2_

  - [ ]* 3.2 `src/features/feed/useRecommendFeed.test.ts` を新規作成し、Property 5 のプロパティテストを実装する
    - **Property 5: レコメンドAPIクエリパラメータの正確な伝達** — `fc.record({ lat: fc.float({min:-90,max:90}), lon: fc.float({min:-180,max:180}), weather: fc.constantFrom('SUNNY'), timeSlot: fc.constantFrom('MORNING','AFTERNOON','EVENING','NIGHT') })` で生成した params をフックに渡し、MSW でキャプチャした URL が全パラメータを正確に含むことを検証する
    - **Validates: Requirements 2.2, 6.1**
    - テストタグ: `// Feature: context-aware-feed-map, Property 5: レコメンドAPIクエリパラメータの正確な伝達`

- [ ] 4. ContextFilterBar コンポーネントの実装
  - [ ] 4.1 `src/components/ContextFilterBar.tsx` を新規作成し、時間帯・曜日種別フィルタチップ UI を実装する
    - `useRecommendContext()` から全データを取得し、props は持たない
    - `locating` が `true` のとき: `LoadingSpinner` を表示する
    - `locationError` があるとき: エラー文字列を表示する（3 秒後は Context 側で自動 null クリア済み）
    - 通常表示: 時間帯チップ + 曜日種別チップをチップ形式で並べる
    - `isFilterModified` が `true` のとき: チップ背景色をオレンジに変更し、リセットボタンを表示する
    - 時間帯チップの `aria-label`: `"時間帯フィルタ: {timeSlotLabel} ({timeRange})"` （例: `"時間帯フィルタ: 昼 (10〜16時)"`）
    - 曜日種別チップの `aria-label`: `"曜日フィルタ: {dayTypeLabel}"` （例: `"曜日フィルタ: 平日"`）
    - リセットボタンの `aria-label`: `"フィルタをリセット"`
    - チップタップ時にドロップダウンで選択肢を表示する（時間帯: 4 種類、曜日種別: 2 種類）
    - _Requirements: 3.1, 3.2, 3.3, 3.4, 3.5, 3.6, 7.1, 7.2, 7.3, 8.1, 8.4_

  - [ ]* 4.2 `src/components/ContextFilterBar.test.tsx` を新規作成し、Property 8 のプロパティテストとユニットテストを実装する
    - **Property 8: aria-labelの動的生成** — `fc.constantFrom('MORNING', 'AFTERNOON', 'EVENING', 'NIGHT')` で TimeSlot を生成し、時間帯チップの `aria-label` に正しい日本語ラベルと時間帯区間文字列が含まれることを検証する
    - **Validates: Requirements 8.1**
    - ユニットテスト: `locating=true` のときスピナーが表示されること、`locationError` があるときエラーメッセージが表示されること（fake timers で 3 秒後に消えることを確認）、`isFilterModified=true` のときリセットボタンが表示されること、時間帯チップタップでドロップダウンが表示されること
    - テストタグ: `// Feature: context-aware-feed-map, Property 8: aria-labelの動的生成`

- [ ] 5. PhotoPin コンポーネントの実装
  - [ ] 5.1 `src/features/map/PhotoPin.tsx` を新規作成し、DivIcon と `renderToStaticMarkup` を使った写真ピンを実装する
    - `renderToStaticMarkup(<PhotoChipHtml review={review} />)` で HTML 文字列を生成し、`L.divIcon({ html, className: '', iconSize: [40, 40], iconAnchor: [20, 20] })` に渡す
    - `photoUrls[0]` が存在する場合: `<img src={photoUrls[0]} alt="{spotName} の口コミ写真" className="w-10 h-10 rounded-full object-cover border-2 border-white shadow-md" />` を表示する
    - `photoUrls` が空の場合: `<div className="w-10 h-10 rounded-full bg-orange-500 border-2 border-white shadow-md" />` を表示する
    - `img` の `onError` ハンドラーでオレンジドットへのフォールバックを実装する
    - `<Popup>` 内に `ReviewPopupContent` を表示する：`spotName`（太字）、`text.slice(0, 60) + (text.length > 60 ? '…' : '')`、`likeCount`、`<Link to={/reviews/${reviewId}}>口コミを見る</Link>`
    - ポップアップに `role="dialog"` を設定し、`useEffect` でフォーカス移動を実装する
    - _Requirements: 5.1, 5.2, 5.3, 5.5, 5.6, 5.7, 8.2, 8.3_

  - [ ]* 5.2 `src/features/map/PhotoPin.test.tsx` を新規作成し、Property 6・7・9 のプロパティテストを実装する
    - **Property 6: 写真ピンのphotoUrls[0]使用とフォールバック** — `fc.record({ ...reviewArb, photoUrls: fc.oneof(fc.array(fc.webUrl(), {minLength:1}), fc.constant([])) })` で口コミを生成し、非空なら `img[src]=photoUrls[0]`、空なら `.bg-orange-500` 要素がレンダリングされることを検証する
    - **Validates: Requirements 5.1, 5.7**
    - **Property 7: ポップアップのコンテンツ完整性** — `fc.record({ spotName: fc.string({minLength:1}), text: fc.string(), likeCount: fc.nat(), reviewId: fc.uuid(), ...他フィールド })` で口コミを生成し、ポップアップ内に `spotName` 全文・`text` 先頭 60 文字・`likeCount`・`/reviews/{reviewId}` リンクが含まれることを検証する
    - **Validates: Requirements 5.5, 5.6**
    - **Property 9: 共有口コミリストのマップピン反映** — `fc.array(reviewArb, { minLength: 0, maxLength: 20 })` でレビューリストを生成し、`sharedReviews` にセットした件数と MapPage がレンダリングする PhotoPin の数が一致することを検証する（react-leaflet はモック）
    - **Validates: Requirements 4.3**
    - テストタグ: `// Feature: context-aware-feed-map, Property 6: 写真ピンのphotoUrls[0]使用とフォールバック`、`// Feature: context-aware-feed-map, Property 7: ポップアップのコンテンツ完整性`、`// Feature: context-aware-feed-map, Property 9: 共有口コミリストのマップピン反映`

- [ ] 6. チェックポイント — コアモジュールのテスト確認
  - すべてのテストが通ることを確認する。問題があればユーザーに確認する。

- [ ] 7. App.tsx への RecommendProvider 追加
  - [ ] 7.1 `src/App.tsx` を修正し、`MileProvider` の内側に `RecommendProvider` をラップする
    - `import { RecommendProvider } from './contexts/RecommendContext'` を追加する
    - 変更前: `<MileProvider><AppRoutes /></MileProvider>`
    - 変更後: `<MileProvider><RecommendProvider><AppRoutes /></RecommendProvider></MileProvider>`
    - _Requirements: 1.7, 4.1_

- [ ] 8. FeedPage の切り替え
  - [ ] 8.1 `src/features/feed/FeedPage.tsx` を修正し、`useRecommendFeed` と `ContextFilterBar` に切り替える
    - `useReviewFeed` の代わりに `useRecommendFeed` を使用する
    - 手動フィルタ state（`area`・`weather`・`timeSlot` の `useState`）を削除し、`useRecommendContext()` からフィルタ状態を取得する
    - ヘッダー内の既存フィルタバーを `<ContextFilterBar />` に置き換える
    - `useEffect([reviews])` で `setSharedReviews(reviews)` を呼び出す
    - エラー時は `role="alert"` バナーとして表示する（既存パターンを維持）
    - _Requirements: 2.1, 2.2, 2.3, 2.4, 4.2, 6.3_

- [ ] 9. MapPage の切り替え
  - [ ] 9.1 `src/features/map/MapPage.tsx` を修正し、`PhotoPin` による口コミピン表示に切り替える
    - `useRecommendContext()` から `sharedReviews` を取得する
    - `fetchSpots`・`spots` の state と fetch ロジックを削除する（スポット表示から口コミピン表示へ完全移行）
    - `sharedReviews.map(r => <PhotoPin key={r.reviewId} review={r} />)` でピンを表示する
    - `sharedReviews` が空のとき「現在の条件に一致する口コミがありません」メッセージを地図オーバーレイとして表示する
    - フッターカウントを口コミ件数に更新する（例: `${sharedReviews.length} 件の口コミを表示中`）
    - _Requirements: 4.3, 4.4, 5.1〜5.7_

- [ ] 10. 最終チェックポイント — 全テスト確認
  - すべてのテストが通ること（`npx vitest --run`）を確認する。問題があればユーザーに確認する。

---

## Notes

- `*` が付いたサブタスクはオプションであり、MVP を優先する場合はスキップ可能
- 各タスクは対象ファイルパスを明記しており、コンテキストなしで実装可能
- PBT（プロパティベーステスト）は `fast-check` を使用する（`npm install --save-dev fast-check`）
- react-leaflet のテストは `vi.mock('react-leaflet', ...)` でモックして DOM テストに集中する
- `renderToStaticMarkup` を使う `PhotoPin.tsx` は Node.js 環境で動作するため、Vitest の jsdom 設定で問題なくテスト可能
- チェックポイントタスクはコーディングエージェントが実装すべきコードを含まない

## Task Dependency Graph

```json
{
  "waves": [
    { "id": 0, "tasks": ["1.1"] },
    { "id": 1, "tasks": ["1.2", "2.1"] },
    { "id": 2, "tasks": ["2.2", "3.1"] },
    { "id": 3, "tasks": ["3.2", "4.1", "5.1"] },
    { "id": 4, "tasks": ["4.2", "5.2"] },
    { "id": 5, "tasks": ["7.1"] },
    { "id": 6, "tasks": ["8.1"] },
    { "id": 7, "tasks": ["9.1"] }
  ]
}
```
