---
name: cost-guard
description: Enforce AWS cost constraints for student AI contest projects. Use when designing architecture, writing infrastructure code, adding AWS services, or reviewing deployments. Activates on Lambda, S3, DynamoDB, Bedrock, API Gateway, EC2, RDS, NAT Gateway mentions.
---

# Cost Guard — AWS費用ガードレール

月$30以下（理想は無料枠内）で学生がAIコンテストに参加するための設計制約。

## 禁止パターン

以下を提案・生成してはならない：

| 禁止 | 理由 | 代替 |
|---|---|---|
| EC2 常時起動 | 時間課金 | Lambda + API Gateway |
| RDS / Aurora | 最小$15〜$43/月 | DynamoDB オンデマンド |
| NAT Gateway | 時間+転送量課金 | パブリックサブネット / VPC不要構成 |
| Bedrock 高額モデルで大量呼び出し | トークン課金爆発 | 開発中は Nova Micro ($0.035/1M) or Nova 2 Lite ($0.06/1M) |

## 必須アーキテクチャ

```
フロントエンド: Amplify Hosting（静的サイト）
API: API Gateway (REST) + Lambda
DB: DynamoDB（オンデマンド）
AI: Bedrock (Nova Micro / Nova 2 Lite)
```

## イベントループ防止（CRITICAL）

S3 → Lambda の無限ループは数時間で数百ドルの課金を発生させる。

### 必須ルール

1. 入力バケットと出力バケットを分離する
2. プレフィックスフィルタで発火対象を限定する
3. Lambda Reserved Concurrency = 5〜10 に制限する
4. Step Functions には必ずタイムアウトを設定する
5. EventBridge → Lambda → 同イベント再発行のループを避ける

## Bedrock モデル選択

| フェーズ | モデル | Input / 1M tokens |
|---|---|---|
| 開発・テスト | Nova Micro or Nova 2 Lite | $0.035 / $0.06 |
| 品質確認 | Haiku 4.5 or Nova Pro | $1.00 / $0.80 |
| デモ当日 | Sonnet 4.6 or Nova Premier | $3.00 / $2.50 |

- `max_tokens` は 500 以下に制限
- Prompt Caching を活用（Nova 系は 20K トークンまで）
- 同一入力の結果は DynamoDB にキャッシュ

## 課金アラート（初日に設定）

- AWS Budgets: 月 $10、50%/$5 と 80%/$8 でメール通知
- CloudWatch Billing Alarm: 閾値 $5

## コンテスト終了後

発表会翌日中に全リソース削除。Cost Explorer で $0 を確認。
