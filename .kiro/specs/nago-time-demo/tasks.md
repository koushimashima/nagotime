# 実装計画: NagoTime デモ版（フロントエンド専用）

## 概要

NagoTime フロントエンドデモ版を、プロジェクトセットアップ → モックデータ → MSW → 共通ユーティリティ → PBT → UI 実装 → テスト の順番で段階的に実装する。バックエンド（Lambda・DynamoDB・Cognito・API Gateway・S3・Bedrock）は使用しない。ブラウザ内で完結するデモとして構築する。

言語: TypeScript / React（フロントエンド全般）

---

## タスク

- [x] 1. Wave 0: プロジェクトセットアップ
  - [x] 1.1 Vite + React + TypeScript プロジェクト初期化
    - `npm create vite@latest . -- --template react-ts` でプロジェクトを作成
    - `tsconfig.json` の `paths` エイリアス（`@/` → `src/`）を設定
    - `vite.config.ts` にパスエイリアスを設定
    - _Requirements: 全般_
    - 推定時間: 30分

  - [x] 1.2 Tailwind CSS のセットアップ
    - `tailwindcss` / `postcss` / `autoprefixer` をインストール
    - `tailwind.config.js` と `postcss.config.js` を作成
    - `src/index.css` に Tailwind ディレクティブを追加
    - _Requirements: 全般_
    - 推定時間: 20分

  - [x] 1.3 react-router-dom v6 のセットアップ
    - `react-router-dom` をインストール
    - `src/App.tsx` に `BrowserRouter` + 基本ルート定義を追加（全画面の空コンポーネントで仮置き）
    - `ProtectedRoute` / `AdminRoute` コンポーネントの骨格を作成
    - _Requirements: 全般_
    - 推定時間: 30分

  - [x] 1.4 MSW v2 のセットアップ
    - `msw` をインストール（`npm install msw --save-dev`）
    - `npx msw init public/ --save` で Service Worker ファイルを生成
    - `src/mocks/browser.ts` のエントリポイントを作成
    - `src/main.tsx` で開発環境時のみ MSW を起動する条件分岐を追加
    - _Requirements: 全般_
    - 推定時間: 30分

  - [x] 1.5 react-leaflet のセットアップ
    - `react-leaflet` / `leaflet` / `@types/leaflet` をインストール
    - `leaflet/dist/leaflet.css` をインポートする設定を追加
    - Leaflet のデフォルトアイコンパス問題（webpack/vite 向け修正）を設定
    - _Requirements: 6.1〜6.7_
    - 推定時間: 20分

  - [x] 1.6 Vitest + Testing Library のセットアップ
    - `vitest` / `@vitest/ui` / `@testing-library/react` / `@testing-library/user-event` / `@testing-library/jest-dom` をインストール
    - `fast-check` をインストール（PBT ライブラリ）
    - `vite.config.ts` に `test` セクションを追加（`environment: 'jsdom'`）
    - `src/test/setup.ts` に `@testing-library/jest-dom` のインポートを追加
    - _Requirements: 全般_
    - 推定時間: 30分

- [x] 2. Wave 1: モックデータ定義
  - [x] 2.1 TypeScript 型定義の作成（`src/mocks/data/types.ts`）
    - `Review`, `Spot`, `User`, `MileTransaction`, `Coupon` インターフェースを定義
    - `ReviewStatus`, `Weather`, `TimeSlot`, `DayType`, `MileTransactionType`, `CouponStatus` 型を定義
    - _Requirements: 1.1〜1.14, 3.1〜3.9, 6.1〜6.7, 8.1〜8.8_
    - 推定時間: 45分

  - [x] 2.2 口コミサンプルデータの作成（`src/mocks/data/reviews.ts`）
    - 20件以上の口コミサンプルを TypeScript 配列として定義
    - 各口コミに多様な weather / timeSlot / dayType / area を持たせる
    - photoUrls は `https://picsum.photos/seed/{id}/400/300` 形式を使用
    - _Requirements: 3.1〜3.9_
    - 推定時間: 45分

  - [x] 2.3 スポットサンプルデータの作成（`src/mocks/data/spots.ts`）
    - 名古屋市内の実在エリア（栄・名古屋駅・大須・今池・覚王山など）10件以上を定義
    - 実際の緯度経度を使用して地図上に正しく表示されるようにする
    - _Requirements: 6.1〜6.7_
    - 推定時間: 30分

  - [x] 2.4 ユーザー・クーポン・取引履歴サンプルデータの作成
    - `src/mocks/data/users.ts`: 一般ユーザー（`demo@example.com`）+ 管理者（`admin@example.com`）
    - `src/mocks/data/coupons.ts`: 5件のクーポンサンプル（ACTIVE/SOLD_OUT/EXPIRED を混在）
    - `src/mocks/data/transactions.ts`: マイル取引履歴サンプル（10件）
    - _Requirements: 8.1〜8.8, 9.1〜9.5_
    - 推定時間: 30分

