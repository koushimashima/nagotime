"""
geo_utils モジュールのユニットテスト

Requirements: 6.1, 6.5
"""

import math
import pytest
from geo_utils import haversine, filter_spots_by_radius, MAX_SPOTS


# ---------------------------------------------------------------------------
# haversine() のテスト
# ---------------------------------------------------------------------------

class TestHaversine:
    """haversine 距離計算のテスト"""

    def test_same_point_returns_zero(self):
        """同一点の距離は 0"""
        assert haversine(35.17, 136.91, 35.17, 136.91) == pytest.approx(0.0, abs=1e-6)

    def test_known_distance_nagoya_tokyo(self):
        """名古屋〜東京の概算距離（約 260 km ± 5 km）"""
        nagoya_lat, nagoya_lon = 35.1706, 136.9070
        tokyo_lat, tokyo_lon = 35.6895, 139.6917
        dist = haversine(nagoya_lat, nagoya_lon, tokyo_lat, tokyo_lon)
        # 概算 260 km; ±5 km の許容
        assert 255_000 <= dist <= 265_000

    def test_symmetry(self):
        """d(A→B) == d(B→A) であること"""
        lat1, lon1 = 35.0, 136.0
        lat2, lon2 = 36.0, 137.0
        assert haversine(lat1, lon1, lat2, lon2) == pytest.approx(
            haversine(lat2, lon2, lat1, lon1), rel=1e-9
        )

    def test_returns_float(self):
        """戻り値が float であること"""
        result = haversine(0.0, 0.0, 1.0, 1.0)
        assert isinstance(result, float)

    def test_returns_positive_for_different_points(self):
        """異なる2点の距離は正の値"""
        dist = haversine(0.0, 0.0, 1.0, 0.0)
        assert dist > 0

    def test_1_degree_latitude_approx_111km(self):
        """緯度 1° ≈ 111 km（±2 km）"""
        dist = haversine(0.0, 0.0, 1.0, 0.0)
        assert 109_000 <= dist <= 113_000

    def test_equatorial_1_degree_longitude_approx_111km(self):
        """赤道上の経度 1° ≈ 111 km（±2 km）"""
        dist = haversine(0.0, 0.0, 0.0, 1.0)
        assert 109_000 <= dist <= 113_000

    def test_north_pole_to_south_pole(self):
        """北極〜南極 ≈ 20,015 km（地球半円）"""
        dist = haversine(90.0, 0.0, -90.0, 0.0)
        assert pytest.approx(dist, rel=0.01) == 2 * math.pi * 6_371_000 / 2

    def test_poles_same_longitude(self):
        """北極同一点（0 距離）"""
        assert haversine(90.0, 0.0, 90.0, 0.0) == pytest.approx(0.0, abs=1e-6)


# ---------------------------------------------------------------------------
# filter_spots_by_radius() のテスト
# ---------------------------------------------------------------------------

def _make_spot(spot_id: str, lat: float, lon: float) -> dict:
    """テスト用スポット辞書を生成する"""
    return {"spotId": spot_id, "name": f"Spot {spot_id}", "lat": lat, "lon": lon}


