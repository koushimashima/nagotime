"""
クーポンコード生成関数のテスト

Requirements: 8.6
"""

import re
import pytest
from hypothesis import given, settings
from hypothesis import strategies as st

from coupon_utils import (
    generate_coupon_code,
    COUPON_CODE_PATTERN,
    COUPON_CODE_MIN_LENGTH,
    COUPON_CODE_MAX_LENGTH,
)

# Feature: nago-time-demo, Property 12: クーポンコードのフォーマット保証
ALPHANUMERIC_RE = re.compile(r'^[a-zA-Z0-9]+$')


class TestGenerateCouponCodeUnitTests:
    """generate_coupon_code() のユニットテスト"""

    def test_returns_string(self):
        """戻り値が文字列型であること"""
        code = generate_coupon_code()
        assert isinstance(code, str)

    def test_length_within_bounds(self):
        """長さが 1〜64 文字の範囲内であること"""
        code = generate_coupon_code()
        assert COUPON_CODE_MIN_LENGTH <= len(code) <= COUPON_CODE_MAX_LENGTH

    def test_alphanumeric_only(self):
        """英数字 [a-zA-Z0-9] のみで構成されること"""
        code = generate_coupon_code()
        assert ALPHANUMERIC_RE.match(code), f"Non-alphanumeric characters found: {code!r}"

    def test_no_hyphen_or_underscore(self):
        """token_urlsafe 由来の '-' と '_' が含まれないこと"""
        for _ in range(50):
            code = generate_coupon_code()
            assert '-' not in code
            assert '_' not in code

    def test_not_empty(self):
        """空文字列が返されないこと"""
        code = generate_coupon_code()
        assert len(code) >= 1

    def test_max_length_not_exceeded(self):
        """64 文字を超えないこと"""
        for _ in range(50):
            code = generate_coupon_code()
            assert len(code) <= 64

    def test_each_call_produces_unique_code(self):
        """複数回呼び出すと異なるコードが生成されること（確率的）"""
        codes = {generate_coupon_code() for _ in range(20)}
        # 20件中少なくとも 2件以上はユニークなはず
        assert len(codes) >= 2


class TestGenerateCouponCodePropertyTests:
    """
    generate_coupon_code() のプロパティベーステスト

    # Feature: nago-time-demo, Property 12: クーポンコードのフォーマット保証
    **Validates: Requirements 8.6**
    """

    @given(st.nothing())
    def test_placeholder(self):
        """プレースホルダー（st.nothing() を使うプロパティテストの雛形）"""
        # このテストは実行されない（st.nothing() は例を生成しない）
        pass  # pragma: no cover

    @settings(max_examples=200)
    @given(st.integers(min_value=1, max_value=200))
    def test_format_guarantee_repeated_calls(self, _n: int):
        """
        任意の回数呼び出しにおいてコードフォーマットが常に保証されること。

        # Feature: nago-time-demo, Property 12: クーポンコードのフォーマット保証
        **Validates: Requirements 8.6**
        """
        code = generate_coupon_code()

        # 1〜64文字
        assert COUPON_CODE_MIN_LENGTH <= len(code) <= COUPON_CODE_MAX_LENGTH, (
            f"Length {len(code)} out of bounds [1, 64]: {code!r}"
        )

        # 英数字のみ
        assert ALPHANUMERIC_RE.match(code), (
            f"Non-alphanumeric characters in coupon code: {code!r}"
        )
