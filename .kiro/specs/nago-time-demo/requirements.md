# 要件定義書 — NagoTime デモ版

## はじめに

NagoTime は「学生の、学生による、学生と地域のためのローカルガイド」をコンセプトとした、名古屋市内向けの学生特化型地域口コミ＆クーポンアプリのデモ版である。本書は地域創生・社会課題解決AIコンテスト向けに開発する約3〜4週間のデモ版に対する要件を定義する。フロントエンドはAmplify Hosting、APIはAPI Gateway + Lambda、データベースはDynamoDB、AI機能はBedrockを用いたサーバーレス構成で実装する。

---

## 用語集

- **Review（口コミ）**: ユーザーがスポットに対して投稿するテキスト・写真・状況情報を含む記録
- **Spot（スポット）**: 口コミ投稿の対象となる名古屋市内の場所（飲食店・観光地・施設など）
- **Mile（マイル）**: 口コミ投稿や閲覧数・いいね数に応じてユーザーに付与されるポイント
- **Coupon（クーポン）**: マイルと交換可能な協賛企業提供の特典（映画チケット・食事券・ドリンクチケットなど）
- **Sponsor（協賛企業）**: クーポンを提供し広告を掲載する地域店舗・企業
- **Review_Submission_Service（口コミ投稿サービス）**: 口コミの入力検証・保存・マイル付与を担うバックエンドコンポーネント
- **Review_Feed_Service（口コミフィードサービス）**: 口コミ一覧の取得・フィルタリングを担うバックエンドコンポーネント
- **Map_Service（マップサービス）**: 地図ベースのスポット検索・表示を担うバックエンドコンポーネント
- **Mile_Service（マイルサービス）**: マイルの付与・集計・交換を担うバックエンドコンポーネント
- **Quality_Guard（品質ガード）**: 画像解析と文字数チェックによる低品質投稿の排除を担うコンポーネント
- **Image_Analyzer（画像解析器）**: Bedrockを用いて画像の適切性・関連性を判定するコンポーネント
- **Ad_Service（広告サービス）**: クーポン差し込み表示および協賛企業広告を管理するコンポーネント
- **User（ユーザー）**: NagoTimeに登録した学生ユーザー
- **Sponsor_Admin（協賛企業管理者）**: クーポン・広告を管理する協賛企業の担当者

---

## 要件

### 要件1: 口コミ投稿

**ユーザーストーリー:** 学生として、スポットの口コミを投稿したい。そうすることで、他の学生に有益な情報を共有し、マイルを獲得できる。

#### 受け入れ基準

1. WHEN ユーザーが口コミ投稿フォームを送信したとき、THE Review_Submission_Service SHALL 投稿内容を受け付け、DynamoDB に保存する。
2. THE Review_Submission_Service SHALL 投稿テキストが50文字以上1000文字以下であることを検証する。
3. THE Review_Submission_Service SHALL 投稿に1枚以上5枚以下の写真が含まれることを検証する。
4. WHEN ユーザーが口コミを投稿したとき、THE Review_Submission_Service SHALL 投稿日時から WEEKDAY / HOLIDAY を自動判定して記録する。
5. WHEN ユーザーが口コミを投稿したとき、THE Review_Submission_Service SHALL 投稿時の位置情報を使って天気情報（SUNNY / CLOUDY / RAINY / SNOWY）を外部天気APIから自動取得して記録する。
6. WHEN ユーザーが口コミを投稿したとき、THE Review_Submission_Service SHALL 投稿時刻から時間帯（MORNING: 5〜10時 / AFTERNOON: 10〜17時 / EVENING: 17〜21時 / NIGHT: 21〜5時）を自動判定して記録する。
7. THE Review_Submission_Service SHALL 投稿にスポット名称（1文字以上100文字以下）および有効な緯度（-90.0以上90.0以下）・経度（-180.0以上180.0以下）が含まれることを検証する。
8. IF 投稿テキストが50文字未満または1000文字超の場合、THEN THE Review_Submission_Service SHALL 投稿を拒否し、「テキストは50文字以上1000文字以下で入力してください」というエラーメッセージを返す。
9. IF 写真が0枚または6枚以上の場合、THEN THE Review_Submission_Service SHALL 投稿を拒否し、「写真は1枚以上5枚以下で添付してください」というエラーメッセージを返す。
10. IF スポット名称・緯度経度のいずれかが欠落または無効な値である場合、THEN THE Review_Submission_Service SHALL 投稿を拒否し、欠落・無効なフィールド名を含むエラーメッセージを返す。
11. IF 外部天気APIからの天気情報取得に失敗した場合、THEN THE Review_Submission_Service SHALL 天気情報を UNKNOWN として記録し、投稿処理を継続する。
12. IF 投稿時の位置情報（緯度・経度）が取得できない場合、THEN THE Review_Submission_Service SHALL 投稿を拒否し、「位置情報を有効にして投稿してください」というエラーメッセージを返す。
13. WHEN 口コミが正常に保存されたとき、THE Mile_Service SHALL 投稿ユーザーに10マイルを付与する。
14. IF Mile_Service へのマイル付与処理が失敗した場合、THEN THE Review_Submission_Service SHALL 口コミの保存を維持し、マイル付与失敗をログに記録してユーザーに「投稿は完了しましたが、マイル付与に失敗しました」と通知する。

