# NagoTime 本番版 仕様書（AWS構成）

**バージョン:** 1.0  
**対象:** AWS本番環境への移行を想定したアーキテクチャ・機能仕様  
**最終更新:** 2026-08-03

---

## 1. 概要

### 1.1 本番版の位置付け

本仕様書は、デモ版（MSWモック構成）をAWSのサーバーレスアーキテクチャに移行した場合の設計・仕様を定義する。フロントエンドはデモ版と同等の機能を維持しつつ、バックエンドをAWSのマネージドサービスで構成する。

### 1.2 デモ版との主な差異

| 項目 | デモ版 | 本番版 |
|---|---|---|
| バックエンド | MSWモック（ブラウザ内） | AWS Lambda + API Gateway |
| 認証 | ハードコード済みアカウント | Amazon Cognito |
| データ永続化 | なし | Amazon DynamoDB |
| 画像ストレージ | picsum.photos URL | Amazon S3 + CloudFront |
| 画像処理 | なし | Lambda（リサイズ・モデレーション） |
| AIレコメンド | フロントエンド内Python移植 | Lambda + Amazon Bedrock（オプション） |
| 天気情報 | 固定値 SUNNY | 外部天気API連携（オプション） |
| ホスティング | ローカル / 任意 | AWS Amplify Hosting |
| コスト管理 | 不要 | AWS Budgets（月$30上限） |

---

## 2. システムアーキテクチャ

```
[ユーザーのブラウザ]
        │ HTTPS
        ▼
[Amplify Hosting]  ← React SPA（静的ファイル）
        │
        │ REST API
        ▼
[API Gateway (REST)]
        │
   ┌────┴────────────────────┐
   │                         │
   ▼                         ▼
[Lambda: API ハンドラー群]  [Lambda: image-analyzer]
   │                         ▲
   ├── DynamoDB               │ S3イベント通知
   │   ├── NagoTime-Reviews   │ (uploads/ プレフィックスのみ)
   │   ├── NagoTime-Spots     │
   │   ├── NagoTime-Users     ▼
   │   ├── NagoTime-MileTransactions  [S3: nagotime-uploads]
   │   ├── NagoTime-Coupons           （アップロード専用）
   │   ├── NagoTime-Likes             │
   │   └── NagoTime-ImageCache        │ Lambda が処理後
   │                                  ▼
   └── Cognito（認証）       [S3: nagotime-content]
                              （配信用・CloudFront経由）
```

---

## 3. AWSサービス構成

### 3.1 フロントエンドホスティング

**AWS Amplify Hosting**

- React SPA の静的ファイルをホスティング
- GitHub連携による自動デプロイ（mainブランチへのプッシュで自動ビルド）
- グローバルCDNによる高速配信
- カスタムドメイン・HTTPS対応
- 無料枠: 5GB ストレージ / 15GB 転送/月

### 3.2 認証

**Amazon Cognito User Pool**

- サービス名: `nagotime-user-pool`
- サインイン方式: メールアドレス＋パスワード
- メール確認必須（自動確認メール送信）
- パスワードポリシー: 8文字以上・大文字小文字・数字を含む
- アカウント回復: メールのみ
- JWTトークン有効期限: アクセストークン1時間 / リフレッシュトークン30日

**ユーザーグループ:**

| グループ名 | 権限 |
|---|---|
| （一般ユーザー） | 口コミ投稿・いいね・マイル確認 |
| `sponsor-admin` | チケット登録・管理 |

**学生認証について:**

本番版では、ユーザーは大学・高専等の学校が発行したメールアドレス（例: `@nitech.ac.jp` など `.ac.jp` ドメイン）でアカウントを作成することで学生として認証される。Cognitoへのサインアップ時にメールドメインを検証し、教育機関ドメインと一致した場合にのみ登録を許可する設計とする。

