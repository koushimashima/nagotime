# 要件定義書 — コンテキスト対応フィード・マップ連携

## Introduction

NagoTime の口コミフィード画面とマップ画面に、コンテキスト対応フィルタリング機能と
フィード・マップ連携機能を追加する。

現在のフィード画面は手動フィルタ（エリア・天気・時間帯）のみで、ユーザーが自分で条件を
設定する必要がある。本機能では、ユーザーの現在地・現在の時間帯・今日が平日か休日かを自動取得し、
それらにマッチする口コミをデフォルトで上位表示する。天気はデモ用として常に `SUNNY`（晴れ）
として固定する（外部天気 API は使用しない）。また、フィード画面で表示されている口コミを
マップ上にピン表示し、ピン内に丸く切り抜いた口コミ写真を表示する。

### 前提知識（コードベース）

- `Review` 型は `lat`, `lon`, `weather`, `timeSlot`, `dayType` フィールドを持つ
- スコアリングロジックは `/api/reviews/recommend` エンドポイントに実装済み（天気×0.30、時間帯×0.25、距離×0.30、いいね×0.15）
- `RecommendContext` 型：`{ lat, lon, weather, timeSlot, dayType }`
- `Weather` 型：`SUNNY | CLOUDY | RAINY | SNOWY | UNKNOWN`（デモでは常に `SUNNY` を使用）
- `TimeSlot` 型：`MORNING | AFTERNOON | EVENING | NIGHT`
- `DayType` 型：`WEEKDAY | HOLIDAY`

---

## Glossary

- **Feed_Screen**: 口コミフィード画面（`/` ルート、`FeedPage.tsx`）
- **Map_Screen**: マップ画面（`/map` ルート、`MapPage.tsx`）
- **Context**: ユーザーの現在地（緯度・経度）、現在の天気、現在の時間帯、今日の曜日種別（平日/休日）の4要素のまとまり
- **Context_Provider**: Context を自動取得・管理する React カスタムフックまたはコンテキスト
- **Context_Filter**: Context の4要素をデフォルトフィルタ値として適用するフィルタリング状態
- **Context_Filter_Bar**: フィード画面上部に表示される、Context_Filter の現在値を表示しユーザーが変更できる最小限のUI
- **Score**: 口コミと Context の一致度を示す 0.0〜1.0 の数値（`/api/reviews/recommend` のスコアリングロジックに準拠）
- **Recommend_Feed**: Context に基づくスコア降順で表示される口コミリスト
- **Feed_Pin**: マップ画面上に表示される、口コミの位置と写真を示すピンマーカー
- **Photo_Chip**: Feed_Pin の中心に表示される、口コミのサムネイル写真を丸く切り抜いたUI要素
- **Shared_Filter_State**: フィード画面とマップ画面で共有されるフィルタ状態
- **Context_Detection**: Geolocation API、天気推定、時刻からの時間帯計算、日付からの曜日種別判定を行う処理

---

## Requirements

### Requirement 1: コンテキストの自動取得

**User Story:** ユーザーとして、アプリを開いたとき自分の現在地・天気・時間帯・曜日種別が
自動的に取得されることを望む。これにより、手動で条件を設定しなくても今の状況に合った
口コミが表示される。

#### Acceptance Criteria

1. WHEN Feed_Screen が初期表示されるとき、THE Context_Provider SHALL ブラウザの
   Geolocation API を使用して現在地（緯度・経度）の取得を試みる

2. WHEN 現在地の取得が成功するとき、THE Context_Provider SHALL 取得した緯度・経度を
   Context に設定する

3. IF 現在地の取得が拒否または失敗するとき、THEN THE Context_Provider SHALL
   栄のデフォルト座標（緯度 35.1815、経度 136.9066）を Context の位置情報として使用する

4. WHEN Context_Provider が初期化されるとき、THE Context_Provider SHALL
   現在時刻のローカル時間（時）から時間帯を次の規則で決定する：
   5〜9時 → `MORNING`、10〜16時 → `AFTERNOON`、17〜20時 → `EVENING`、
   21〜23時および 0〜4時 → `NIGHT`

5. WHEN Context_Provider が初期化されるとき、THE Context_Provider SHALL
   現在日付の曜日から曜日種別を次の規則で決定する：
   土曜日または日曜日 → `HOLIDAY`、月曜日〜金曜日 → `WEEKDAY`

