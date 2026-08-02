export interface PresetCategory {
  label: string
  hashtags: string[]
}

export const PRESET_CATEGORIES: PresetCategory[] = [
  {
    label: '食事シーン',
    hashtags: [
      '#ランチ', '#ディナー', '#モーニング', '#ブランチ',
      '#テイクアウト', '#食べ歩き', '#食べ放題', '#スイーツ',
    ],
  },
  {
    label: '利用シーン',
    hashtags: [
      '#勉強スポット', '#デート', '#飲み会', '#大人数',
      '#一人', '#カフェ活', '#サークル', '#就活', '#ゼミ後', '#バイト帰り',
    ],
  },
  {
    label: '雰囲気・特徴',
    hashtags: [
      '#夜景', '#穴場', '#インスタ映え', '#コスパ良し',
      '#深夜営業', '#Wi-Fi完備', '#禁煙', '#テラス席', '#ペット可', '#予約不要',
    ],
  },
]

/** すべてのプリセットハッシュタグをフラットな配列で取得する */
export const ALL_PRESET_HASHTAGS: string[] = PRESET_CATEGORIES.flatMap(c => c.hashtags)
