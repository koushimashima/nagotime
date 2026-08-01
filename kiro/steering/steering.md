# AWS費用最適化ガイド — Steering Document

## Purpose

学生がAWSアカウント費用を自己負担してAIコンテストに参加する際に、月$30以下（理想は無料枠内）に収めるための設計・運用ガイドライン。

---

## Constraints

- 開発期間: 約3週間〜1ヶ月
- コンテスト終了後: **全リソースを必ず削除する**（後述）
- 利用ツール: Kiro Pro ($20/月) + AWSサービス
- 目標: **月 $30 以下**

---

## Architecture Guidelines

### MUST: サーバーレスファーストで設計する

```
フロントエンド: Amplify Hosting（静的サイト）
    ↓
API: API Gateway (REST) + Lambda
    ↓
DB: DynamoDB（オンデマンド）
    ↓
AI: Bedrock (Nova Lite or Haiku)
```

このパターンならBedrock以外はほぼ無料枠内。

### MUST NOT: 以下のパターンは避ける

| 禁止パターン | 理由 | 代替 |
|---|---|---|
| EC2を24時間起動 | 時間課金が積み上がる | Lambda + API Gateway |
| RDS / Aurora常時起動 | 最小でも月$15〜$43 | DynamoDB |
| NAT Gateway設置 | 時間+転送量課金 | パブリックサブネット / VPC不要構成 |
| Bedrock高額モデルで大量テスト | トークン課金が跳ねる | 開発中はNova Micro/Nova 2 Lite |

---

## ⚠️ CRITICAL: イベントループ（Runaway）の防止

### S3 + Lambda の無限ループ

**最も危険なパターン。検知が遅れると数時間で数百ドルの課金が発生する。**

#### 発生条件

```
S3バケットにオブジェクトPUT
  → Lambda発火（S3イベント通知）
    → Lambda内でS3に書き込み（同じバケット or 別の通知対象バケット）
      → 再びLambda発火
        → 無限ループ
```

#### 防止策（MUST）

1. **入力バケットと出力バケットを分離する**
   - 入力: `my-app-input/`
   - 出力: `my-app-output/`（イベント通知を設定しない）

2. **プレフィックスフィルタを使う**
   - イベント通知を `uploads/` プレフィックスのみに限定
   - Lambda出力先は `processed/` プレフィックスにする

3. **Lambda Concurrency制限を設定する**
   - Reserved Concurrency = 5〜10 に制限
   - ループ発生時に課金が爆発する前にスロットリングで止まる

4. **再帰検出を有効化する**
   - Lambda → Lambda のループ検出（AWS側で自動検出される場合あり）
   - ただしS3経由は自動検出されにくいので②③が必須

#### コード内の防止策

```python
# Lambda handler内でS3書き込み先を入力とは別にする
OUTPUT_BUCKET = "my-app-output"  # 入力バケットとは必ず別
INPUT_BUCKET = "my-app-input"

def handler(event, context):
    # 入力元を確認
    source_bucket = event['Records'][0]['s3']['bucket']['name']
    if source_bucket != INPUT_BUCKET:
        return  # 想定外のバケットからの発火は即リターン
    
    # 処理...
    
    # 出力は別バケットに
    s3.put_object(Bucket=OUTPUT_BUCKET, Key=output_key, Body=result)
```

### Step Functions + Lambda のループ

- Step Functionsの状態遷移が無限ループすると**$0.025/1,000遷移**が積み上がる
- **MaxConcurrency**と**タイムアウト**を必ず設定

### EventBridge + Lambda のループ

- EventBridgeルール → Lambda → 同じイベント再発行 → 無限ループ
- **回避**: Lambda出力のイベントは別のdetail-typeにする、またはフラグで重複排除

---

## Bedrock費用管理

### モデル選択ルール（2026年6月時点）

| フェーズ | 使用モデル | Input / 1M tokens | 理由 |
|---|---|---|---|
| 開発・テスト | **Nova Micro** or **Nova 2 Lite** | $0.035 / $0.06 | コスト最小、Nova 2 Liteは推論+ツール対応 |
| 品質確認 | **Haiku 4.5** or **Nova Pro** | $1.00 / $0.80 | 中間品質チェック |
| デモ当日 | **Sonnet 4.6** or **Nova Premier** | $3.00 / $2.50 | 最終品質、数回のみ |

> 参考: Opus 4.7 ($5/$25) は学生利用では費用対効果が合わないため非推奨。

### コスト抑制テクニック

1. 開発中はNova Micro or Nova 2 Lite固定
2. `max_tokens` を制限（500以下）
3. Prompt Cachingを活用（同一system promptで90%オフ、Nova系は20Kトークンまで）
4. 結果をDynamoDBにキャッシュ（同じ質問の再呼び出し防止）

---

## 課金アラート（初日に必ず設定）

### AWS Budgets

```
月間予算: $10
アラート:
  - $5 到達 → メール通知（50%）
  - $8 到達 → メール通知（80%）
  - $10 到達 → メール通知（100%）
```

### CloudWatch Billing Alarm

```
閾値: $5（早期警告用）
通知先: SNS → 自分のメール
```

---

## コンテスト終了後: リソース削除（MUST）

**発表会が終わったら、翌日中に全リソースを削除する。**

### 削除チェックリスト