- [x] 3. Wave 2: MSW ハンドラー実装
  - [x] 3.1 認証ハンドラーの実装（`src/mocks/handlers/auth.ts`）
    - `POST /api/auth/login`: メール/パスワードを検証し User オブジェクトを返す
    - `POST /api/auth/logout`: 成功レスポンスを返す
    - 100〜400ms のランダム遅延を付与する
    - _Requirements: 11.1〜11.5_
    - 推定時間: 30分

  - [x] 3.2 口コミ系ハンドラーの実装（`src/mocks/handlers/reviews.ts`）
    - `GET /api/reviews`: フィルタリング・ページネーション（カーソルベース）・降順ソートを実装
    - `GET /api/reviews/recommend`: スコアリングしてレコメンド結果を返す
    - `GET /api/reviews/:id`: 詳細を返す（存在しない ID は 404）
    - `POST /api/reviews`: バリデーション → メモリ上の配列に追加 → 201 を返す
    - `POST /api/reviews/:id/like`: 重複チェック → likeCount インクリメント → 409 処理
    - 認証必須エンドポイントは Authorization ヘッダーなしで 401 を返す
    - _Requirements: 1.1〜1.14, 3.1〜3.9, 4.1〜4.10, 5.1〜5.5, 7.1〜7.6_
    - 推定時間: 2時間

  - [x] 3.3 スポット・マイル・クーポンハンドラーの実装
    - `GET /api/map/spots`: lat/lon/radius でフィルタリングして返す（`src/mocks/handlers/spots.ts`）
    - `GET /api/miles`: マイル残高 + 履歴を返す（`src/mocks/handlers/miles.ts`）
    - `POST /api/miles/redeem`: 残高チェック → クーポン交換 → コード発行（`src/mocks/handlers/miles.ts`）
    - `GET /api/coupons` / `POST /api/coupons`: 管理者用一覧・登録（`src/mocks/handlers/coupons.ts`）
    - _Requirements: 6.1〜6.7, 8.1〜8.8, 9.1〜9.5_
    - 推定時間: 1.5時間

  - [x] 3.4 MSW ハンドラーのエントリポイント統合（`src/mocks/handlers/index.ts`）
    - 全ハンドラーを配列として export する
    - `src/mocks/browser.ts` でハンドラーを setupWorker に渡す
    - _Requirements: 全般_
    - 推定時間: 15分