class TestFilterSpotsByRadius:
    """filter_spots_by_radius のテスト"""

    # 名古屋・栄付近を中心とする
    CENTER_LAT = 35.1706
    CENTER_LON = 136.9070

    def test_empty_spots_returns_empty(self):
        """空リスト → 空リスト"""
        result = filter_spots_by_radius([], self.CENTER_LAT, self.CENTER_LON, 1000)
        assert result == []

    def test_spot_within_radius_is_included(self):
        """半径内のスポットは結果に含まれる"""
        # 中心から ~0 m のスポット
        spots = [_make_spot("A", self.CENTER_LAT, self.CENTER_LON)]
        result = filter_spots_by_radius(spots, self.CENTER_LAT, self.CENTER_LON, 100)
        assert len(result) == 1
        assert result[0]["spotId"] == "A"

    def test_spot_outside_radius_is_excluded(self):
        """半径外のスポットは結果に含まれない"""
        # 約 111 km 離れたスポット（東京方面）
        spots = [_make_spot("T", 36.1706, 137.9070)]
        result = filter_spots_by_radius(spots, self.CENTER_LAT, self.CENTER_LON, 1000)
        assert result == []

    def test_spot_exactly_on_radius_boundary_is_included(self):
        """境界値: 距離がちょうど半径と等しいスポットは含まれる（≤ なので）"""
        # 中心から約 500 m 北に位置するスポット
        # 緯度 1 度 ≈ 111_000 m → 500 m ≈ 0.0045 度
        lat_offset = 500 / 111_000
        spot_lat = self.CENTER_LAT + lat_offset
        dist = haversine(self.CENTER_LAT, self.CENTER_LON, spot_lat, self.CENTER_LON)
        spots = [_make_spot("B", spot_lat, self.CENTER_LON)]
        result = filter_spots_by_radius(spots, self.CENTER_LAT, self.CENTER_LON, dist)
        assert len(result) == 1

    def test_results_sorted_by_distance_ascending(self):
        """結果は距離昇順（近い順）でソートされている"""
        spots = [
            _make_spot("far", self.CENTER_LAT + 0.05, self.CENTER_LON),   # 約 5.5 km
            _make_spot("near", self.CENTER_LAT + 0.001, self.CENTER_LON), # 約 111 m
            _make_spot("mid", self.CENTER_LAT + 0.01, self.CENTER_LON),   # 約 1.1 km
        ]
        result = filter_spots_by_radius(spots, self.CENTER_LAT, self.CENTER_LON, 10_000)
        distances = [r["_distance_m"] for r in result]
        assert distances == sorted(distances)

    def test_distance_field_is_added(self):
        """結果辞書には '_distance_m' キーが付与される"""
        spots = [_make_spot("A", self.CENTER_LAT, self.CENTER_LON)]
        result = filter_spots_by_radius(spots, self.CENTER_LAT, self.CENTER_LON, 1000)
        assert "_distance_m" in result[0]
        assert isinstance(result[0]["_distance_m"], float)

    def test_max_50_spots_returned(self):
        """検索結果が 50 件を超える場合、上位 50 件のみ返す（Requirements 6.5）"""
        # 60 個のスポットを中心付近に配置
        spots = [
            _make_spot(str(i), self.CENTER_LAT + i * 0.0001, self.CENTER_LON)
            for i in range(60)
        ]
        result = filter_spots_by_radius(spots, self.CENTER_LAT, self.CENTER_LON, 50_000)
        assert len(result) == MAX_SPOTS  # == 50

    def test_max_50_closest_spots_are_returned(self):
        """50 件超過時、距離が近い上位 50 件が返される"""
        # i=0 が最も近く、i=59 が最も遠い
        spots = [
            _make_spot(str(i), self.CENTER_LAT + i * 0.001, self.CENTER_LON)
            for i in range(60)
        ]
        result = filter_spots_by_radius(spots, self.CENTER_LAT, self.CENTER_LON, 50_000)
        returned_ids = {r["spotId"] for r in result}
        # i=0〜49 が返されるべき（近い順）
        expected_ids = {str(i) for i in range(50)}
        assert returned_ids == expected_ids

    def test_fewer_than_50_returns_all(self):
        """50 件以下の場合はすべて返す"""
        spots = [
            _make_spot(str(i), self.CENTER_LAT + i * 0.001, self.CENTER_LON)
            for i in range(10)
        ]
        result = filter_spots_by_radius(spots, self.CENTER_LAT, self.CENTER_LON, 50_000)
        assert len(result) == 10

    def test_original_spot_fields_preserved(self):
        """元のスポット辞書のフィールドが保持される"""
        spot = {"spotId": "X", "name": "Test Spot", "lat": self.CENTER_LAT, "lon": self.CENTER_LON, "reviewCount": 5}
        result = filter_spots_by_radius([spot], self.CENTER_LAT, self.CENTER_LON, 1000)
        assert result[0]["spotId"] == "X"
        assert result[0]["name"] == "Test Spot"
        assert result[0]["reviewCount"] == 5

    def test_original_spot_not_mutated(self):
        """元のスポット辞書が変更されていないこと（コピーを返す）"""
        spot = {"spotId": "Y", "lat": self.CENTER_LAT, "lon": self.CENTER_LON}
        filter_spots_by_radius([spot], self.CENTER_LAT, self.CENTER_LON, 1000)
        assert "_distance_m" not in spot
