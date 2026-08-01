"""
クーポンコード生成モジュール

クーポン交換完了時に発行する英数字クーポンコードの生成ロジックを提供する。

Requirements: 8.6
"""

import re
import secrets

# クーポンコードのフォーマット定数
COUPON_CODE_PATTERN = re.compile(r'^[a-zA-Z0-9]+$')
COUPON_CODE_MIN_LENGTH = 1
COUPON_CODE_MAX_LENGTH = 64


def generate_coupon_code() -> str:
    """
    英数字のみで構成されるクーポンコードを生成する。

    `secrets.token_urlsafe` を元に URL セーフでない文字（`-`, `_`）を除去し、
    1〜64文字の英数字 [a-zA-Z0-9] のみで構成されるコードを返す。

    Returns:
        str: 1〜64文字の英数字クーポンコード

    Raises:
        RuntimeError: 内部エラーによりコード生成に失敗した場合（通常は発生しない）

    Validates: Requirements 8.6
    """
    # token_urlsafe は base64url 文字集合 [A-Za-z0-9_-] を使用する。
    # 英数字 [a-zA-Z0-9] 以外の文字（`-` と `_`）をフィルタリングするため、
    # 64文字以上の英数字が得られるよう余裕を持ったバイト数で生成する。
    # 64バイト → ~86文字の base64url → フィルタ後でも 64文字確保できる可能性が高い。
    for _ in range(100):  # 安全のため最大100回リトライ
        raw = secrets.token_urlsafe(64)
        alphanumeric = re.sub(r'[^a-zA-Z0-9]', '', raw)
        if len(alphanumeric) >= COUPON_CODE_MIN_LENGTH:
            return alphanumeric[:COUPON_CODE_MAX_LENGTH]

    raise RuntimeError("クーポンコードの生成に失敗しました")  # pragma: no cover