- [x] 4. Wave 3: 共通ユーティリティ（純粋関数）
  - [x] 4.1 バリデーション関数の実装（`src/utils/validators.ts`）
    - `validateTextLength(text: string): boolean`（50〜1000文字）を実装
    - `validatePhotoCount(count: number): boolean`（1〜5枚）を実装
    - `validateCoordinates(lat: number, lon: number): boolean`（緯度-90〜90、経度-180〜180）を実装
    - `validateSpotName(name: string): boolean`（1〜100文字）を実装
    - 各バリデーションに対応するエラーメッセージ定数を定義（`src/utils/errorMessages.ts`）
    - _Requirements: 1.2, 1.3, 1.7, 1.8, 1.9, 1.10, 4.9, 6.6_
    - 推定時間: 45分

  - [x] 4.2 時間帯・平日判定関数の実装（`src/utils/timeUtils.ts`）
    - `getTimeSlot(date: Date): TimeSlot`（MORNING: 5〜9時、AFTERNOON: 10〜16時、EVENING: 17〜20時、NIGHT: 21〜4時）を実装
    - `getDayType(date: Date): DayType`（土日 → HOLIDAY、平日 → WEEKDAY）を実装
    - _Requirements: 1.4, 1.6_
    - 推定時間: 30分

  - [x] 4.3 スコアリング計算関数の実装（`src/utils/scoring.ts`）
    - `calcWeatherScore(reviewWeather: Weather, currentWeather: Weather): number`（0.0〜1.0）を実装
    - `calcTimeSlotScore(reviewSlot: TimeSlot, currentSlot: TimeSlot): number`（0.0〜1.0、隣接0.5）を実装
    - `calcDistanceScore(distanceM: number): number`（`Math.max(0, 1 - d/5000)`）を実装
    - `calcLikesScore(likeCount: number): number`（`Math.min(1.0, likeCount/100)`）を実装
    - `calcTotalScore(w: number, t: number, d: number, l: number): number`（重み: 0.30/0.25/0.30/0.15）を実装
    - `recommend(reviews: Review[], context: RecommendContext): Review[]`（降順ソート）を実装
    - _Requirements: 4.1〜4.10_
    - 推定時間: 1.5時間

  - [x] 4.4 フィード取得・フィルタリング関数の実装（`src/utils/feedUtils.ts`）
    - `filterPublished(reviews: Review[]): Review[]`（PUBLISHED のみ）を実装
    - `applyFilters(reviews: Review[], filters: ReviewFilters): Review[]`（AND 条件）を実装
    - `sortByCreatedAtDesc(reviews: Review[]): Review[]`（降順ソート）を実装
    - `paginate(reviews: Review[], cursor: string | null, limit: number): PaginatedResult<Review>` を実装
    - _Requirements: 3.1〜3.9_
    - 推定時間: 1時間

  - [x] 4.5 Haversine 距離計算・スポット検索関数の実装（`src/utils/geoUtils.ts`）
    - `haversine(lat1: number, lon1: number, lat2: number, lon2: number): number`（メートル単位）を実装
    - `filterSpotsByRadius(spots: Spot[], centerLat: number, centerLon: number, radiusM: number): Spot[]` を実装
    - `sortByDistance(spots: Spot[], centerLat: number, centerLon: number): Spot[]` を実装
    - _Requirements: 6.1, 6.5_
    - 推定時間: 45分

  - [x] 4.6 マイル・クーポン関連の純粋関数の実装（`src/utils/mileUtils.ts`）
    - `calcBalance(initial: number, transactions: MileTransaction[]): number`（残高計算）を実装
    - `generateCouponCode(): string`（英数字ランダム文字列、1〜64文字）を実装
    - `injectAds(reviews: Review[], coupons: Coupon[]): (Review | CouponAd)[]`（20件ごとに1件差し込み）を実装
    - _Requirements: 8.3〜8.6, 10.1〜10.5_
    - 推定時間: 45分

- [x] 5. Wave 4: PBT 実装（fast-check）
  - [x] 5.1 バリデーション関数の PBT（`src/utils/__tests__/validators.pbt.test.ts`）
    - **Property 1: テキスト長バリデーションの境界正確性** (`fc.string()`)
    - **Property 2: 写真枚数バリデーションの境界正確性** (`fc.integer({ min: -100, max: 100 })`)
    - **Property 3: 座標バリデーションの境界正確性** (`fc.double()` × 2)
    - タグ: `// Feature: nago-time-demo, Property 1/2/3: ...`
    - _Requirements: 1.2, 1.3, 1.7, 1.8, 1.9, 1.10_
    - 推定時間: 1時間

  - [x] 5.2 時間帯・平日判定の PBT（`src/utils/__tests__/timeUtils.pbt.test.ts`）
    - **Property 4: 時間帯判定の完全性と正確性** (`fc.date()`)
    - **Property 5: 平日/休日判定の完全性** (`fc.date()`)
    - タグ: `// Feature: nago-time-demo, Property 4/5: ...`
    - _Requirements: 1.4, 1.5, 1.6_
    - 推定時間: 1時間

  - [x] 5.3 フィード取得・フィルタリングの PBT（`src/utils/__tests__/feedUtils.pbt.test.ts`）
    - **Property 6: フィードステータスフィルタリング正確性** (`fc.array(reviewArbitrary)`)
    - **Property 7: フィード降順ソート保証** (`fc.array(reviewArbitrary)`)
    - **Property 8: ページネーション件数上限保証** (`fc.array(reviewArbitrary, { maxLength: 200 })`)
    - **Property 9: フィルタリングの AND 条件正確性** (`fc.array(reviewArbitrary)` + `fc.record(filterArbitrary)`)
    - タグ: `// Feature: nago-time-demo, Property 6/7/8/9: ...`
    - _Requirements: 3.1, 3.2, 3.3, 3.5_
    - 推定時間: 1.5時間

  - [x] 5.4 レコメンド・Haversine の PBT（`src/utils/__tests__/scoring.pbt.test.ts`）
    - **Property 10: レコメンドスコアの降順ソート保証** (`fc.array(reviewArbitrary)` + `contextArbitrary`)
    - **Property 11: Haversine スポット範囲内フィルタ正確性** (`fc.array(spotArbitrary)` + `searchArbitrary`)
    - タグ: `// Feature: nago-time-demo, Property 10/11: ...`
    - _Requirements: 4.3, 6.1_
    - 推定時間: 1.5時間

  - [x] 5.5 マイル・クーポン・いいねの PBT（`src/utils/__tests__/mileUtils.pbt.test.ts`）
    - **Property 12: いいね操作の冪等性** (`fc.tuple(fc.string(), fc.string())`)
    - **Property 13: マイル残高の整合性** (`fc.array(transactionArbitrary)`)
    - **Property 14: クーポンコードのフォーマット保証** （引数なし、出力検証のみ）
    - **Property 15: 広告差し込み比率の正確性** (`fc.array(reviewArbitrary, { maxLength: 100 })`)
    - タグ: `// Feature: nago-time-demo, Property 12/13/14/15: ...`
    - _Requirements: 7.2, 7.3, 8.3〜8.6, 10.1, 10.5_
    - 推定時間: 1.5時間

