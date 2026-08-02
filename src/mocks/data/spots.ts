// src/mocks/data/spots.ts
// 名古屋市内の実在スポット サンプルデータ（Requirements 6.1〜6.7）

import { Spot } from './types'

export const mockSpots: Spot[] = [
  // ---- 栄エリア ----
  {
    spotId: 'spot-001',
    name: 'オアシス21',
    lat: 35.1697,
    lon: 136.9064,
    category: '観光',
    area: '栄',
    reviewCount: 42,
    thumbnailUrl: 'https://loremflickr.com/400/300/oasis,park,nagoya?lock=301',
  },
  {
    spotId: 'spot-002',
    name: '久屋大通公園（リニューアルエリア）',
    lat: 35.1724,
    lon: 136.9093,
    category: '公園',
    area: '栄',
    reviewCount: 28,
    thumbnailUrl: 'https://loremflickr.com/400/300/park,green,japan?lock=302',
  },

  // ---- 名古屋駅エリア ----
  {
    spotId: 'spot-003',
    name: 'JRセントラルタワーズ',
    lat: 35.1709,
    lon: 136.8815,
    category: 'ショッピング',
    area: '名古屋駅',
    reviewCount: 35,
    thumbnailUrl: 'https://loremflickr.com/400/300/shopping,mall,building?lock=303',
  },
  {
    spotId: 'spot-004',
    name: 'ミッドランドスクエア',
    lat: 35.1701,
    lon: 136.8829,
    category: 'ショッピング',
    area: '名古屋駅',
    reviewCount: 31,
    thumbnailUrl: 'https://loremflickr.com/400/300/skyscraper,office,japan?lock=304',
  },

  // ---- 大須エリア ----
  {
    spotId: 'spot-005',
    name: '大須観音',
    lat: 35.1601,
    lon: 136.8997,
    category: '観光',
    area: '大須',
    reviewCount: 47,
    thumbnailUrl: 'https://loremflickr.com/400/300/shrine,temple,japan?lock=305',
  },
  {
    spotId: 'spot-006',
    name: '大須商店街',
    lat: 35.1613,
    lon: 136.9007,
    category: 'ショッピング',
    area: '大須',
    reviewCount: 39,
    thumbnailUrl: 'https://loremflickr.com/400/300/shopping,street,market?lock=306',
  },

  // ---- 今池エリア ----
  {
    spotId: 'spot-007',
    name: '今池ガスビル（今池周辺グルメ街）',
    lat: 35.1655,
    lon: 136.9296,
    category: 'グルメ',
    area: '今池',
    reviewCount: 22,
    thumbnailUrl: 'https://loremflickr.com/400/300/restaurant,food,japan?lock=307',
  },

  // ---- 覚王山エリア ----
  {
    spotId: 'spot-008',
    name: '日泰寺（覚王山）',
    lat: 35.1631,
    lon: 136.9467,
    category: '観光',
    area: '覚王山',
    reviewCount: 18,
    thumbnailUrl: 'https://loremflickr.com/400/300/buddhist,temple,pagoda?lock=308',
  },
  {
    spotId: 'spot-009',
    name: '覚王山アパート（カフェ・雑貨）',
    lat: 35.1624,
    lon: 136.9459,
    category: 'カフェ',
    area: '覚王山',
    reviewCount: 14,
    thumbnailUrl: 'https://loremflickr.com/400/300/cafe,antique,japan?lock=309',
  },

  // ---- 名古屋城エリア ----
  {
    spotId: 'spot-010',
    name: '名古屋城',
    lat: 35.1857,
    lon: 136.8994,
    category: '観光',
    area: '名古屋城',
    reviewCount: 50,
    thumbnailUrl: 'https://loremflickr.com/400/300/castle,japan,nagoya?lock=310',
  },

  // ---- 熱田エリア ----
  {
    spotId: 'spot-011',
    name: '熱田神宮',
    lat: 35.1271,
    lon: 136.9081,
    category: '観光',
    area: '熱田',
    reviewCount: 45,
    thumbnailUrl: 'https://loremflickr.com/400/300/shrine,shinto,japan?lock=311',
  },

  // ---- 鶴舞エリア ----
  {
    spotId: 'spot-012',
    name: '鶴舞公園',
    lat: 35.1527,
    lon: 136.9154,
    category: '公園',
    area: '千種',
    reviewCount: 20,
    thumbnailUrl: 'https://loremflickr.com/400/300/park,cherry,blossom?lock=312',
  },

  // ---- 矢場町エリア ----
  {
    spotId: 'spot-013',
    name: '松坂屋名古屋店',
    lat: 35.1649,
    lon: 136.9054,
    category: 'ショッピング',
    area: '栄',
    reviewCount: 33,
    thumbnailUrl: 'https://loremflickr.com/400/300/department,store,japan?lock=313',
  },

  // ---- 金山エリア ----
  {
    spotId: 'spot-014',
    name: '金山駅周辺（ボストン美術館）',
    lat: 35.1440,
    lon: 136.9032,
    category: 'エンタメ',
    area: '金山',
    reviewCount: 16,
    thumbnailUrl: 'https://loremflickr.com/400/300/museum,art,building?lock=314',
  },

  // ---- 東山エリア ----
  {
    spotId: 'spot-015',
    name: '東山動植物園',
    lat: 35.1599,
    lon: 136.9628,
    category: '観光',
    area: '東山',
    reviewCount: 48,
    thumbnailUrl: 'https://loremflickr.com/400/300/zoo,elephant,animal?lock=315',
  },

  // ---- 名駅周辺・その他 ----
  {
    spotId: 'spot-016',
    name: 'スパイラルタワーズ（カフェ）',
    lat: 35.1718,
    lon: 136.8840,
    category: 'カフェ',
    area: '名古屋駅',
    reviewCount: 12,
    thumbnailUrl: 'https://loremflickr.com/400/300/coffee,cafe,terrace?lock=316',
  },
  {
    spotId: 'spot-017',
    name: '円頓寺商店街',
    lat: 35.1784,
    lon: 136.8921,
    category: 'グルメ',
    area: '名古屋城',
    reviewCount: 9,
    thumbnailUrl: 'https://loremflickr.com/400/300/food,japan,street?lock=317',
  },
]