- 認証済みユーザーのアカウント情報パネルには「✓ 学生認証」チップを表示する
- 学生証明をアプリ側で担保することで、学生向け特典（マイル付与率の優遇など）の実装基盤となる
- デモ版では全ユーザーを学生認証済みとして扱い、常にチップを表示する

**Amazon Cognito Identity Pool**

- 認証済みユーザーに `s3:PutObject` 権限（`nagotime-uploads/uploads/*` のみ）を最小権限付与
- 未認証アクセスは拒否

### 3.3 APIバックエンド

**Amazon API Gateway (REST)**

- API名: `nagotime-api`
- ステージ: `prod`
- CORS設定: Amplifyドメイン（`*.amplifyapp.com`）とローカル（`localhost:3000`）を許可
- CloudWatchログ: INFO レベルで有効化

**Cognito Authorizer**

- 認証必須エンドポイントは `Authorization` ヘッダーのJWTトークンを検証
- キャッシュTTL: 5分

#### APIエンドポイント一覧

| メソッド | パス | 認証 | 説明 |
|---|---|---|---|
| GET | `/reviews` | 不要 | 口コミ一覧取得 |
| POST | `/reviews` | Cognito | 口コミ投稿 |
| GET | `/reviews/recommend` | 不要 | コンテキストレコメンド |
| GET | `/reviews/{id}` | 不要 | 口コミ詳細取得 |
| POST | `/reviews/{id}/like` | Cognito | いいね登録 |
| GET | `/map/spots` | 不要 | スポット検索 |
| GET | `/miles` | Cognito | マイル残高・履歴取得 |
| POST | `/miles/redeem` | Cognito | チケット交換 |
| POST | `/coupons` | Cognito (sponsor-admin) | クーポン登録 |
| GET | `/coupons` | Cognito (sponsor-admin) | クーポン一覧取得 |

### 3.4 バックエンド処理（AWS Lambda）

**ランタイム:** Python 3.12  
**共通設定:** タイムアウト30秒、予約同時実行数10（イベントループ防止）

#### Lambda関数一覧

| 関数名 | トリガー | 役割 |
|---|---|---|
| `nagotime-reviews-handler` | API Gateway | 口コミのCRUD・レコメンド処理 |
| `nagotime-miles-handler` | API Gateway | マイル残高照会・チケット交換 |
| `nagotime-coupons-handler` | API Gateway | クーポン管理（sponsor-adminのみ） |
| `nagotime-image-analyzer` | S3イベント（uploads/プレフィックス） | 画像リサイズ・モデレーション・content配置 |

#### nagotime-reviews-handler の主な処理

- `GET /reviews/recommend`: DynamoDBから公開済み口コミを取得し、コンテキスト（緯度・経度・天気・時間帯）でスコアリングして上位20件を返す
- `POST /reviews`: バリデーション → DynamoDB書き込み → マイル付与（10マイル）
- `POST /reviews/{id}/like`: Likesテーブルへの書き込みと Reviews テーブルの likeCount 更新

#### nagotime-image-analyzer の処理フロー

```
S3 nagotime-uploads/uploads/{key} オブジェクト作成
    │
    ▼
Lambda 起動（reserved concurrency: 10）
    │
    ├─ 入力バケット確認（nagotime-uploads でなければ即終了）
    │
    ├─ 画像リサイズ（サムネイル: 400×300px）
    │
    ├─ Rekognition または Bedrock によるコンテンツモデレーション（オプション）
    │
    └─ nagotime-content/processed/{key} に出力
         ※ content バケットにはイベント通知なし（ループ防止）
```

### 3.5 データベース（Amazon DynamoDB）

全テーブル: オンデマンドキャパシティ（PAY_PER_REQUEST）

#### NagoTime-Reviews

| キー | 型 | 説明 |
|---|---|---|
| PK: reviewId | String | 口コミID |
| SK: createdAt | String | 作成日時（ISO 8601） |