- [x] 6. Wave 5: 認証コンテキスト + レイアウト + 共通コンポーネント
  - [x] 6.1 AuthContext の実装（`src/contexts/AuthContext.tsx`）
    - `AuthProvider` コンポーネントと `useAuth` フックを実装
    - `login(email, password)`: MSW モックへ POST → localStorage に保存
    - `logout()`: localStorage をクリア → `/login` にリダイレクト
    - アプリ起動時に localStorage から認証状態を復元する
    - _Requirements: 11.1〜11.5_
    - 推定時間: 1時間

  - [x] 6.2 MileContext の実装（`src/contexts/MileContext.tsx`）
    - `MileProvider` コンポーネントと `useMile` フックを実装
    - マイル残高・いいね済み口コミ ID セットを localStorage と同期する
    - `addMiles(amount)` / `deductMiles(amount)` / `toggleLike(reviewId)` を実装
    - _Requirements: 7.2, 8.3〜8.5_
    - 推定時間: 1時間

  - [x] 6.3 Layout コンポーネントの実装（`src/components/Layout/`）
    - `Header.tsx`: アプリ名・ナビゲーションリンク（フィード・マップ・マイル）・ログインボタン
    - `BottomNav.tsx`: モバイル向けボトムナビゲーション（フィード・投稿・マップ・マイル）
    - `Layout.tsx`: Header + `<Outlet />` + BottomNav の組み合わせ
    - _Requirements: 全般_
    - 推定時間: 1時間

  - [x] 6.4 共通コンポーネントの実装（`src/components/`）
    - `ReviewCard.tsx`: サムネイル・投稿者名・スポット名・いいね数・天気/時間帯バッジ
    - `WeatherBadge.tsx`: 天気アイコン付きバッジ（SUNNY/CLOUDY/RAINY/SNOWY/UNKNOWN）
    - `TimeBadge.tsx`: 時間帯バッジ（MORNING/AFTERNOON/EVENING/NIGHT）
    - `LoadingSpinner.tsx`: ローディングインジケーター
    - `Modal.tsx`: 確認モーダル（クーポン交換確認などで使用）
    - _Requirements: 3.6, 5.1_
    - 推定時間: 1.5時間

