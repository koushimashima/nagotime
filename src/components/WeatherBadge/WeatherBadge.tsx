// src/components/WeatherBadge/WeatherBadge.tsx
// 天気バッジ — 天気アイコン付きバッジ（Requirements 3.6）

import type { Weather } from '../../mocks/data/types'

interface WeatherBadgeProps {
  weather: Weather
}

interface WeatherConfig {
  icon: string
  label: string
  className: string
}

const WEATHER_CONFIG: Record<Weather, WeatherConfig> = {
  SUNNY:   { icon: '☀️', label: '晴れ',  className: 'bg-yellow-100 text-yellow-700 border-yellow-200' },
  CLOUDY:  { icon: '☁️', label: '曇り',  className: 'bg-gray-100 text-gray-600 border-gray-200' },
  RAINY:   { icon: '🌧️', label: '雨',    className: 'bg-blue-100 text-blue-700 border-blue-200' },
  SNOWY:   { icon: '❄️', label: '雪',    className: 'bg-sky-100 text-sky-700 border-sky-200' },
  UNKNOWN: { icon: '❓', label: '不明',  className: 'bg-slate-100 text-slate-500 border-slate-200' },
}

export function WeatherBadge({ weather }: WeatherBadgeProps) {
  const { icon, label, className } = WEATHER_CONFIG[weather]

  return (
    <span
      className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-medium border ${className}`}
      aria-label={`天気: ${label}`}
    >
      <span aria-hidden="true">{icon}</span>
      {label}
    </span>
  )
}