### 要件2: 画像品質チェック

**ユーザーストーリー:** プラットフォーム運営者として、不適切または無関係な画像を含む投稿を自動的に検出・除外したい。そうすることで、アプリの品質と安全性を担保できる。

#### 受け入れ基準

1. WHEN 口コミ投稿に写真が添付されたとき、THE Image_Analyzer SHALL Bedrock（Nova Micro または Nova Lite）を呼び出して各画像の適切性（暴力・性的・差別的コンテンツの有無）と関連性（スポットとの関連性）を判定する。
2. WHEN 画像解析が完了したとき、THE Image_Analyzer SHALL 判定結果（PASS / FAIL）・理由・判定日時をDynamoDBに記録する。
3. IF 画像が不適切（暴力・性的・差別的コンテンツ）と判定された場合、THEN THE Quality_Guard SHALL 投稿全体を非公開状態に設定し、ユーザーに規約違反を示すエラーメッセージを返す。
4. IF 画像がスポットと無関係（白紙・ランダムなスクリーンショットなど）と判定された場合、THEN THE Quality_Guard SHALL 投稿全体を非公開状態に設定し、ユーザーにスポット関連写真の使用を求めるエラーメッセージを返す。
5. WHILE 画像解析が進行中のとき、THE Review_Submission_Service SHALL 投稿を「審査中」ステータスで保存し、フィードに表示しない。
6. WHEN 画像解析でPASSの判定が返されたとき、THE Quality_Guard SHALL 投稿ステータスを「公開」に変更する。
7. IF Bedrock APIが3秒以内に応答しない場合、THEN THE Image_Analyzer SHALL リクエストをタイムアウトとして扱い、投稿を「審査待ち」ステータスのまま維持してリトライキューに追加する。
8. IF 添付画像のファイルサイズが5MBを超える場合、THEN THE Review_Submission_Service SHALL 投稿を拒否し、「画像ファイルは5MB以下にしてください」というエラーメッセージを返す。
9. IF 同一投稿の画像解析が連続3回失敗した場合、THEN THE Image_Analyzer SHALL 投稿を「手動審査待ち」ステータスに変更し、管理者に通知する。

### 要件3: 口コミ一覧（グリッド表示）

**ユーザーストーリー:** 学生として、投稿された口コミを写真メインのグリッド形式で閲覧したい。そうすることで、視覚的に魅力的な情報を素早く発見できる。

#### 受け入れ基準

1. THE Review_Feed_Service SHALL ステータスが「公開」の口コミのみを返す。
2. THE Review_Feed_Service SHALL 口コミを最新投稿日時の降順で返す。
3. THE Review_Feed_Service SHALL 1リクエストあたり最大20件の口コミを返す（ページネーション）。
4. THE Review_Feed_Service SHALL 次のページが存在する場合、次ページ取得用カーソルをレスポンスに含めて返す。
5. WHEN ユーザーがフィルタ条件（エリア・カテゴリ・天気・時間帯）を1つ以上指定したとき、THE Review_Feed_Service SHALL 指定されたすべての条件に一致する（AND条件）口コミのみを返す。
6. THE Review_Feed_Service SHALL 各口コミにサムネイル画像URL・投稿者名・スポット名・いいね数を含めて返す。
7. WHEN ユーザーが口コミ一覧を閲覧したとき、THE Review_Feed_Service SHALL 各口コミの閲覧数を1インクリメントする。
8. WHEN フィルタ条件に一致する口コミが0件のとき、THE Review_Feed_Service SHALL 空のリストと件数0を返す。
9. IF 無効なページネーションカーソルが指定された場合、THEN THE Review_Feed_Service SHALL 400エラーを返し、データは返さない。

