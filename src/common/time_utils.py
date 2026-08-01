"""
時間帯・平日判定関数

Requirements 1.4, 1.6 を実装するユーティリティモジュール
"""

from datetime import datetime
from typing import Literal
import jpholiday


def get_time_slot(dt: datetime) -> Literal["MORNING", "AFTERNOON", "EVENING", "NIGHT"]:
    """
    指定された日時から時間帯を判定する
    
    Args:
        dt: 判定する日時
        
    Returns:
        時間帯を表す文字列:
        - MORNING: 5〜9時
        - AFTERNOON: 10〜16時
        - EVENING: 17〜20時
        - NIGHT: 21〜23時 + 0〜4時
        
    Validates: Requirements 1.6
    """
    hour = dt.hour
    
    if 5 <= hour <= 9:
        return "MORNING"
    elif 10 <= hour <= 16:
        return "AFTERNOON"
    elif 17 <= hour <= 20:
        return "EVENING"
    else:  # 21〜23時 or 0〜4時
        return "NIGHT"


def get_day_type(dt: datetime) -> Literal["WEEKDAY", "HOLIDAY"]:
    """
    指定された日時から平日/休日を判定する
    
    日本の祝日・土日を休日とみなす（jpholiday ライブラリを使用）
    
    Args:
        dt: 判定する日時
        
    Returns:
        曜日タイプを表す文字列:
        - WEEKDAY: 平日（月〜金で祝日でない日）
        - HOLIDAY: 休日（土日・祝日）
        
    Validates: Requirements 1.4
    """
    # 土日をチェック
    if dt.weekday() in (5, 6):  # 5=土曜日, 6=日曜日
        return "HOLIDAY"
    
    # 祝日をチェック
    if jpholiday.is_holiday(dt.date()):
        return "HOLIDAY"
    
    return "WEEKDAY"