6. WHEN Context_Provider が初期化されるとき、THE Context_Provider SHALL
   デモ用として天気を `SUNNY`（晴れ）として固定設定する（外部天気 API は使用しない）

7. THE Context_Provider SHALL 取得した Context 情報を React コンテキスト経由で
   Feed_Screen と Map_Screen の両方に提供する

---

### Requirement 2: コンテキストベースのデフォルトフィード表示

**User Story:** ユーザーとして、フィード画面を開いたとき自分の現在地・時間帯・曜日種別に
マッチする口コミが自動的に優先表示されることを望む。手動でフィルタを設定しなくても
今の状況に合ったコンテンツが見つかる。

#### Acceptance Criteria

1. WHEN Feed_Screen が初期表示されるとき、THE Feed_Screen SHALL
   Context_Filter の初期値として現在の時間帯（`timeSlot`）と曜日種別（`dayType`）を
   自動設定する（エリアと天気は「すべて」のまま）

2. WHEN Feed_Screen の初期フィルタが設定されるとき、THE Feed_Screen SHALL
   `/api/reviews/recommend` エンドポイントに対して Context の
   `lat`、`lon`、`weather`、`timeSlot` を含むクエリパラメータを送信する

3. WHEN `/api/reviews/recommend` からレスポンスが返るとき、THE Feed_Screen SHALL
   スコア降順で並んだ口コミリストをデフォルト表示として使用する

4. WHEN Context_Filter の `timeSlot` または `dayType` がユーザーにより変更されるとき、
   THE Feed_Screen SHALL 変更後のフィルタ値で口コミリストをリセットして再取得する

5. WHEN Context_Filter の全条件がデフォルト値（自動取得した Context と同じ値）と一致するとき、
   THE Context_Filter_Bar SHALL コンテキスト自動適用中であることをユーザーに示すインジケーターを表示する

---

### Requirement 3: 最小限のコンテキストフィルタバー

**User Story:** ユーザーとして、自動設定されたコンテキストフィルタを必要なときだけ変更できる
最小限のUIを望む。デフォルトではすっきりした画面で、必要なときだけ条件を変更できる。

#### Acceptance Criteria

1. THE Context_Filter_Bar SHALL フィード画面ヘッダー内に、現在適用中の
   時間帯（`timeSlot`）と曜日種別（`dayType`）のフィルタ値をチップ形式で表示する

2. WHEN ユーザーが Context_Filter_Bar の時間帯チップをタップするとき、
   THE Context_Filter_Bar SHALL 時間帯の選択肢（朝・昼・夕・夜）をドロップダウンまたは
   ボトムシート形式で表示する

3. WHEN ユーザーが Context_Filter_Bar の曜日種別チップをタップするとき、
   THE Context_Filter_Bar SHALL 曜日種別の選択肢（平日・休日）をドロップダウン形式で表示する

4. WHEN Context_Filter がユーザーによって自動取得値から変更されているとき、
   THE Context_Filter_Bar SHALL 変更されているフィルタチップを視覚的に強調表示する
   （背景色の変化など）

5. WHEN ユーザーがリセットボタンをタップするとき、THE Context_Filter_Bar SHALL
   全フィルタ値を現在の Context の自動取得値に戻す

6. IF Context_Filter が変更されておりリセット可能な状態にあるとき、
   THEN THE Context_Filter_Bar SHALL リセットボタンを表示する

---

### Requirement 4: フィード・マップ間のフィルタ状態共有

**User Story:** ユーザーとして、フィード画面で見ている口コミがマップ上でも同じ条件で
表示されることを望む。フィード画面からマップ画面に移動したとき、同じ口コミが地図上に
ピン表示されると場所を把握しやすい。

#### Acceptance Criteria

1. THE Shared_Filter_State SHALL フィード画面とマップ画面の間でグローバルに共有される

2. WHEN フィード画面のフィルタ条件が変更されるとき、THE Shared_Filter_State SHALL
   変更後のフィルタ条件をアプリ全体に反映する

3. WHEN Map_Screen が表示されるとき、THE Map_Screen SHALL
   Shared_Filter_State に含まれる現在のフィード口コミリスト（最大 20 件）を
   Feed_Pin として地図上に表示する