- [ ] Lambda関数を全て削除
- [ ] API Gatewayを削除
- [ ] DynamoDBテーブルを削除
- [ ] S3バケットを空にして削除
- [ ] Amplify Hostingアプリを削除
- [ ] CloudWatch Logsのロググループを削除（蓄積で微課金あり）
- [ ] IAMロール/ポリシーを削除（課金なしだが衛生管理）
- [ ] Bedrock: 特に削除不要（API呼び出し課金のみ）
- [ ] Secrets Manager / Parameter Store: 使っていれば削除（$0.40/シークレット/月）
- [ ] **最終確認**: Cost Explorerで翌日の費用が$0であることを確認

### なぜ削除が重要か

- DynamoDBオンデマンド: テーブルが存在するだけでは課金されないが、予約容量モードに切り替えていた場合は課金
- S3: オブジェクトが残っている限り容量課金
- CloudWatch Logs: データ保持で微課金（$0.03/GB/月）
- **何もしないと月$1〜5が永続的にかかり続ける**

### 推奨: `destroy.sh` スクリプトを事前に用意

```bash
#!/bin/bash
# コンテスト終了後に実行する削除スクリプト
echo "⚠️ 全リソースを削除します。本当によろしいですか？ (y/N)"
read confirm
if [ "$confirm" != "y" ]; then exit 0; fi

aws lambda delete-function --function-name my-contest-function
aws dynamodb delete-table --table-name my-contest-table
aws s3 rb s3://my-contest-bucket --force
aws apigateway delete-rest-api --rest-api-id <API_ID>
echo "✅ 削除完了。翌日Cost Explorerで$0を確認してください。"
```

---

## チェックリスト（開発開始時に全員確認）

- [ ] AWS Budgets を $10 で設定した
- [ ] 50%/$5 と 80%/$8 でメール通知を設定した
- [ ] Cost Explorer の使い方を確認した
- [ ] Bedrockのモデルは開発中 Nova Micro or Nova 2 Lite を使う方針にした
- [ ] EC2/RDS は使わない設計にした
- [ ] NAT Gatewayは使わない設計にした
- [ ] **S3 → Lambda のイベント通知でループしない設計にした**（入出力バケット分離）
- [ ] **Lambda Concurrency制限を設定した**（5〜10）
- [ ] コンテスト終了後の削除手順（destroy.sh）を用意した
- [ ] 不要リソースの削除手順を確認した

---

*最終更新: 2026-06-12*

---

## 同梱 Skills（zip 展開するだけで有効）

以下の Agent Skills が `.kiro/skills/` に同梱済み。追加インストール不要で、Kiro でプロジェクトを開くだけで自動的にアクティベートされる。

| Skill | 内容 | 自動トリガー例 |
|---|---|---|
| **cost-guard** | AWS費用ガードレール（本プロジェクト独自） | EC2, RDS, NAT Gateway, Bedrock に言及した時 |
| **aws-lambda** | Lambda 関数の設計・デプロイ・テスト・デバッグ | 「Lambda function」「event source」「serverless API」 |
| **aws-serverless-deployment** | SAM / CDK によるサーバーレスアプリのデプロイ | 「SAM template」「SAM deploy」「CDK serverless」 |

> 出典: `aws-lambda` と `aws-serverless-deployment` は [awslabs/agent-plugins](https://github.com/awslabs/agent-plugins)（AWS公式）から変換。

---

## 推奨 MCP サーバー（オプション）

インストール不要の `aws-knowledge-mcp-server`（HTTP接続）を同梱済み。追加で以下をローカルに設定すると開発効率が上がる。いずれも `uvx` が必要（`pip install uv` or `brew install uv` で導入）。

### awslabs-aws-serverless-mcp-server（サーバーレスアプリ開発）

SAM CLI と連携し、Lambda / API Gateway / DynamoDB のビルド・デプロイ・デバッグを AI が直接実行する。コンテストの主戦場。

```json
"awslabs-aws-serverless-mcp-server": {
  "command": "uvx",
  "args": ["awslabs.aws-serverless-mcp-server@latest"],
  "env": { "FASTMCP_LOG_LEVEL": "ERROR" },
  "disabled": false
}
```

### awslabs-aws-diagram-mcp-server（アーキテクチャ図生成）

AI がアーキテクチャ図を自動生成する。発表会のスライド作成に有用。

```json
"awslabs-aws-diagram-mcp-server": {
  "command": "uvx",
  "args": ["awslabs.aws-diagram-mcp-server@latest"],
  "env": { "FASTMCP_LOG_LEVEL": "ERROR" },
  "disabled": false
}
```

### awslabs-aws-iac-mcp-server（IaC テンプレート生成支援）

CloudFormation / CDK / Terraform のベストプラクティスに基づいたテンプレートを AI が生成する。

```json
"awslabs-aws-iac-mcp-server": {
  "command": "uvx",
  "args": ["awslabs.aws-iac-mcp-server@latest"],
  "env": { "FASTMCP_LOG_LEVEL": "ERROR" },
  "disabled": false
}
```

### awslabs-aws-pricing-mcp-server（AWS 料金確認）

「このサービスいくら？」を AI に直接聞ける。費用見積もりやモデル選択の判断に有用。

```json
"awslabs-aws-pricing-mcp-server": {
  "command": "uvx",
  "args": ["awslabs.aws-pricing-mcp-server@latest"],
  "env": { "FASTMCP_LOG_LEVEL": "ERROR" },
  "disabled": false
}
```

上記をプロジェクトルートの `.kiro/settings/mcp.json` の `mcpServers` に追加すれば有効になる。
