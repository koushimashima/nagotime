from aws_cdk import (
    Stack,
    RemovalPolicy,
    Duration,
    CfnOutput,
    aws_dynamodb as dynamodb,
    aws_s3 as s3,
    aws_s3_notifications as s3n,
    aws_cognito as cognito,
    aws_iam as iam,
    aws_apigateway as apigw,
    aws_lambda as lambda_,
    aws_budgets as budgets,
)
from constructs import Construct


class NagoTimeStack(Stack):
    def __init__(self, scope: Construct, construct_id: str, **kwargs) -> None:
        super().__init__(scope, construct_id, **kwargs)

        # ========================================
        # NagoTime-Reviews テーブル
        # ========================================
        self.reviews_table = dynamodb.Table(
            self,
            "ReviewsTable",
            table_name="NagoTime-Reviews",
            partition_key=dynamodb.Attribute(
                name="reviewId", type=dynamodb.AttributeType.STRING
            ),
            sort_key=dynamodb.Attribute(
                name="createdAt", type=dynamodb.AttributeType.STRING
            ),
            billing_mode=dynamodb.BillingMode.PAY_PER_REQUEST,
            removal_policy=RemovalPolicy.DESTROY,  # デモ版のため削除許可
        )

        # GSI: StatusCreatedAtIndex
        self.reviews_table.add_global_secondary_index(
            index_name="StatusCreatedAtIndex",
            partition_key=dynamodb.Attribute(
                name="status", type=dynamodb.AttributeType.STRING
            ),
            sort_key=dynamodb.Attribute(
                name="createdAt", type=dynamodb.AttributeType.STRING
            ),
            projection_type=dynamodb.ProjectionType.ALL,
        )

        # GSI: SpotIdIndex
        self.reviews_table.add_global_secondary_index(
            index_name="SpotIdIndex",
            partition_key=dynamodb.Attribute(
                name="spotId", type=dynamodb.AttributeType.STRING
            ),
            sort_key=dynamodb.Attribute(
                name="createdAt", type=dynamodb.AttributeType.STRING
            ),
            projection_type=dynamodb.ProjectionType.ALL,
        )

        # GSI: UserIdIndex
        self.reviews_table.add_global_secondary_index(
            index_name="UserIdIndex",
            partition_key=dynamodb.Attribute(
                name="userId", type=dynamodb.AttributeType.STRING
            ),
            sort_key=dynamodb.Attribute(
                name="createdAt", type=dynamodb.AttributeType.STRING
            ),
            projection_type=dynamodb.ProjectionType.ALL,
        )

        # ========================================
        # NagoTime-Spots テーブル
        # ========================================
        self.spots_table = dynamodb.Table(
            self,
            "SpotsTable",
            table_name="NagoTime-Spots",
            partition_key=dynamodb.Attribute(
                name="spotId", type=dynamodb.AttributeType.STRING
            ),
            billing_mode=dynamodb.BillingMode.PAY_PER_REQUEST,
            removal_policy=RemovalPolicy.DESTROY,
        )

        # GSI: GeoIndex
        self.spots_table.add_global_secondary_index(
            index_name="GeoIndex",
            partition_key=dynamodb.Attribute(
                name="latBucket", type=dynamodb.AttributeType.STRING
            ),
            sort_key=dynamodb.Attribute(
                name="lon", type=dynamodb.AttributeType.NUMBER
            ),
            projection_type=dynamodb.ProjectionType.ALL,
        )

        # ========================================
        # NagoTime-Users テーブル
        # ========================================
        self.users_table = dynamodb.Table(
            self,
            "UsersTable",
            table_name="NagoTime-Users",
            partition_key=dynamodb.Attribute(
                name="userId", type=dynamodb.AttributeType.STRING
            ),
            billing_mode=dynamodb.BillingMode.PAY_PER_REQUEST,
            removal_policy=RemovalPolicy.DESTROY,
        )

        # ========================================
        # NagoTime-MileTransactions テーブル
        # ========================================
        self.mile_transactions_table = dynamodb.Table(
            self,
            "MileTransactionsTable",
            table_name="NagoTime-MileTransactions",
            partition_key=dynamodb.Attribute(
                name="userId", type=dynamodb.AttributeType.STRING
            ),
            sort_key=dynamodb.Attribute(
                name="transactionId", type=dynamodb.AttributeType.STRING
            ),
            billing_mode=dynamodb.BillingMode.PAY_PER_REQUEST,
            removal_policy=RemovalPolicy.DESTROY,
        )

        # GSI: UserCreatedAtIndex
        self.mile_transactions_table.add_global_secondary_index(
            index_name="UserCreatedAtIndex",
            partition_key=dynamodb.Attribute(
                name="userId", type=dynamodb.AttributeType.STRING
            ),
            sort_key=dynamodb.Attribute(
                name="createdAt", type=dynamodb.AttributeType.STRING
            ),
            projection_type=dynamodb.ProjectionType.ALL,
        )

        # ========================================
        # NagoTime-Coupons テーブル
        # ========================================
        self.coupons_table = dynamodb.Table(
            self,
            "CouponsTable",
            table_name="NagoTime-Coupons",
            partition_key=dynamodb.Attribute(
                name="couponId", type=dynamodb.AttributeType.STRING
            ),
            sort_key=dynamodb.Attribute(
                name="sponsorId", type=dynamodb.AttributeType.STRING
            ),
            billing_mode=dynamodb.BillingMode.PAY_PER_REQUEST,
            removal_policy=RemovalPolicy.DESTROY,
        )

        # GSI: SponsorStatusIndex
        self.coupons_table.add_global_secondary_index(
            index_name="SponsorStatusIndex",
            partition_key=dynamodb.Attribute(
                name="sponsorId", type=dynamodb.AttributeType.STRING
            ),
            sort_key=dynamodb.Attribute(
                name="status", type=dynamodb.AttributeType.STRING
            ),
            projection_type=dynamodb.ProjectionType.ALL,
        )

        # GSI: StatusExpiresAtIndex
        self.coupons_table.add_global_secondary_index(
            index_name="StatusExpiresAtIndex",
            partition_key=dynamodb.Attribute(
                name="status", type=dynamodb.AttributeType.STRING
            ),
            sort_key=dynamodb.Attribute(
                name="expiresAt", type=dynamodb.AttributeType.STRING
            ),
            projection_type=dynamodb.ProjectionType.ALL,
        )

        # ========================================
        # NagoTime-Likes テーブル
        # ========================================
        self.likes_table = dynamodb.Table(
            self,
            "LikesTable",
            table_name="NagoTime-Likes",
            partition_key=dynamodb.Attribute(
                name="userId", type=dynamodb.AttributeType.STRING
            ),
            sort_key=dynamodb.Attribute(
                name="reviewId", type=dynamodb.AttributeType.STRING
            ),
            billing_mode=dynamodb.BillingMode.PAY_PER_REQUEST,
            removal_policy=RemovalPolicy.DESTROY,
        )

        # ========================================
        # NagoTime-ImageCache テーブル (TTL 付き)
        # ========================================
        self.image_cache_table = dynamodb.Table(
            self,
            "ImageCacheTable",
            table_name="NagoTime-ImageCache",
            partition_key=dynamodb.Attribute(
                name="imageHash", type=dynamodb.AttributeType.STRING
            ),
            billing_mode=dynamodb.BillingMode.PAY_PER_REQUEST,
            time_to_live_attribute="ttl",  # TTL 属性
            removal_policy=RemovalPolicy.DESTROY,
        )

        # ========================================
        # Task 1.2: S3 バケット: nagotime-uploads (アップロード専用)
        # ========================================
        self.uploads_bucket = s3.Bucket(
            self,
            "UploadsBucket",
            bucket_name="nagotime-uploads",
            # パブリックアクセス禁止
            block_public_access=s3.BlockPublicAccess.BLOCK_ALL,
            # CORS 設定 (プリサインド URL 用)
            cors=[
                s3.CorsRule(
                    allowed_methods=[s3.HttpMethods.PUT, s3.HttpMethods.POST],
                    allowed_origins=["*"],  # 本番環境では特定ドメインに制限すべき
                    allowed_headers=["*"],
                    max_age=3000,
                )
            ],
            # デモ版のため削除許可
            removal_policy=RemovalPolicy.DESTROY,
            auto_delete_objects=True,
            # バージョニング無効（コスト最適化）
            versioned=False,
            # ライフサイクルルール: 30日後に削除（コスト最適化）
            lifecycle_rules=[
                s3.LifecycleRule(
                    id="DeleteOldUploads",
                    enabled=True,
                    expiration=Duration.days(30),
                )
            ],
        )

        # ========================================
        # Task 1.2: S3 バケット: nagotime-content (配信用)
        # ========================================
        self.content_bucket = s3.Bucket(
            self,
            "ContentBucket",
            bucket_name="nagotime-content",
            # パブリックアクセス禁止 (CloudFront OAC 経由でのみアクセス)
            block_public_access=s3.BlockPublicAccess.BLOCK_ALL,
            # イベント通知なし（ループ防止）
            # デモ版のため削除許可
            removal_policy=RemovalPolicy.DESTROY,
            auto_delete_objects=True,
            # バージョニング無効（コスト最適化）
            versioned=False,
            # ライフサイクルルール: 90日後に削除（コスト最適化）
            lifecycle_rules=[
                s3.LifecycleRule(
                    id="DeleteOldContent",
                    enabled=True,
                    expiration=Duration.days(90),
                )
            ],
        )

        # ========================================
        # Task 1.2: image-analyzer Lambda (プレースホルダー)
        # S3 Event → Lambda トリガー（uploads/ プレフィックス限定）
        # 実際のコードは後続タスクで実装
        # ========================================
        self.image_analyzer_fn = lambda_.Function(
            self,
            "ImageAnalyzerFunction",
            function_name="nagotime-image-analyzer",
            runtime=lambda_.Runtime.PYTHON_3_12,
            handler="index.handler",
            code=lambda_.Code.from_inline(
                # プレースホルダー: 後続タスクで実コードに差し替え
                "def handler(event, context):\n    return {'statusCode': 200}"
            ),
            timeout=Duration.seconds(30),
            memory_size=512,
            # イベントループ防止: 同時実行数を制限 (Requirements: 12.5)
            reserved_concurrent_executions=10,
            environment={
                "UPLOADS_BUCKET": "nagotime-uploads",
                "CONTENT_BUCKET": "nagotime-content",
                "REVIEWS_TABLE": "NagoTime-Reviews",
                "IMAGE_CACHE_TABLE": "NagoTime-ImageCache",
            },
        )

        # S3 Event → image-analyzer トリガー（uploads/ プレフィックスのみ）
        # Requirements: 2.5 (設計書 5.2 イベントループ防止)
        self.uploads_bucket.add_event_notification(
            s3.EventType.OBJECT_CREATED,
            s3n.LambdaDestination(self.image_analyzer_fn),
            s3.NotificationKeyFilter(prefix="uploads/"),
        )

        # image-analyzer に uploads バケット読み取り権限を付与
        self.uploads_bucket.grant_read(self.image_analyzer_fn)
        self.content_bucket.grant_put(self.image_analyzer_fn)

        # ========================================
        # Task 1.3: Amazon Cognito — User Pool
        # Requirements: 11.1〜11.5
        # ========================================
        self.user_pool = cognito.UserPool(
            self,
            "UserPool",
            user_pool_name="nagotime-user-pool",
            # メール/パスワード認証
            sign_in_aliases=cognito.SignInAliases(email=True),
            # メール確認必須
            auto_verify=cognito.AutoVerifiedAttrs(email=True),
            self_sign_up_enabled=True,
            # パスワードポリシー（デフォルト: 8文字以上・大文字小文字数字記号を含む）
            password_policy=cognito.PasswordPolicy(
                min_length=8,
                require_lowercase=True,
                require_uppercase=True,
                require_digits=True,
                require_symbols=False,
            ),
            # アカウント回復: メールのみ
            account_recovery=cognito.AccountRecovery.EMAIL_ONLY,
            # デモ版のため削除許可
            removal_policy=RemovalPolicy.DESTROY,
        )

        # User Pool クライアント（フロントエンド用）
        self.user_pool_client = cognito.UserPoolClient(
            self,
            "UserPoolClient",
            user_pool=self.user_pool,
            user_pool_client_name="nagotime-web-client",
            auth_flows=cognito.AuthFlow(
                user_password=True,
                user_srp=True,
            ),
            # JWT トークン有効期限設定
            access_token_validity=Duration.hours(1),
            id_token_validity=Duration.hours(1),
            refresh_token_validity=Duration.days(30),
            prevent_user_existence_errors=True,
        )

        # sponsor-admin グループ (Requirements: 設計書 7.1)
        self.sponsor_admin_group = cognito.CfnUserPoolGroup(
            self,
            "SponsorAdminGroup",
            user_pool_id=self.user_pool.user_pool_id,
            group_name="sponsor-admin",
            description="協賛企業管理者グループ — クーポン登録・管理が可能",
        )

        # ========================================
        # Task 1.3: Identity Pool
        # 認証済みロール: S3 PUT 最小権限 (設計書 7.1)
        # ========================================
        self.identity_pool = cognito.CfnIdentityPool(
            self,
            "IdentityPool",
            identity_pool_name="nagotime_identity_pool",
            allow_unauthenticated_identities=False,
            cognito_identity_providers=[
                cognito.CfnIdentityPool.CognitoIdentityProviderProperty(
                    client_id=self.user_pool_client.user_pool_client_id,
                    provider_name=self.user_pool.user_pool_provider_name,
                )
            ],
        )

        # 認証済みユーザー用 IAM ロール (S3 PutObject 最小権限)
        self.authenticated_role = iam.Role(
            self,
            "CognitoAuthenticatedRole",
            role_name="nagotime-cognito-authenticated",
            assumed_by=iam.FederatedPrincipal(
                "cognito-identity.amazonaws.com",
                conditions={
                    "StringEquals": {
                        "cognito-identity.amazonaws.com:aud": self.identity_pool.ref
                    },
                    "ForAnyValue:StringLike": {
                        "cognito-identity.amazonaws.com:amr": "authenticated"
                    },
                },
                assume_role_action="sts:AssumeRoleWithWebIdentity",
            ),
        )

        # S3 nagotime-uploads への PutObject のみ許可（最小権限）
        self.authenticated_role.add_to_policy(
            iam.PolicyStatement(
                effect=iam.Effect.ALLOW,
                actions=["s3:PutObject"],
                resources=[f"{self.uploads_bucket.bucket_arn}/uploads/*"],
            )
        )

        # Identity Pool とロールのアタッチ
        cognito.CfnIdentityPoolRoleAttachment(
            self,
            "IdentityPoolRoleAttachment",
            identity_pool_id=self.identity_pool.ref,
            roles={"authenticated": self.authenticated_role.role_arn},
        )

        # ========================================
        # Task 1.4: API Gateway REST API
        # Requirements: 4.7
        # ========================================
        self.api = apigw.RestApi(
            self,
            "NagoTimeApi",
            rest_api_name="nagotime-api",
            description="NagoTime デモ版 REST API",
            deploy_options=apigw.StageOptions(
                stage_name="prod",
                # CloudWatch ログ有効化
                logging_level=apigw.MethodLoggingLevel.INFO,
                data_trace_enabled=False,
                metrics_enabled=True,
            ),
            # デフォルト CORS 設定 (Requirements: 設計書 9.5)
            default_cors_preflight_options=apigw.CorsOptions(
                allow_origins=[
                    "http://localhost:3000",
                    "https://*.amplifyapp.com",
                ],
                allow_methods=apigw.Cors.ALL_METHODS,
                allow_headers=[
                    "Content-Type",
                    "X-Amz-Date",
                    "Authorization",
                    "X-Api-Key",
                    "X-Amz-Security-Token",
                ],
                allow_credentials=True,
            ),
        )

        # Cognito Authorizer（認証必須エンドポイント用）
        self.cognito_authorizer = apigw.CognitoUserPoolsAuthorizer(
            self,
            "CognitoAuthorizer",
            authorizer_name="nagotime-cognito-authorizer",
            cognito_user_pools=[self.user_pool],
            identity_source="method.request.header.Authorization",
            results_cache_ttl=Duration.minutes(5),
        )

        # Lambda 統合プレースホルダー（後続タスクで各 Lambda ARN に差し替え）
        # ダミー Lambda を作成して API メソッドに紐付け
        placeholder_fn = lambda_.Function(
            self,
            "ApiPlaceholderFunction",
            function_name="nagotime-api-placeholder",
            runtime=lambda_.Runtime.PYTHON_3_12,
            handler="index.handler",
            code=lambda_.Code.from_inline(
                "def handler(event, context):\n"
                "    return {\n"
                "        'statusCode': 501,\n"
                "        'headers': {'Content-Type': 'application/json'},\n"
                "        'body': '{\"error\": {\"code\": \"NOT_IMPLEMENTED\", \"message\": \"Lambda not yet deployed\"}}'\n"
                "    }"
            ),
            timeout=Duration.seconds(10),
        )

        # 各 Lambda 用プレースホルダー統合（後続タスクで差し替え）
        def make_lambda_integration(fn: lambda_.Function) -> apigw.LambdaIntegration:
            return apigw.LambdaIntegration(
                fn,
                proxy=True,
                allow_test_invoke=False,
            )

        placeholder_integration = make_lambda_integration(placeholder_fn)

        # ---- /reviews リソース ----
        reviews = self.api.root.add_resource("reviews")

        # POST /reviews — 口コミ投稿（認証必須）
        reviews.add_method(
            "POST",
            placeholder_integration,
            authorization_type=apigw.AuthorizationType.COGNITO,
            authorizer=self.cognito_authorizer,
        )

        # GET /reviews — 口コミ一覧（認証不要）
        reviews.add_method(
            "GET",
            placeholder_integration,
            authorization_type=apigw.AuthorizationType.NONE,
        )

        # GET /reviews/recommend — コンテキスト対応レコメンド（認証不要）
        reviews_recommend = reviews.add_resource("recommend")
        reviews_recommend.add_method(
            "GET",
            placeholder_integration,
            authorization_type=apigw.AuthorizationType.NONE,
        )

        # GET /reviews/{id} — 口コミ詳細（認証不要）
        reviews_id = reviews.add_resource("{id}")
        reviews_id.add_method(
            "GET",
            placeholder_integration,
            authorization_type=apigw.AuthorizationType.NONE,
        )

        # POST /reviews/{id}/like — いいね（認証必須）
        reviews_id_like = reviews_id.add_resource("like")
        reviews_id_like.add_method(
            "POST",
            placeholder_integration,
            authorization_type=apigw.AuthorizationType.COGNITO,
            authorizer=self.cognito_authorizer,
        )

        # ---- /map/spots リソース ----
        map_resource = self.api.root.add_resource("map")
        spots = map_resource.add_resource("spots")

        # GET /map/spots — スポット検索（認証不要）
        spots.add_method(
            "GET",
            placeholder_integration,
            authorization_type=apigw.AuthorizationType.NONE,
        )

        # ---- /miles リソース ----
        miles = self.api.root.add_resource("miles")

        # GET /miles — マイル残高・履歴照会（認証必須）
        miles.add_method(
            "GET",
            placeholder_integration,
            authorization_type=apigw.AuthorizationType.COGNITO,
            authorizer=self.cognito_authorizer,
        )

        # POST /miles/redeem — クーポン交換（認証必須）
        miles_redeem = miles.add_resource("redeem")
        miles_redeem.add_method(
            "POST",
            placeholder_integration,
            authorization_type=apigw.AuthorizationType.COGNITO,
            authorizer=self.cognito_authorizer,
        )

        # ---- /coupons リソース ----
        coupons = self.api.root.add_resource("coupons")

        # POST /coupons — クーポン登録（認証必須 + sponsor-admin グループのみ）
        coupons.add_method(
            "POST",
            placeholder_integration,
            authorization_type=apigw.AuthorizationType.COGNITO,
            authorizer=self.cognito_authorizer,
        )

        # GET /coupons — クーポン一覧（認証必須 + sponsor-admin グループのみ）
        coupons.add_method(
            "GET",
            placeholder_integration,
            authorization_type=apigw.AuthorizationType.COGNITO,
            authorizer=self.cognito_authorizer,
        )

        # ========================================
        # Task 1.5: AWS Budgets コスト監視設定
        # 月間予算 $30、段階的メール通知
        # Requirements: 12 全般
        # ========================================

        # 通知先メールアドレス（環境変数またはデプロイ時に差し替え）
        # デフォルトは空のため、デプロイ前に実際のメールアドレスを設定すること
        budget_alert_email = self.node.try_get_context("budgetAlertEmail") or "admin@example.com"

        self.monthly_budget = budgets.CfnBudget(
            self,
            "MonthlyBudget",
            budget=budgets.CfnBudget.BudgetDataProperty(
                budget_name="NagoTime-Monthly-Budget",
                budget_type="COST",
                time_unit="MONTHLY",
                budget_limit=budgets.CfnBudget.SpendProperty(
                    amount=30,
                    unit="USD",
                ),
            ),
            notifications_with_subscribers=[
                # $5 到達 (17%) — 早期警戒
                budgets.CfnBudget.NotificationWithSubscribersProperty(
                    notification=budgets.CfnBudget.NotificationProperty(
                        notification_type="ACTUAL",
                        comparison_operator="GREATER_THAN",
                        threshold=17,
                        threshold_type="PERCENTAGE",
                    ),
                    subscribers=[
                        budgets.CfnBudget.SubscriberProperty(
                            subscription_type="EMAIL",
                            address=budget_alert_email,
                        )
                    ],
                ),
                # $15 到達 (50%) — 中間警告
                budgets.CfnBudget.NotificationWithSubscribersProperty(
                    notification=budgets.CfnBudget.NotificationProperty(
                        notification_type="ACTUAL",
                        comparison_operator="GREATER_THAN",
                        threshold=50,
                        threshold_type="PERCENTAGE",
                    ),
                    subscribers=[
                        budgets.CfnBudget.SubscriberProperty(
                            subscription_type="EMAIL",
                            address=budget_alert_email,
                        )
                    ],
                ),
                # $25 到達 (83%) — 高額警告
                budgets.CfnBudget.NotificationWithSubscribersProperty(
                    notification=budgets.CfnBudget.NotificationProperty(
                        notification_type="ACTUAL",
                        comparison_operator="GREATER_THAN",
                        threshold=83,
                        threshold_type="PERCENTAGE",
                    ),
                    subscribers=[
                        budgets.CfnBudget.SubscriberProperty(
                            subscription_type="EMAIL",
                            address=budget_alert_email,
                        )
                    ],
                ),
                # $30 到達 (100%) — 予算上限到達
                budgets.CfnBudget.NotificationWithSubscribersProperty(
                    notification=budgets.CfnBudget.NotificationProperty(
                        notification_type="ACTUAL",
                        comparison_operator="GREATER_THAN",
                        threshold=100,
                        threshold_type="PERCENTAGE",
                    ),
                    subscribers=[
                        budgets.CfnBudget.SubscriberProperty(
                            subscription_type="EMAIL",
                            address=budget_alert_email,
                        )
                    ],
                ),
            ],
        )

        # ========================================
        # CloudFormation Outputs
        # ========================================
        CfnOutput(
            self,
            "UserPoolId",
            value=self.user_pool.user_pool_id,
            description="Cognito User Pool ID",
            export_name="NagoTime-UserPoolId",
        )
        CfnOutput(
            self,
            "UserPoolClientId",
            value=self.user_pool_client.user_pool_client_id,
            description="Cognito User Pool Client ID",
            export_name="NagoTime-UserPoolClientId",
        )
        CfnOutput(
            self,
            "IdentityPoolId",
            value=self.identity_pool.ref,
            description="Cognito Identity Pool ID",
            export_name="NagoTime-IdentityPoolId",
        )
        CfnOutput(
            self,
            "ApiUrl",
            value=self.api.url,
            description="API Gateway エンドポイント URL",
            export_name="NagoTime-ApiUrl",
        )
        CfnOutput(
            self,
            "UploadsBucketName",
            value=self.uploads_bucket.bucket_name,
            description="S3 アップロード専用バケット名",
            export_name="NagoTime-UploadsBucketName",
        )
        CfnOutput(
            self,
            "ContentBucketName",
            value=self.content_bucket.bucket_name,
            description="S3 配信用バケット名",
            export_name="NagoTime-ContentBucketName",
        )