- [x] 7. Wave 6: 口コミフィード画面 + 詳細画面
  - [x] 7.1 ログイン画面の実装（`src/features/auth/LoginPage.tsx`）
    - メールアドレス・パスワードのフォームを実装
    - `useAuth` の `login()` を呼び出し、成功時は `/` にリダイレクト
    - エラー時は「メールアドレスまたはパスワードが正しくありません」を表示
    - デモ用認証情報（`demo@example.com` / `password`）のヒントをフォーム下部に表示
    - _Requirements: 11.1〜11.5_
    - 推定時間: 1時間

  - [x] 7.2 口コミフィード画面の実装（`src/features/feed/FeedPage.tsx`）
    - `GET /api/reviews` を呼び出し、`ReviewCard` グリッドで表示
    - フィルタバー（エリア・天気・時間帯のドロップダウン）を実装
    - 「もっと見る」ボタンによるカーソルページネーションを実装
    - `useReviewFeed` カスタムフック（`src/features/feed/useReviewFeed.ts`）にロジックを分離
    - フィルタ変更時にリストをリセットして再取得する
    - _Requirements: 3.1〜3.9_
    - 推定時間: 2時間

  - [x] 7.3 口コミ詳細画面の実装（`src/features/review/ReviewDetailPage.tsx`）
    - `GET /api/reviews/:id` を呼び出し、詳細情報を表示
    - 写真ギャラリー（最大5枚・スワイプ対応）を実装
    - テキスト・天気バッジ・時間帯バッジ・投稿日時・いいね数を表示
    - いいねボタン: 楽観的 UI 更新 → `POST /api/reviews/:id/like` → 409 時に元に戻す
    - `useMile` の `toggleLike()` と連携してローカル状態を同期する
    - _Requirements: 5.1〜5.5, 7.1〜7.6_
    - 推定時間: 2時間

- [x] 8. Wave 7: 口コミ投稿画面 + マップ画面
  - [x] 8.1 口コミ投稿画面の実装（`src/features/submit/SubmitPage.tsx`）
    - テキストエリア（リアルタイム文字数カウンター付き、50〜1000文字）を実装
    - 写真アップロード（ドラッグ&ドロップ + クリック選択、1〜5枚）を実装
    - スポット名入力（1〜100文字バリデーション）を実装
    - 「現在地を取得」ボタン（Geolocation API）を実装
    - `validateTextLength` / `validatePhotoCount` / `validateCoordinates` を使用してフォームバリデーション
    - `POST /api/reviews` 呼び出し → 成功時フィードにリダイレクト
    - バリデーションエラーをフィールド下にインライン表示する
    - _Requirements: 1.1〜1.14_
    - 推定時間: 2.5時間

  - [x] 8.2 マップ画面の実装（`src/features/map/MapPage.tsx`）
    - `react-leaflet` の `MapContainer` + `TileLayer`（OpenStreetMap）で地図を表示
    - 現在地取得（Geolocation API）→ `GET /api/map/spots?lat=...&lon=...&radius=2000`
    - スポットに `Marker` + `Popup`（スポット名・サムネイル・口コミ数・詳細リンク）を表示
    - 半径スライダー（500m / 1km / 2km / 5km）で検索範囲を変更する
    - Geolocation が拒否された場合は名古屋市中心部（栄）をデフォルト表示する
    - _Requirements: 6.1〜6.7_
    - 推定時間: 2時間

- [x] 9. Wave 8: マイル・クーポン画面 + 管理画面
  - [x] 9.1 マイル・クーポン画面の実装（`src/features/miles/MilesPage.tsx`）
    - `GET /api/miles` を呼び出し、マイル残高と直近10件の取引履歴を表示
    - 有効なクーポン一覧（必要マイル数・有効期限・交換ボタン）を表示
    - 「交換する」ボタン → 確認モーダル → `POST /api/miles/redeem` → クーポンコード表示モーダル
    - 残高不足時は「あと〇マイル必要です」を表示
    - `useMile` の `deductMiles()` でローカル残高を更新する
    - _Requirements: 8.1〜8.8_
    - 推定時間: 2時間

  - [x] 9.2 管理画面の実装（`src/features/admin/AdminPage.tsx`）
    - `sponsor-admin` ロール以外のアクセスを `/` にリダイレクト（`AdminRoute` を使用）
    - クーポン登録フォーム（クーポン名・説明・必要マイル数・有効期限・発行枚数上限）
    - `POST /api/coupons` でクーポンを登録し、成功時に一覧を更新
    - `GET /api/coupons` で登録済みクーポン一覧（交換済み枚数・ステータス）を表示
    - 管理者アカウント情報（`admin@example.com` / `password`）をフォーム下部にヒント表示
    - _Requirements: 9.1〜9.5_
    - 推定時間: 2時間

