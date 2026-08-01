"""
バリデーション関数モジュール

NagoTime デモ版の入力検証を行うバリデーション関数と
対応するエラーメッセージ定数を提供する。

Requirements: 1.2, 1.3, 1.7, 1.8, 1.9, 1.10, 4.9, 6.6
"""

# エラーメッセージ定数
ERROR_TEXT_LENGTH = "テキストは50文字以上1000文字以下で入力してください"
ERROR_PHOTO_COUNT = "写真は1枚以上5枚以下で添付してください"
ERROR_COORDINATES_INVALID = "緯度は-90.0以上90.0以下、経度は-180.0以上180.0以下で指定してください"
ERROR_SPOT_NAME_LENGTH = "スポット名は1文字以上100文字以下で入力してください"
ERROR_SPOT_NAME_EMPTY = "スポット名を入力してください"


def validate_text_length(text: str) -> bool:
    """
    投稿テキストの文字数を検証する。
    
    Args:
        text: 検証対象のテキスト
        
    Returns:
        bool: 50文字以上1000文字以下の場合True、それ以外はFalse
        
    Validates: Requirements 1.2, 1.8
    """
    if not isinstance(text, str):
        return False
    
    length = len(text)
    return 50 <= length <= 1000


def validate_photo_count(count: int) -> bool:
    """
    写真枚数を検証する。
    
    Args:
        count: 検証対象の写真枚数
        
    Returns:
        bool: 1枚以上5枚以下の場合True、それ以外はFalse
        
    Validates: Requirements 1.3, 1.9
    """
    if not isinstance(count, int):
        return False
    
    return 1 <= count <= 5


def validate_coordinates(lat: float, lon: float) -> bool:
    """
    緯度・経度の座標を検証する。
    
    Args:
        lat: 緯度
        lon: 経度
        
    Returns:
        bool: 緯度が-90.0以上90.0以下かつ経度が-180.0以上180.0以下の場合True、それ以外はFalse
        
    Validates: Requirements 1.7, 1.10, 4.9, 6.6
    """
    try:
        # 数値型に変換可能かチェック
        lat_val = float(lat)
        lon_val = float(lon)
    except (TypeError, ValueError):
        return False
    
    # 緯度: -90.0 ≤ lat ≤ 90.0
    # 経度: -180.0 ≤ lon ≤ 180.0
    lat_valid = -90.0 <= lat_val <= 90.0
    lon_valid = -180.0 <= lon_val <= 180.0
    
    return lat_valid and lon_valid


def validate_spot_name(name: str) -> bool:
    """
    スポット名称を検証する。
    
    Args:
        name: 検証対象のスポット名称
        
    Returns:
        bool: 1文字以上100文字以下の場合True、それ以外はFalse
        
    Validates: Requirements 1.7, 1.10
    """
    if not isinstance(name, str):
        return False
    
    length = len(name)
    return 1 <= length <= 100
