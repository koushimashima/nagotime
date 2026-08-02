# NagoTime デモ版 仕様書

**バージョン:** 1.0  
**対象:** AIコンテスト提出用デモアプリ（フロントエンドのみ構成）  
**最終更新:** 2026-08-03

---

## 1. 概要

### 1.1 アプリの目的

NagoTime は名古屋エリアの飲食店・観光スポット・地域施設の口コミを投稿・閲覧できる学生向けローカルガイドアプリ。ユーザーの現在地・時間帯・天気をコンテキストとして口コミをAIスコアリングでレコメンドし、投稿するとマイルが貯まり地域店舗のクーポンと交換できる。

### 1.2 デモ版の位置付け

本仕様書が対象とするデモ版は、**バックエンドサーバーを持たない純フロントエンド構成**である。すべてのAPIリクエストはブラウザ内で動作するMSW（Mock Service Worker）がインターセプトし、あらかじめ定義されたモックデータを返す。

| 項目 | デモ版 |
|---|---|
| バックエンド | なし（MSWモック） |
| 認証 | ハードコードされたデモ用アカウント |
| データ永続化 | なし（ページリロードでリセット） |
| 画像ストレージ | picsum.photos の外部URLを使用 |
| 天気情報 | 常時 SUNNY（固定） |
| デプロイ先 | ローカル / Amplify Hosting（静的サイト） |

---

## 2. 機能仕様

### 2.1 認証

#### 2.1.1 ログイン

- メールアドレス＋パスワードによるフォーム認証
- デモ用アカウント: `demo@example.com` / `password`
- ログイン成功時: JWTトークンを `AuthContext` に保持し、フィード画面（`/`）にリダイレクト
- ログイン失敗時: 「メールアドレスまたはパスワードが正しくありません」を表示
- ログイン済みの場合、ログイン画面アクセスで `/` に自動リダイレクト

#### 2.1.2 認可

| 画面 | ログイン要否 |
|---|---|
| フィード閲覧 | 不要 |
| 口コミ詳細閲覧 | 不要 |
| マップ閲覧 | 不要 |
| 口コミ投稿 | **必須** |
| マイル・チケット | **必須** |
| 管理画面 | **必須**（adminロールのみ） |

---

### 2.2 フィード画面（`/`）

#### 2.2.1 コンテキスト自動検出

アプリ起動時に以下を自動取得し、`RecommendContext` に保持する。

| コンテキスト要素 | 取得方法 | フォールバック |
|---|---|---|
| 現在地（緯度・経度） | Geolocation API（タイムアウト8秒） | 栄: 35.1815, 136.9066 |
| 時間帯（TimeSlot） | 端末の現在時刻 | — |
| 曜日種別（DayType） | 端末の現在日付 | — |
| 天気（Weather） | 固定値 `SUNNY` | — |

**時間帯の区分:**

| TimeSlot | 時間帯 |
|---|---|
| MORNING | 5〜9時 |
| AFTERNOON | 10〜16時 |
| EVENING | 17〜20時 |
| NIGHT | 21〜4時 |

**曜日種別の区分:**

| DayType | 曜日 |
|---|---|
| WEEKDAY | 月〜金 |
| HOLIDAY | 土・日 |

#### 2.2.2 AIレコメンドスコアリング

`/api/reviews/recommend` に現在のコンテキストをクエリパラメータとして渡し、スコア降順の口コミリストを取得する。

スコア計算式:

```
totalScore = 天気スコア×0.30 + 時間帯スコア×0.25 + 距離スコア×0.30 + いいね数スコア×0.15
```

各スコアの算出ルール:

| スコア | 計算式 |
|---|---|
| 天気スコア | 一致: 1.0 / UNKNOWN: 0.5 / 不一致: 0.0 |
| 時間帯スコア | 一致: 1.0 / 隣接: 0.5 / 不一致: 0.0 |
| 距離スコア | `max(0, 1 - d/5000)` ※dはメートル |
| いいね数スコア | `min(1.0, likeCount/100)` |

#### 2.2.3 コンテキストフィルタバー

- 時間帯・曜日種別のフィルタチップをヘッダーに常時表示
- チップをタップするとドロップダウンで選択肢を切り替え可能
- 自動取得値から変更した場合: チップ背景をオレンジに変更、リセットボタンを表示
- リセットボタンで全フィルタを自動取得値に戻す
- 現在地取得中: ローディングスピナーを表示
- 現在地取得失敗時: エラーメッセージを3秒後に自動非表示

#### 2.2.4 口コミ一覧表示