### 要件4: コンテキスト対応レコメンド

**ユーザーストーリー:** 学生として、今いる場所・今の時間帯・今日の天気に合わせた口コミをレコメンドしてほしい。そうすることで、「今この瞬間」に最適なスポットを素早く発見できる。

#### 受け入れ基準

1. WHEN ユーザーが検索時に現在位置・日時・天気の提供に同意したとき、THE Review_Feed_Service SHALL 現在の平日/休日判定・時間帯・天気に一致する口コミを優先的に返す。
2. THE Review_Feed_Service SHALL レコメンド時に現在地から近いスポットの口コミをより上位に表示する（距離スコア）。
3. THE Review_Feed_Service SHALL 天気スコア（天気一致）・時間帯スコア（時間帯一致）・距離スコア・いいね数を組み合わせたスコアリングでレコメンド順を決定する。
4. IF ユーザーが位置情報・日時・天気の提供を拒否した場合、THEN THE Review_Feed_Service SHALL 通常の最新投稿日時降順でフィードを返す（フォールバック）。
5. IF 現地天気の取得に失敗した場合、THEN THE Review_Feed_Service SHALL 天気スコアを0として残りのスコアでレコメンドを継続する。
6. THE Review_Feed_Service SHALL レコメンドAPIは通常のフィードAPIと同じページネーション仕様（最大20件・カーソルベース）に準拠する。
7. THE Review_Feed_Service SHALL 天気情報の取得に外部天気API（Open-Meteo 等の無料API）を使用し、Bedrockを使用しない。
8. WHEN レコメンドAPIが呼び出されたとき、THE Review_Feed_Service SHALL ステータスが「公開」の口コミのみをレコメンド対象とする。
9. IF レコメンドAPIに渡された緯度・経度が有効範囲（緯度: -90.0〜90.0、経度: -180.0〜180.0）外の場合、THEN THE Review_Feed_Service SHALL 400エラーを返す。
10. THE Review_Feed_Service SHALL スコアリング計算において、各スコア要素（天気・時間帯・距離・いいね数）の重みを設定値として管理し、合計スコアの降順でレコメンド結果を並べる。

---

### 要件5: 口コミ詳細閲覧

**ユーザーストーリー:** 学生として、口コミの詳細情報を確認したい。そうすることで、スポット訪問前に詳しい情報を得られる。

#### 受け入れ基準

1. WHEN ユーザーが口コミIDを指定してリクエストしたとき、THE Review_Feed_Service SHALL 投稿テキスト・最大10枚の写真URL・天気・時間帯・平日休日区別・投稿日時・いいね数・投稿者情報を返す。
2. IF 指定された口コミIDが存在しない場合、THEN THE Review_Feed_Service SHALL 404エラーを返す。
3. IF 指定された口コミのステータスが「公開」以外の場合、THEN THE Review_Feed_Service SHALL 404エラーを返す。
4. WHEN ユーザーが口コミ詳細を閲覧したとき、THE Review_Feed_Service SHALL 閲覧数を1インクリメントする。
5. IF 閲覧数のインクリメントに失敗した場合、THEN THE Review_Feed_Service SHALL 口コミ詳細データを返し、閲覧数インクリメントの失敗はレスポンスに含めない。

### 要件6: マップベースのスポット検索

**ユーザーストーリー:** 学生として、地図上でスポットを検索・発見したい。そうすることで、現在地周辺の情報を直感的に把握できる。

#### 受け入れ基準

1. THE Map_Service SHALL 指定された緯度（-90.0以上90.0以下）・経度（-180.0以上180.0以下）・半径（1m以上50,000m以下）の範囲内にあるスポットの一覧を返す。
2. THE Map_Service SHALL 各スポットに代表口コミのサムネイル画像URL・スポット名・口コミ数を含めて返す。
3. THE Map_Service SHALL スポットデータをDynamoDB GSI（緯度・経度ベース）から取得する。
4. WHEN マップ検索結果が返されたとき、THE Map_Service SHALL ステータスが「公開」の口コミを持つスポットのみを含める。
5. THE Map_Service SHALL 検索結果が50件を超える場合、指定位置からの距離が近い順に上位50件を返す。
6. IF 緯度・経度・半径のいずれかが有効範囲外または欠落している場合、THEN THE Map_Service SHALL 400エラーを返す。
7. WHEN 検索範囲内に該当スポットが存在しない場合、THE Map_Service SHALL 空のリストを返す。