4. WHEN Map_Screen が表示されるとき、THE Map_Screen SHALL
   Shared_Filter_State に含まれる口コミリストが空の場合に「現在の条件に一致する口コミがありません」
   というメッセージを地図上に表示する

---

### Requirement 5: マップ上の口コミ写真ピン表示

**User Story:** ユーザーとして、マップ上に写真付きのピンが表示されることで、口コミの内容を
地図から直感的に把握できることを望む。写真を見るだけでどんな場所か分かる。

#### Acceptance Criteria

1. WHEN Feed_Pin がマップ上に描画されるとき、THE Feed_Pin SHALL
   対応する口コミの最初の写真 URL（`photoUrls[0]`）を取得して Photo_Chip として表示する

2. THE Photo_Chip SHALL 直径 40px の円形にクリッピングされた口コミサムネイル画像として
   レンダリングされる

3. THE Photo_Chip SHALL 白色の 2px ボーダーと軽いドロップシャドウを持つ

4. WHEN 複数の Feed_Pin が近接して重なるとき、THE Map_Screen SHALL
   ズームレベルに応じてピンが自然に分散表示されるよう leaflet のデフォルト挙動を維持する

5. WHEN ユーザーが Feed_Pin をタップするとき、THE Map_Screen SHALL
   対応する口コミの `spotName`、`text`（最大 60 文字）、`likeCount` を含む
   ポップアップを表示する

6. WHEN ポップアップが表示されているとき、THE Map_Screen SHALL
   「口コミを見る」リンクをポップアップ内に表示し、タップすると `/reviews/:id` に遷移する

7. IF 口コミの `photoUrls` 配列が空の場合、THEN THE Feed_Pin SHALL
   写真の代わりにデフォルトのオレンジ色のドット（直径 40px）を Photo_Chip として表示する

---

### Requirement 6: 現在地周辺優先の口コミ表示

**User Story:** ユーザーとして、自分がいる場所の近くの口コミが優先的に表示されることを望む。
遠い場所の口コミより近くの情報の方が今すぐ役立つ。

#### Acceptance Criteria

1. WHEN Recommend_Feed が取得されるとき、THE Feed_Screen SHALL
   `/api/reviews/recommend` に対して Context の緯度・経度を `lat`・`lon` パラメータとして
   渡すことで、距離スコアを含む総合スコア順に口コミを取得する

2. WHEN Context の緯度・経度が更新されるとき（現在地取得成功後など）、
   THE Feed_Screen SHALL Recommend_Feed を再取得する

3. WHILE 現在地の取得が進行中のとき、THE Feed_Screen SHALL
   デフォルト座標（栄）を使用して暫定的な口コミリストを表示する

---

### Requirement 7: Context_Provider の状態とロード管理

**User Story:** ユーザーとして、現在地取得中の状態が分かりやすく表示されることを望む。
ロード中に何も表示されないと不安になる。

#### Acceptance Criteria

1. WHILE Context_Provider が現在地を取得中のとき、THE Context_Filter_Bar SHALL
   現在地取得中であることを示すインジケーター（ローディングアニメーションなど）を表示する

2. WHEN 現在地の取得が完了するとき（成功・失敗どちらの場合も）、
   THE Context_Filter_Bar SHALL ロードインジケーターを非表示にする

3. IF 現在地の取得が失敗するとき、THEN THE Context_Filter_Bar SHALL
   「現在地を取得できませんでした」というメッセージをフィルタバー内に一時表示し、
   3 秒後に自動的に非表示にする

---

### Requirement 8: アクセシビリティ対応

**User Story:** スクリーンリーダーのユーザーとして、フィルタバーの内容と操作方法が
音声で伝わることを望む。

#### Acceptance Criteria

1. THE Context_Filter_Bar SHALL 各フィルタチップに `aria-label` 属性を設定し、
   現在の値（例：「時間帯フィルタ: 昼 (10〜16時)」）を含める

2. THE Feed_Pin SHALL `alt` 属性を持つ `img` 要素として実装し、
   `{spotName} の口コミ写真` という代替テキストを設定する

3. WHEN Feed_Pin のポップアップが開くとき、THE Map_Screen SHALL
   ポップアップにフォーカスを移動させ、`role="dialog"` を設定する

4. THE Context_Filter_Bar のリセットボタン SHALL `aria-label="フィルタをリセット"` 属性を持つ