- 2カラムグリッドレイアウトでカード表示
- 各カードにスポット名・サムネイル・テキスト冒頭・いいね数を表示
- カードタップで詳細画面（`/reviews/:id`）に遷移
- 表示件数: 最大20件

---

### 2.3 口コミ詳細画面（`/reviews/:id`）

- スポット名・全文テキスト・写真（スライダー）・位置情報・投稿日時・いいね数を表示
- いいね数はタップで増減（ログイン不要）

---

### 2.4 マップ画面（`/map`）

#### 2.4.1 地図表示

- OpenStreetMap + Leaflet による地図を全画面表示
- 初期表示: 栄（35.1815, 136.9066）、ズーム14
- 現在地ボタンで地図を現在位置にアニメーション移動（flyTo）
- 現在地は青い点と精度リングで表示

#### 2.4.2 口コミピン表示

フィード画面で取得した `sharedReviews`（最大20件）を写真ピンとして表示する。

- ピンアイコン: 直径40px の丸形、白2pxボーダー＋ドロップシャドウ
- 写真あり: `photoUrls[0]` を丸くクリッピングした画像
- 写真なし: オレンジ色の塗りつぶし円
- 画像読み込みエラー時: オレンジ円にフォールバック
- `sharedReviews` が空のとき: 「現在の条件に一致する口コミがありません」を地図上にオーバーレイ表示

#### 2.4.3 ポップアップ

ピンをタップすると表示:
- スポット名（太字）
- テキスト冒頭60文字（超過分は「…」）
- いいね数
- 「口コミを見る」リンク → `/reviews/:id` に遷移

---

### 2.5 口コミ投稿画面（`/submit`）

#### 2.5.1 入力フィールド

| フィールド | バリデーション |
|---|---|
| スポット名 | 1〜100文字、必須 |
| テキスト | 50〜1000文字、必須 |
| 写真 | 1〜5枚、必須 |
| 位置情報 | Geolocation API取得、必須 |
| ハッシュタグ | 任意、プリセット＋動的サジェスト |

#### 2.5.2 写真アップロード

- クリック選択またはドラッグ&ドロップで追加
- 追加時にサムネイルプレビューを表示
- 各写真を個別に削除可能（×ボタン）
- デモ版では picsum.photos のランダム画像URLを実際のアップロード先として使用

#### 2.5.3 投稿フロー

1. バリデーションチェック（エラーはフィールド下にインライン表示）
2. `POST /api/reviews` を呼び出す
3. 成功時: `addMiles(10)` で10マイル付与 → フィード画面にリダイレクト
4. 失敗時: 送信エラーメッセージを表示

---

### 2.6 マイル・チケット画面（`/miles`）

#### 2.6.1 マイル残高

- オレンジのグラデーションカードで残高を大きく表示
- 「取引履歴」トグルで最新5件の履歴を展開表示

**マイル付与の種別:**

| 種別 | 付与量 |
|---|---|
| 口コミ投稿 | 10マイル |
| いいね達成 | 可変（モック） |
| 閲覧数達成 | 可変（モック） |

#### 2.6.2 チケット一覧

- 交換可能なチケットを優先的に上位表示
- チケットカードに: スポンサー名・チケット名・必要マイル・有効期限・サムネイルを表示
- マイル不足の場合: 「あと○○マイル必要です」を表示し交換ボタンを無効化
- カードタップで詳細モーダル（ボトムシート）を表示

#### 2.6.3 チケット交換フロー

1. 「交換する」ボタンをタップ
2. 確認モーダルで内容と交換後残高を表示
3. `POST /api/tickets/redeem` を呼び出す
4. 成功時: QRコードと英数字コードをモーダル表示
5. **注意:** デモ版のQRコードは実際には利用不可

---

### 2.7 管理画面（`/admin`）

- 管理者（adminロール）のみアクセス可能
- 協賛企業によるチケット（クーポン）の登録・管理機能

---

## 3. APIエンドポイント（MSWモック）

すべてのエンドポイントはMSWによりブラウザ内でモックされる。レスポンスはメモリ上のモックデータから返され、外部通信は発生しない。

| メソッド | パス | 認証 | 説明 |
|---|---|---|---|
| GET | `/api/reviews` | 不要 | 口コミ一覧取得 |
| POST | `/api/reviews` | 必須 | 口コミ投稿 |
| GET | `/api/reviews/recommend` | 不要 | コンテキストベースレコメンド |
| GET | `/api/reviews/:id` | 不要 | 口コミ詳細取得 |
| POST | `/api/reviews/:id/like` | 必須 | いいね登録 |
| GET | `/api/miles` | 必須 | マイル残高・履歴取得 |
| GET | `/api/tickets/active` | 不要 | 有効チケット一覧取得 |
| POST | `/api/tickets/redeem` | 必須 | チケット交換 |