GSI:
- `StatusCreatedAtIndex`: status (PK) / createdAt (SK) — 公開済み口コミ一覧取得
- `SpotIdIndex`: spotId (PK) / createdAt (SK) — スポット別口コミ取得
- `UserIdIndex`: userId (PK) / createdAt (SK) — ユーザー別口コミ取得

#### NagoTime-Spots

| キー | 型 | 説明 |
|---|---|---|
| PK: spotId | String | スポットID |

GSI:
- `GeoIndex`: latBucket (PK) / lon (SK) — 緯度バケットによる近隣スポット検索

#### NagoTime-Users

| キー | 型 | 説明 |
|---|---|---|
| PK: userId | String | Cognito sub と一致 |

属性: mileBalance, displayName, email, createdAt

#### NagoTime-MileTransactions

| キー | 型 | 説明 |
|---|---|---|
| PK: userId | String | ユーザーID |
| SK: transactionId | String | トランザクションID |

GSI:
- `UserCreatedAtIndex`: userId (PK) / createdAt (SK) — 時系列履歴取得

#### NagoTime-Coupons

| キー | 型 | 説明 |
|---|---|---|
| PK: couponId | String | クーポンID |
| SK: sponsorId | String | スポンサーID |

GSI:
- `SponsorStatusIndex`: sponsorId (PK) / status (SK)
- `StatusExpiresAtIndex`: status (PK) / expiresAt (SK) — 有効期限チェック

#### NagoTime-Likes

| キー | 型 | 説明 |
|---|---|---|
| PK: userId | String | ユーザーID |
| SK: reviewId | String | 口コミID |

#### NagoTime-ImageCache（TTL付き）

| キー | 型 | 説明 |
|---|---|---|
| PK: imageHash | String | 画像ハッシュ |

TTL属性: `ttl` — 処理済み画像のキャッシュ、重複処理防止

### 3.6 ストレージ（Amazon S3）

#### nagotime-uploads（アップロード専用）

- パブリックアクセス: 全面禁止
- 用途: ユーザーからのプリサインドURL経由アップロードのみ
- CORS: PUT / POST を許可（本番では特定ドメインに限定すること）
- ライフサイクル: 30日後に自動削除（コスト最適化）
- イベント通知: `uploads/` プレフィックスのオブジェクト作成 → `image-analyzer` Lambda

#### nagotime-content（配信用）

- パブリックアクセス: 全面禁止（CloudFront OAC経由のみ）
- 用途: image-analyzerが処理した画像を配置、CloudFront経由で配信
- イベント通知: **なし**（S3 → Lambda ループ防止のため必須）
- ライフサイクル: 90日後に自動削除

**イベントループ防止設計（重要）:**

```
[禁止] nagotime-content にイベント通知を設定する
[必須] image-analyzer の出力先は必ず nagotime-content（入力バケットと分離）
[必須] Lambda ハンドラー冒頭で入力バケット名を確認し、想定外なら即リターン
[必須] Reserved Concurrency = 10 でスロットリング上限を設定
```

### 3.7 コスト監視（AWS Budgets）

月間予算: **$30**

| 通知タイミング | 閾値 | 通知先 |
|---|---|---|
| $5到達（17%） | 17% | メール（早期警戒） |
| $15到達（50%） | 50% | メール（中間警告） |
| $25到達（83%） | 83% | メール（高額警告） |
| $30到達（100%） | 100% | メール（上限到達） |

通知先メールアドレスは CDKコンテキスト `budgetAlertEmail` で設定する。

---

## 4. フロントエンドの変更点

### 4.1 APIクライアントの切り替え

デモ版ではMSWがAPIリクエストをインターセプトしていたが、本番版では実際のAPI Gatewayエンドポイントに向ける。

