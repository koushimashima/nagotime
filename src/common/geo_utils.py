"""
地理空間計算ユーティリティモジュール

Haversine 公式による距離計算と、半径フィルタリング機能を提供する。
Map_Service Lambda で使用される。

Requirements: 6.1, 6.5
Design: セクション2.4
"""

import math
from typing import Any, Dict, List

# 地球の半径（メートル）
_EARTH_RADIUS_M = 6_371_000

# スポット検索の最大返却件数
MAX_SPOTS = 50


def haversine(lat1: float, lon1: float, lat2: float, lon2: float) -> float:
    """
    2点間の大圏距離を Haversine 公式で計算する（メートル単位）。

    Args:
        lat1: 地点1の緯度（度）
        lon1: 地点1の経度（度）
        lat2: 地点2の緯度（度）
        lon2: 地点2の経度（度）

    Returns:
        float: 2点間の距離（メートル）

    Validates: Requirements 6.1, 6.5
    Design: セクション2.4
    """
    phi1 = math.radians(lat1)
    phi2 = math.radians(lat2)
    delta_phi = math.radians(lat2 - lat1)
    delta_lambda = math.radians(lon2 - lon1)

    a = (
        math.sin(delta_phi / 2) ** 2
        + math.cos(phi1) * math.cos(phi2) * math.sin(delta_lambda / 2) ** 2
    )
    c = 2 * math.atan2(math.sqrt(a), math.sqrt(1 - a))

    return _EARTH_RADIUS_M * c


def filter_spots_by_radius(
    spots: List[Dict[str, Any]],
    center_lat: float,
    center_lon: float,
    radius_m: float,
) -> List[Dict[str, Any]]:
    """
    スポットリストを中心点からの距離でフィルタリングし、距離昇順で返す。

    Requirements 6.5 に従い、結果が MAX_SPOTS (50) 件を超える場合は
    距離が近い順に上位 50 件のみを返す。

    各スポット辞書には 'lat' と 'lon' キーが必須である。
    フィルタリング後のリストには '_distance_m' キーが付与され、
    中心点からの距離（メートル）を示す。

    Args:
        spots: スポット辞書のリスト。各辞書には 'lat'（緯度）と 'lon'（経度）が必要。
        center_lat: 検索中心の緯度（度）
        center_lon: 検索中心の経度（度）
        radius_m: 検索半径（メートル）

    Returns:
        List[Dict[str, Any]]:
            - radius_m 以内のスポットのみを含む
            - 距離昇順（近い順）でソート済み
            - 最大 MAX_SPOTS (50) 件

    Validates: Requirements 6.1, 6.5
    Design: セクション2.4
    """
    candidates: List[tuple[float, Dict[str, Any]]] = []

    for spot in spots:
        dist = haversine(center_lat, center_lon, spot["lat"], spot["lon"])
        if dist <= radius_m:
            candidates.append((dist, spot))

    # 距離昇順でソート
    candidates.sort(key=lambda x: x[0])

    # 上位 MAX_SPOTS 件に絞り込み、距離情報を付与して返す
    result = []
    for dist, spot in candidates[:MAX_SPOTS]:
        enriched = dict(spot)
        enriched["_distance_m"] = dist
        result.append(enriched)

    return result
