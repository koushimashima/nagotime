"""
バリデーション関数のユニットテスト

Requirements: 1.2, 1.3, 1.7, 1.8, 1.9, 1.10, 4.9, 6.6
"""

import pytest
from validators import (
    validate_text_length,
    validate_photo_count,
    validate_coordinates,
    validate_spot_name,
    ERROR_TEXT_LENGTH,
    ERROR_PHOTO_COUNT,
    ERROR_COORDINATES_INVALID,
    ERROR_SPOT_NAME_LENGTH,
    ERROR_SPOT_NAME_EMPTY,
)


class TestValidateTextLength:
    """テキスト長バリデーションのテスト"""

    def test_valid_minimum_boundary(self):
        """境界値: ちょうど50文字（最小値）"""
        text = "a" * 50
        assert validate_text_length(text) is True

    def test_valid_maximum_boundary(self):
        """境界値: ちょうど1000文字（最大値）"""
        text = "a" * 1000
        assert validate_text_length(text) is True

    def test_valid_middle_value(self):
        """有効値: 中間の値（500文字）"""
        text = "a" * 500
        assert validate_text_length(text) is True

    def test_invalid_below_minimum(self):
        """無効値: 49文字（最小値未満）"""
        text = "a" * 49
        assert validate_text_length(text) is False

    def test_invalid_above_maximum(self):
        """無効値: 1001文字（最大値超過）"""
        text = "a" * 1001
        assert validate_text_length(text) is False

    def test_invalid_empty_string(self):
        """無効値: 空文字列"""
        assert validate_text_length("") is False

    def test_invalid_type_none(self):
        """無効値: None型"""
        assert validate_text_length(None) is False

    def test_invalid_type_int(self):
        """無効値: 整数型"""
        assert validate_text_length(123) is False

    def test_valid_multibyte_characters(self):
        """有効値: マルチバイト文字（日本語）"""
        text = "あ" * 50
        assert validate_text_length(text) is True


class TestValidatePhotoCount:
    """写真枚数バリデーションのテスト"""

    def test_valid_minimum_boundary(self):
        """境界値: ちょうど1枚（最小値）"""
        assert validate_photo_count(1) is True

    def test_valid_maximum_boundary(self):
        """境界値: ちょうど5枚（最大値）"""
        assert validate_photo_count(5) is True

    def test_valid_middle_value(self):
        """有効値: 中間の値（3枚）"""
        assert validate_photo_count(3) is True

    def test_invalid_zero(self):
        """無効値: 0枚（最小値未満）"""
        assert validate_photo_count(0) is False

    def test_invalid_negative(self):
        """無効値: 負の値"""
        assert validate_photo_count(-1) is False

    def test_invalid_above_maximum(self):
        """無効値: 6枚（最大値超過）"""
        assert validate_photo_count(6) is False

    def test_invalid_type_float(self):
        """無効値: 浮動小数点型"""
        assert validate_photo_count(3.5) is False

    def test_invalid_type_string(self):
        """無効値: 文字列型"""
        assert validate_photo_count("3") is False

    def test_invalid_type_none(self):
        """無効値: None型"""
        assert validate_photo_count(None) is False