```typescript
// 環境変数で切り替え（.env.production）
VITE_API_BASE_URL=https://<api-id>.execute-api.ap-northeast-1.amazonaws.com/prod
VITE_USER_POOL_ID=ap-northeast-1_xxxxxxxx
VITE_USER_POOL_CLIENT_ID=xxxxxxxxxxxxxxxxxxxxxxxxxx
VITE_IDENTITY_POOL_ID=ap-northeast-1:xxxxxxxx-xxxx-xxxx-xxxx-xxxxxxxxxxxx
```

### 4.2 Cognito認証の統合

- `AuthContext` の `login()` を Cognito SDK（`amazon-cognito-identity-js` または AWS Amplify Auth）に差し替える
- ログイン成功時にJWTトークン（IDトークン）を取得し、APIリクエストの `Authorization` ヘッダーに付与する
- トークンの自動リフレッシュを実装する

### 4.3 S3プリサインドURLによる画像アップロード

```
[フロントエンド]
    │ POST /api/upload/presign（Lambda経由）
    │ レスポンス: { uploadUrl, fileKey }
    ▼
[S3 nagotime-uploads]  ← PUT リクエスト（プリサインドURL）
    │
    │ S3イベント
    ▼
[image-analyzer Lambda]  ← 自動処理
    │
    ▼
[S3 nagotime-content]  ← CloudFront経由で公開
```

### 4.4 天気情報の実連携（オプション）

デモ版では `SUNNY` 固定だが、本番版では外部天気APIと連携する。

- 推奨API: OpenWeatherMap（無料プランで十分）
- Lambda内で `lat`/`lon` から現在天気を取得し、`Weather` 型にマッピング
- レスポンスはDynamoDB（または Lambda内メモリ）に30分キャッシュして API コスト削減

---

## 5. スコアリングロジック（本番版）

デモ版と同一のスコアリング式を Lambda 内 Python で実装する。

```python
# スコアリング重み（DEFAULT_WEIGHTS）
weights = {
    'weather':  0.30,
    'timeslot': 0.25,
    'distance': 0.30,
    'likes':    0.15,
}

# 距離計算: Haversine公式（メートル）
# 距離スコア: max(0, 1 - d / 5000)
# いいねスコア: min(1.0, likeCount / 100)
# 天気スコア: 一致=1.0, UNKNOWN=0.5, 不一致=0.0
# 時間帯スコア: 一致=1.0, 隣接=0.5, 不一致=0.0
```

**Amazon Bedrock連携（オプション強化案）:**

- モデル: Nova Lite（開発・テスト）→ Haiku 4.5（本番）
- 用途: 口コミテキストの感情分析による追加スコア付与
- Prompt Caching を活用してコスト削減（同一システムプロンプトで最大90%削減）
- 開発中は必ず Nova Micro または Nova 2 Lite を使用すること

---

## 6. セキュリティ設計

### 6.1 最小権限の原則

- Cognito Identity Pool の認証済みロールは `s3:PutObject`（`uploads/*`）のみ付与
- Lambda 実行ロールは各テーブルへの最小権限のみ（テーブル単位でポリシーを分離）
- API GatewayのサーバーサイドでもユーザーIDを検証し、他ユーザーデータの改ざんを防止

### 6.2 入力バリデーション

- フロントエンドとLambdaの両方でバリデーションを実施（二重チェック）
- SQLインジェクションはDynamoDB使用により構造的に防止
- 画像アップロードはContent-Typeチェックと Rekognition モデレーション（オプション）で不正コンテンツを排除

### 6.3 CORS設定

- API GatewayのCORSは本番ドメイン（Amplifyの実ドメイン）に限定する
  - `"*"` は開発環境のみ許可

---

## 7. インフラ管理（AWS CDK）

### 7.1 IaCの構成

```
infrastructure/
  app.py                CDKアプリエントリーポイント
  nagotime_stack.py     全リソースを定義するスタック
  cdk.json              CDK設定（app: python app.py）
```

### 7.2 デプロイ手順