- [x] 10. Wave 9: 統合テスト + ビルド確認
  - [x] 10.1 共通ユーティリティの単体テスト（example-based）
    - `src/utils/__tests__/validators.test.ts`: 境界値テスト（49/50/1000/1001文字など）
    - `src/utils/__tests__/timeUtils.test.ts`: 各時間帯の代表値テスト
    - `src/utils/__tests__/geoUtils.test.ts`: 既知の2点間距離（名古屋駅〜栄）との照合テスト
    - `src/utils/__tests__/scoring.test.ts`: スコアリング計算の具体例テスト
    - `vitest run` で全テストがグリーンであることを確認する
    - _Requirements: 1.2, 1.3, 1.7, 4.3, 6.1_
    - 推定時間: 1.5時間

  - [x] 10.2 コンポーネントの MSW インテグレーションテスト
    - `src/features/feed/__tests__/FeedPage.test.tsx`: 口コミが表示される・フィルタが機能する
    - `src/features/review/__tests__/ReviewDetailPage.test.tsx`: いいねボタンの楽観的 UI + 409 復元
    - `src/features/submit/__tests__/SubmitPage.test.tsx`: バリデーションエラーのインライン表示
    - `src/features/miles/__tests__/MilesPage.test.tsx`: クーポン交換後の残高減算
    - `vitest run` で全テストがグリーンであることを確認する
    - _Requirements: 3.1, 7.2, 7.3, 8.3〜8.5_
    - 推定時間: 2時間

  - [x] 10.3 ビルド確認とデモ動作検証
    - `vite build` を実行し、エラーなく `dist/` が生成されることを確認する
    - `vite preview` でビルド済みアプリを起動し、全画面の動作を手動確認する
    - MSW が本番ビルドでも正しく動作するか確認する（`import.meta.env.MODE === 'production'` で有効化）
    - デモ用チェックリスト: ログイン / 口コミ閲覧 / 投稿 / いいね / マップ / マイル確認 / クーポン交換
    - _Requirements: 全般_
    - 推定時間: 1時間

---

## Notes

- PBT タスクはすべて `fc.assert(fc.property(...), { numRuns: 100 })` で fast-check を使用し、タグ形式 `// Feature: nago-time-demo, Property {番号}: {名前}` を付与する
- MSW v2 の `delay()` はデフォルトで現実的なネットワーク遅延をシミュレートする
- react-leaflet は SSR 非対応なので、`import.meta.env.SSR` チェックは不要（Vite SPA 構成のため）
- Tailwind CSS の purge 設定（`content`）に `src/**/*.{ts,tsx}` を含めることを確認する
- `vite build` のバンドルサイズが大きい場合は、`react-leaflet` / `leaflet` を dynamic import（`React.lazy`）で遅延読み込みする
- localStorage のキーはすべて `nagotime_` プレフィックスで統一する
- デモ実行環境が Mac/Windows どちらでも動作するよう、Node.js v20 LTS を推奨バージョンとする

## タスク依存グラフ

```json
{
  "waves": [
    {
      "id": 0,
      "label": "プロジェクトセットアップ",
      "tasks": ["1.1", "1.2", "1.3", "1.4", "1.5", "1.6"]
    },
    {
      "id": 1,
      "label": "モックデータ定義",
      "tasks": ["2.1", "2.2", "2.3", "2.4"]
    },
    {
      "id": 2,
      "label": "MSWハンドラー実装",
      "tasks": ["3.1", "3.2", "3.3", "3.4"]
    },
    {
      "id": 3,
      "label": "共通ユーティリティ",
      "tasks": ["4.1", "4.2", "4.3", "4.4", "4.5", "4.6"]
    },
    {
      "id": 4,
      "label": "PBT実装",
      "tasks": ["5.1", "5.2", "5.3", "5.4", "5.5"]
    },
    {
      "id": 5,
      "label": "認証・レイアウト・共通コンポーネント",
      "tasks": ["6.1", "6.2", "6.3", "6.4"]
    },
    {
      "id": 6,
      "label": "フィード・詳細画面",
      "tasks": ["7.1", "7.2", "7.3"]
    },
    {
      "id": 7,
      "label": "投稿・マップ画面",
      "tasks": ["8.1", "8.2"]
    },
    {
      "id": 8,
      "label": "マイル・管理画面",
      "tasks": ["9.1", "9.2"]
    },
    {
      "id": 9,
      "label": "統合テスト・ビルド確認",
      "tasks": ["10.1", "10.2", "10.3"]
    }
  ]
}
```
