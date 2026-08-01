"""
スコアリング計算関数モジュール

このモジュールは、NagoTimeのコンテキスト対応レコメンドシステムで使用される
各種スコアリング関数を提供する。

Requirements: 4.1〜4.10
Design: セクション6（レコメンドエンジン設計）
"""

from typing import List, Dict, Any, Optional
from dataclasses import dataclass
import math


# デフォルト重み設定
DEFAULT_WEIGHTS = {
    'weather': 0.30,
    'timeslot': 0.25,
    'distance': 0.30,
    'likes': 0.15
}

# 時間帯の隣接関係マッピング
TIMESLOT_ADJACENT = {
    'MORNING': ['NIGHT', 'AFTERNOON'],      # 5-9時: 隣接は4時以前と10時以降
    'AFTERNOON': ['MORNING', 'EVENING'],    # 10-16時: 隣接は9時以前と17時以降
    'EVENING': ['AFTERNOON', 'NIGHT'],      # 17-20時: 隣接は16時以前と21時以降
    'NIGHT': ['EVENING', 'MORNING']         # 21-4時: 隣接は20時以前と5時以降
}


@dataclass
class Review:
    """口コミデータクラス"""
    reviewId: str
    spotName: str
    lat: float
    lon: float
    text: str
    weather: str
    timeSlot: str
    dayType: str
    likeCount: int
    viewCount: int
    createdAt: str
    photoKeys: List[str]
    userId: str
    status: str


@dataclass
class RecommendContext:
    """レコメンドコンテキストデータクラス"""
    lat: float
    lon: float
    weather: str
    timeSlot: str
    dayType: str


def calc_weather_score(review_weather: str, current_weather: str) -> float:
    """
    天気スコアを計算する (0.0〜1.0)
    
    Args:
        review_weather: 口コミの天気 (SUNNY/CLOUDY/RAINY/SNOWY/UNKNOWN)
        current_weather: 現在の天気 (SUNNY/CLOUDY/RAINY/SNOWY/UNKNOWN)
    
    Returns:
        float: 天気スコア
            - 一致: 1.0
            - UNKNOWN: 0.5 (中立)
            - 不一致: 0.0
    
    Validates: Requirements 4.1, 4.5
    Design: セクション6.2
    """
    if review_weather == 'UNKNOWN':
        return 0.5
    
    if review_weather == current_weather:
        return 1.0
    
    return 0.0


def calc_timeslot_score(review_slot: str, current_slot: str) -> float:
    """
    時間帯スコアを計算する (0.0〜1.0)
    
    Args:
        review_slot: 口コミの時間帯 (MORNING/AFTERNOON/EVENING/NIGHT)
        current_slot: 現在の時間帯 (MORNING/AFTERNOON/EVENING/NIGHT)
    
    Returns:
        float: 時間帯スコア
            - 一致: 1.0
            - 隣接: 0.5
            - 不一致: 0.0
    
    Validates: Requirements 4.1
    Design: セクション6.2
    """
    if review_slot == current_slot:
        return 1.0
    
    if review_slot in TIMESLOT_ADJACENT.get(current_slot, []):
        return 0.5
    
    return 0.0


def calc_distance_score(distance_m: float) -> float:
    """
    距離スコアを計算する (0.0〜1.0)
    
    Args:
        distance_m: 距離（メートル）
    
    Returns:
        float: 距離スコア
            - 計算式: max(0, 1 - d/5000)
            - 5km以上で0、0mで1.0
    
    Validates: Requirements 4.2
    Design: セクション6.2
    """
    return max(0.0, 1.0 - distance_m / 5000.0)


def calc_likes_score(like_count: int) -> float:
    """
    いいね数スコアを計算する (0.0〜1.0)
    
    Args:
        like_count: いいね数
    
    Returns:
        float: いいね数スコア
            - 計算式: min(1.0, like_count/100)
            - 100いいね以上で1.0
    
    Validates: Requirements 4.10
    Design: セクション6.2
    """
    return min(1.0, like_count / 100.0)


def haversine_distance(lat1: float, lon1: float, lat2: float, lon2: float) -> float:
    """
    2点間の距離をHaversine公式で計算する（メートル単位）
    
    Args:
        lat1: 地点1の緯度
        lon1: 地点1の経度
        lat2: 地点2の緯度
        lon2: 地点2の経度
    
    Returns:
        float: 距離（メートル）
    
    Design: セクション6.2
    """
    # 地球の半径（メートル）
    R = 6371000
    
    # 緯度経度をラジアンに変換
    phi1 = math.radians(lat1)
    phi2 = math.radians(lat2)
    delta_phi = math.radians(lat2 - lat1)
    delta_lambda = math.radians(lon2 - lon1)
    
    # Haversine公式
    a = math.sin(delta_phi / 2) ** 2 + \
        math.cos(phi1) * math.cos(phi2) * math.sin(delta_lambda / 2) ** 2
    c = 2 * math.atan2(math.sqrt(a), math.sqrt(1 - a))
    
    distance = R * c
    return distance


def calc_total_score(
    weather_score: float,
    timeslot_score: float,
    distance_score: float,
    likes_score: float,
    weights: Optional[Dict[str, float]] = None
) -> float:
    """
    各スコアを重み付けして合計スコアを計算する
    
    Args:
        weather_score: 天気スコア (0.0〜1.0)
        timeslot_score: 時間帯スコア (0.0〜1.0)
        distance_score: 距離スコア (0.0〜1.0)
        likes_score: いいね数スコア (0.0〜1.0)
        weights: 重み設定（省略時はデフォルト）
    
    Returns:
        float: 合計スコア
    
    Validates: Requirements 4.3, 4.10
    Design: セクション6.1, 6.2
    """
    if weights is None:
        weights = DEFAULT_WEIGHTS
    
    total = (
        weights['weather'] * weather_score +
        weights['timeslot'] * timeslot_score +
        weights['distance'] * distance_score +
        weights['likes'] * likes_score
    )
    
    return total


def recommend(
    reviews: List[Review],
    context: RecommendContext,
    weights: Optional[Dict[str, float]] = None
) -> List[Review]:
    """
    コンテキストに基づいて口コミをレコメンド順にソートする
    
    Args:
        reviews: 口コミリスト
        context: レコメンドコンテキスト（現在位置・天気・時間帯）
        weights: 重み設定（省略時はデフォルト）
    
    Returns:
        List[Review]: 合計スコアの降順でソートされた口コミリスト
    
    Validates: Requirements 4.1, 4.2, 4.3, 4.8, 4.10
    Design: セクション6.1, 6.2, 6.3
    """
    if weights is None:
        weights = DEFAULT_WEIGHTS
    
    # 各口コミのスコアを計算
    scored_reviews = []
    
    for review in reviews:
        # 各スコア要素を計算
        w_score = calc_weather_score(review.weather, context.weather)
        t_score = calc_timeslot_score(review.timeSlot, context.timeSlot)
        
        # 距離を計算してスコア化
        distance = haversine_distance(
            context.lat, context.lon,
            review.lat, review.lon
        )
        d_score = calc_distance_score(distance)
        
        # いいね数スコア
        l_score = calc_likes_score(review.likeCount)
        
        # 合計スコアを計算
        total_score = calc_total_score(w_score, t_score, d_score, l_score, weights)
        
        scored_reviews.append((total_score, review))
    
    # スコアの降順でソート
    scored_reviews.sort(key=lambda x: x[0], reverse=True)
    
    # 口コミリストのみを返す
    return [review for _, review in scored_reviews]