class TestValidateCoordinates:
    """座標バリデーションのテスト"""

    def test_valid_center_coordinates(self):
        """有効値: 中心座標（0, 0）"""
        assert validate_coordinates(0.0, 0.0) is True

    def test_valid_nagoya_coordinates(self):
        """有効値: 名古屋の座標"""
        assert validate_coordinates(35.1706, 136.9070) is True

    def test_valid_latitude_minimum_boundary(self):
        """境界値: 緯度最小値（-90.0）"""
        assert validate_coordinates(-90.0, 0.0) is True

    def test_valid_latitude_maximum_boundary(self):
        """境界値: 緯度最大値（90.0）"""
        assert validate_coordinates(90.0, 0.0) is True

    def test_valid_longitude_minimum_boundary(self):
        """境界値: 経度最小値（-180.0）"""
        assert validate_coordinates(0.0, -180.0) is True

    def test_valid_longitude_maximum_boundary(self):
        """境界値: 経度最大値（180.0）"""
        assert validate_coordinates(0.0, 180.0) is True

    def test_valid_all_boundaries(self):
        """境界値: すべて境界値の組み合わせ"""
        assert validate_coordinates(-90.0, -180.0) is True
        assert validate_coordinates(90.0, 180.0) is True

    def test_invalid_latitude_below_minimum(self):
        """無効値: 緯度が最小値未満（-90.1）"""
        assert validate_coordinates(-90.1, 0.0) is False

    def test_invalid_latitude_above_maximum(self):
        """無効値: 緯度が最大値超過（90.1）"""
        assert validate_coordinates(90.1, 0.0) is False

    def test_invalid_longitude_below_minimum(self):
        """無効値: 経度が最小値未満（-180.1）"""
        assert validate_coordinates(0.0, -180.1) is False

    def test_invalid_longitude_above_maximum(self):
        """無効値: 経度が最大値超過（180.1）"""
        assert validate_coordinates(0.0, 180.1) is False

    def test_invalid_both_out_of_range(self):
        """無効値: 両方が範囲外"""
        assert validate_coordinates(100.0, 200.0) is False

    def test_valid_integer_coordinates(self):
        """有効値: 整数型の座標（float変換可能）"""
        assert validate_coordinates(35, 136) is True

    def test_invalid_type_string(self):
        """無効値: 文字列型"""
        assert validate_coordinates("35.1706", "136.9070") is False

    def test_invalid_type_none(self):
        """無効値: None型"""
        assert validate_coordinates(None, None) is False

    def test_invalid_type_mixed(self):
        """無効値: 混合型"""
        assert validate_coordinates(35.0, None) is False
        assert validate_coordinates(None, 136.0) is False


class TestValidateSpotName:
    """スポット名バリデーションのテスト"""

    def test_valid_minimum_boundary(self):
        """境界値: ちょうど1文字（最小値）"""
        assert validate_spot_name("a") is True

    def test_valid_maximum_boundary(self):
        """境界値: ちょうど100文字（最大値）"""
        name = "a" * 100
        assert validate_spot_name(name) is True

    def test_valid_middle_value(self):
        """有効値: 中間の値（50文字）"""
        name = "a" * 50
        assert validate_spot_name(name) is True

    def test_valid_japanese_name(self):
        """有効値: 日本語のスポット名"""
        assert validate_spot_name("栄の居酒屋 魚民") is True

    def test_valid_mixed_name(self):
        """有効値: 混合文字のスポット名"""
        assert validate_spot_name("Cafe & Restaurant 名古屋123") is True

    def test_invalid_empty_string(self):
        """無効値: 空文字列"""
        assert validate_spot_name("") is False

    def test_invalid_above_maximum(self):
        """無効値: 101文字（最大値超過）"""
        name = "a" * 101
        assert validate_spot_name(name) is False

    def test_invalid_type_int(self):
        """無効値: 整数型"""
        assert validate_spot_name(123) is False

    def test_invalid_type_none(self):
        """無効値: None型"""
        assert validate_spot_name(None) is False


class TestErrorMessages:
    """エラーメッセージ定数のテスト"""

    def test_error_messages_are_strings(self):
        """エラーメッセージがすべて文字列型であることを確認"""
        assert isinstance(ERROR_TEXT_LENGTH, str)
        assert isinstance(ERROR_PHOTO_COUNT, str)
        assert isinstance(ERROR_COORDINATES_INVALID, str)
        assert isinstance(ERROR_SPOT_NAME_LENGTH, str)
        assert isinstance(ERROR_SPOT_NAME_EMPTY, str)

    def test_error_messages_not_empty(self):
        """エラーメッセージが空でないことを確認"""
        assert len(ERROR_TEXT_LENGTH) > 0
        assert len(ERROR_PHOTO_COUNT) > 0
        assert len(ERROR_COORDINATES_INVALID) > 0
        assert len(ERROR_SPOT_NAME_LENGTH) > 0
        assert len(ERROR_SPOT_NAME_EMPTY) > 0

    def test_error_messages_content(self):
        """エラーメッセージの内容を確認"""
        assert "50" in ERROR_TEXT_LENGTH and "1000" in ERROR_TEXT_LENGTH
        assert "1" in ERROR_PHOTO_COUNT and "5" in ERROR_PHOTO_COUNT
        assert "緯度" in ERROR_COORDINATES_INVALID and "経度" in ERROR_COORDINATES_INVALID
        assert "1" in ERROR_SPOT_NAME_LENGTH and "100" in ERROR_SPOT_NAME_LENGTH