### 要件7: いいね機能

**ユーザーストーリー:** 学生として、気に入った口コミにいいねをしたい。そうすることで、投稿者への感謝を示し、品質の高い投稿を評価できる。

#### 受け入れ基準

1. WHEN ユーザーが口コミにいいねをしたとき、THE Review_Feed_Service SHALL DynamoDB の該当口コミのいいね数を1インクリメントする。
2. THE Review_Feed_Service SHALL 1ユーザーが同じ口コミに対して1回のみいいねできるように制御する。
3. IF ユーザーがすでにいいねした口コミに再度いいねしようとした場合、THEN THE Review_Feed_Service SHALL いいね数を変更せず409エラーを返す。
4. IF 存在しない口コミIDに対していいね操作が実行された場合、THEN THE Review_Feed_Service SHALL 404エラーを返す。
5. WHEN 口コミのいいね数がちょうど10に達したとき、THE Mile_Service SHALL 投稿者に5マイルを1回のみ付与する。
6. WHEN 口コミのいいね数がちょうど50に達したとき、THE Mile_Service SHALL 投稿者に20マイルを1回のみ付与する。

### 要件8: マイルシステム

**ユーザーストーリー:** 学生として、獲得したマイルを確認し、クーポンと交換したい。そうすることで、口コミ活動に対するインセンティブを得られる。

#### 受け入れ基準

1. THE Mile_Service SHALL 各ユーザーのマイル残高・獲得履歴（取引種別・マイル数・日時）・交換履歴をDynamoDBで管理する。
2. WHEN ユーザーがマイル残高照会をリクエストしたとき、THE Mile_Service SHALL 現在のマイル残高と直近10件の取引履歴（取引種別・マイル数・日時を含む）を返す。
3. THE Mile_Service SHALL マイル付与・交換処理をDynamoDB のトランザクション書き込みで行い、残高の整合性を保証する。
4. WHEN ユーザーがクーポン交換をリクエストしたとき、THE Mile_Service SHALL 必要マイル数（1以上の整数として設定された交換レート）を残高から差し引く。
5. IF ユーザーの残高がクーポンの必要マイル数未満の場合、THEN THE Mile_Service SHALL 交換を拒否し、現在の残高と不足マイル数を含むエラーメッセージを返す。
6. WHEN クーポン交換が完了したとき、THE Mile_Service SHALL 1〜64文字の英数字で構成されるクーポンコードをユーザーに発行し、DynamoDBに使用済みフラグを記録する。
7. WHEN 口コミの閲覧数がちょうど100に達したとき、THE Mile_Service SHALL 投稿者に3マイルを1回のみ付与する。
8. IF 存在しないユーザーIDに対してマイル付与・照会・交換処理が実行された場合、THEN THE Mile_Service SHALL 404エラーを返す。

### 要件9: クーポン管理

**ユーザーストーリー:** 協賛企業管理者として、クーポンを登録・管理したい。そうすることで、学生を自店舗へ誘導するマーケティング施策を実施できる。

#### 受け入れ基準

1. THE Ad_Service SHALL クーポン情報（クーポン名（1〜100文字）・説明（最大500文字）・必要マイル数（1以上の整数）・有効期限（ISO 8601形式）・発行枚数上限（1以上の整数）・協賛企業ID）をDynamoDBに保存する。
2. IF クーポン登録リクエストのいずれかの入力値が上記の制約を満たさない場合、THEN THE Ad_Service SHALL クーポンの登録を拒否し、制約違反のフィールド名を含むエラーメッセージを返す。
3. WHEN Sponsor_Admin がクーポン一覧をリクエストしたとき、THE Ad_Service SHALL 該当協賛企業のクーポン一覧（クーポン名・必要マイル数・有効期限・発行枚数上限・交換済み枚数・ステータス）を返す。
4. IF クーポンの交換済み枚数が発行枚数上限に達した場合、THEN THE Ad_Service SHALL そのクーポンを「売り切れ」状態に設定し、新規交換を拒否する。
5. WHEN クーポン有効期限が経過したとき、THE Ad_Service SHALL そのクーポンを「期限切れ」状態に設定し、新規交換を拒否する。