---

## 4. データ型定義

### Review

```typescript
type Review = {
  reviewId: string
  userId: string
  spotName: string
  lat: number
  lon: number
  text: string
  photoUrls: string[]
  weather: 'SUNNY' | 'CLOUDY' | 'RAINY' | 'SNOWY' | 'UNKNOWN'
  timeSlot: 'MORNING' | 'AFTERNOON' | 'EVENING' | 'NIGHT'
  dayType: 'WEEKDAY' | 'HOLIDAY'
  likeCount: number
  viewCount: number
  hashtags: string[]
  status: 'published' | 'pending' | 'rejected'
  createdAt: string  // ISO 8601
}
```

### Ticket

```typescript
type Ticket = {
  ticketId: string
  sponsorName: string
  name: string
  description: string
  thumbnailUrl: string
  requiredMiles: number
  expiresAt: string  // ISO 8601
}
```

### MileTransaction

```typescript
type MileTransaction = {
  transactionId: string
  userId: string
  type: 'GRANT_REVIEW' | 'GRANT_LIKES' | 'GRANT_VIEWS' | 'REDEEM_TICKET'
  amount: number
  createdAt: string  // ISO 8601
}
```

---

## 5. 技術スタック

| 分類 | 採用技術 | バージョン |
|---|---|---|
| フレームワーク | React | 18.3.x |
| 言語 | TypeScript | 5.7.x |
| ビルドツール | Vite | 6.x |
| スタイリング | Tailwind CSS | 3.4.x |
| ルーティング | React Router | v6.28.x |
| 地図 | React Leaflet / Leaflet | 4.2.x / 1.9.x |
| QRコード | react-qr-code | 2.0.x |
| APIモック | MSW | 2.7.x |
| テスト | Vitest / Testing Library | 2.1.x / 16.x |
| プロパティテスト | fast-check | 3.23.x |

---

## 6. 状態管理

アプリ全体の状態は React Context で管理する。

| Context | 保持する状態 |
|---|---|
| `AuthContext` | ユーザー情報・認証状態・ログイン/ログアウト関数 |
| `MileContext` | マイル残高（ローカル）・addMiles / deductMiles 関数 |
| `RecommendContext` | 現在地・天気・時間帯・曜日種別・フィルタ状態・共有口コミリスト |

Context の階層:

```
BrowserRouter
  └─ AuthProvider
       └─ MileProvider
            └─ RecommendProvider
                 └─ AppRoutes
```

---

## 7. アクセシビリティ対応

- フィルタチップに `aria-label`（例: `"時間帯フィルタ: 昼 (10〜16時)"`）
- 口コミピンの img に `alt="{spotName} の口コミ写真"`
- ポップアップに `role="dialog"` とフォーカス移動
- リセットボタンに `aria-label="フィルタをリセット"`
- エラーメッセージに `role="alert"`

---

## 8. テスト方針

プロパティベーステスト（PBT）を中心に、境界値と不変条件を検証する。

| テスト | 対象 | 検証内容 |
|---|---|---|
| Property 1 | contextCalc | 全時刻（0〜23時）で正しいTimeSlotを返す |
| Property 2 | contextCalc | 全曜日（0〜6）で正しいDayTypeを返す |
| Property 3 | RecommendContext | 位置取得失敗時はデフォルト座標にフォールバック |
| Property 4 | RecommendContext | フィルタ変更→リセット後の冪等性 |
| Property 5 | useRecommendFeed | APIクエリパラメータが正確に伝達される |
| Property 6 | PhotoPin | photoUrls[0]使用とオレンジ円フォールバック |
| Property 7 | PhotoPin | ポップアップのコンテンツ完整性 |
| Property 8 | ContextFilterBar | aria-labelの動的生成 |
| Property 9 | MapPage | sharedReviewsのピン数一致 |

```bash
# テスト実行
npm test

# テスト（ウォッチモード）
npm run test:watch

# テストUI
npm run test:ui
```

---

## 9. 制約・既知の制限

- チケット交換のQRコードは実際に利用不可（デモ表示のみ）
- データはページリロードでリセットされる（永続化なし）
- 天気は常時SUNNY固定（外部天気APIは使用しない）
- 投稿写真は実際にはアップロードされず、picsum.photosのURLを使用
- 現在地取得はブラウザのGeolocation権限が必要