```bash
# CDK環境セットアップ（初回のみ）
pip install aws-cdk-lib constructs
cdk bootstrap aws://<account-id>/ap-northeast-1

# デプロイ（通知先メールを指定）
cdk deploy -c budgetAlertEmail=your@email.com

# スタック確認
cdk diff
```

### 7.3 リソース削除（コンテスト終了後）

コンテスト終了後は翌日中に全リソースを削除すること。

```bash
# CDKスタック全削除
cdk destroy

# 確認項目（削除後）
# - Lambda関数が存在しないこと
# - DynamoDBテーブルが存在しないこと
# - S3バケットが空になり削除されたこと
# - Amplify Hostingアプリが削除されたこと
# - CloudWatch Logsのロググループが削除されたこと
# - Cost Explorerで翌日の費用が$0であること
```

---

## 8. コスト試算（月間）

| サービス | 想定使用量 | 月額概算 |
|---|---|---|
| Amplify Hosting | 5GB以下 / 月 | 無料枠内 |
| API Gateway | 100万リクエスト以下 | 無料枠内（初年度） |
| Lambda | 100万呼び出し以下 | 無料枠内 |
| DynamoDB | 25GB以下・低トラフィック | 無料枠内 |
| S3 | 5GB以下 | 無料枠内 |
| Cognito | 50,000MAU以下 | 無料枠内 |
| CloudFront | 1TB以下 | 無料枠内（初年度） |
| Bedrock（Nova Lite） | 開発中は Nova Micro 限定 | $1〜5 |
| **合計** | | **$1〜5 / 月** |

> Bedrockを使用しない場合はほぼ無料枠内に収まる。

---

## 9. 運用ガイドライン

### 9.1 ログ・監視

- Lambda実行ログはCloudWatch Logsに自動収集（30日保持）
- API Gatewayのメトリクス（レイテンシ・エラー率）をCloudWatchで監視
- 異常時はAWS Budgetsのアラートで早期検知

### 9.2 スケーリング

- Lambda・DynamoDB・API Gatewayはすべてオートスケーリング（サーバーレス）
- Lambda Reserved Concurrency（10）はイベントループ防止のためimage-analyzerにのみ設定
- トラフィック急増時は自動スケールするため、手動操作不要

### 9.3 禁止パターン

以下のパターンはコスト爆発の原因となるため絶対に避けること。

| 禁止事項 | 理由 | 代替 |
|---|---|---|
| EC2の常時起動 | 時間課金が積み上がる | Lambda + API Gateway |
| RDS / Aurora常時起動 | 最小でも月$15〜 | DynamoDB |
| NAT Gatewayの設置 | 時間＋転送量課金 | パブリックサブネット不要構成 |
| S3 → Lambda → S3の同一バケットループ | 数時間で数百ドルの可能性 | 入出力バケット分離（必須） |
| Bedrock高額モデルでの大量テスト | トークン課金が急増 | 開発中はNova Micro固定 |

---

## 10. デモ版から本番版への移行チェックリスト

- [ ] AWS Budgets を $30 で設定し通知メールを確認した
- [ ] `cdk bootstrap` を実行した
- [ ] `cdk deploy` でスタックをデプロイした
- [ ] Cognito User Pool IDとClient IDをフロントエンドの環境変数に設定した
- [ ] 学生認証用のメールドメインバリデーション（`.ac.jp` 等）をCognitoのLambdaトリガーまたはLambda関数で実装した
- [ ] API GatewayエンドポイントURLを環境変数に設定した
- [ ] MSWのサービスワーカー登録を本番ビルドで無効化した
- [ ] CORS設定を `"*"` から実ドメインに変更した
- [ ] S3イベントループ防止の設計（入出力バケット分離）を確認した
- [ ] Lambda Reserved Concurrency（image-analyzer: 10）を確認した
- [ ] 本番デプロイ後に全エンドポイントの疎通確認を実施した
- [ ] コンテスト終了後の `cdk destroy` 手順を確認した