### 要件10: 広告差し込み表示

**ユーザーストーリー:** 協賛企業管理者として、口コミフィードにクーポン広告を差し込み表示させたい。そうすることで、ユーザーの購買意欲を高め来店を促進できる。

#### 受け入れ基準

1. WHEN Review_Feed_Service が20件以上の口コミ一覧を返すとき、THE Ad_Service SHALL 20件ごとに1件の割合で「期限切れ」でも「売り切れ」でもない有効なクーポン広告を混在させる。
2. THE Ad_Service SHALL 広告アイテムには「sponsored」フラグを付与して通常口コミと区別できるようにする。
3. THE Review_Feed_Service SHALL 広告アイテムを含む場合、クーポン名・協賛企業名・必要マイル数・サムネイル画像URLを返す。
4. IF 広告アイテムのサムネイル画像の取得に失敗した場合、THEN THE Ad_Service SHALL サムネイル画像URLをnullとして広告アイテムを返す。
5. WHEN 返却する口コミ件数が20件未満のとき、THE Ad_Service SHALL 広告アイテムを混在させない。

### 要件11: ユーザー認証

**ユーザーストーリー:** 学生として、アカウントを作成してログインしたい。そうすることで、口コミ投稿・マイル管理などのパーソナルな機能を利用できる。

#### 受け入れ基準

1. THE Review_Submission_Service SHALL 認証済みユーザーからの投稿のみを受け付ける。
2. THE Mile_Service SHALL 認証済みユーザーからのマイル照会・交換リクエストのみを処理する。
3. IF 未認証のリクエストが口コミ投稿・マイル交換・いいね操作を実行しようとした場合、THEN THE Review_Submission_Service および THE Mile_Service SHALL 401エラーを返す。
4. WHERE Amazon Cognito を認証基盤として使用するとき、THE Review_Submission_Service および THE Mile_Service SHALL Cognito JWTトークンを検証してユーザーIDを取得する。
5. IF JWTトークンが無効（期限切れ・改ざん・形式不正）な場合、THEN THE Review_Submission_Service および THE Mile_Service SHALL 401エラーを返す。

### 要件12: コスト最適化

**ユーザーストーリー:** プロジェクト運営者として、AWSコストを月$30以下に抑えたい。そうすることで、学生の自己負担範囲内でコンテストを完走できる。

#### 受け入れ基準

1. THE Image_Analyzer SHALL 画像解析に Bedrock Nova Micro または Nova Lite モデルのみを使用する。
2. THE Image_Analyzer SHALL Bedrock APIへの1リクエストあたりの max_tokens を500以下に設定する。
3. THE Image_Analyzer SHALL 同一画像ハッシュ（SHA-256）の解析結果をDynamoDBにキャッシュし、同一画像の重複解析を防止する。
4. THE Review_Submission_Service SHALL 画像をS3のアップロード専用バケット（`nagotime-uploads`）に保存し、解析済みコンテンツは別バケット（`nagotime-content`）に保存することで、S3イベントループを防止する。
5. THE Review_Submission_Service Lambda および THE Image_Analyzer Lambda SHALL それぞれの同時実行数（Reserved Concurrency）を10以下に設定する。

---

## 非機能要件

### パフォーマンス

- WHEN ユーザーが口コミ一覧取得をリクエストしたとき、THE Review_Feed_Service SHALL 2秒以内にレスポンスを返す。
- WHEN ユーザーが口コミ詳細取得をリクエストしたとき、THE Review_Feed_Service SHALL 1秒以内にレスポンスを返す。
- WHEN ユーザーがマップ検索をリクエストしたとき、THE Map_Service SHALL 3秒以内にレスポンスを返す。

### 可用性

- THE Review_Submission_Service SHALL API Gateway の標準タイムアウト（29秒）以内にすべての処理を完了する。

### セキュリティ

- THE Review_Submission_Service SHALL S3プリサインドURLを使用して画像のアップロードを行い、Lambda関数に画像ファイルを直接渡さない。
- THE Ad_Service SHALL Sponsor_Admin の操作に対して専用のIAMロールまたはCognito認証グループによるアクセス制御を適用する。
