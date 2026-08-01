// src/components/WeatherBadge/WeatherBadge.tsx
// 天気バッジ — 天気アイコン付きバッジ（Requirements 3.6）

import { Sun, Cloud, CloudRain, Snowflake, HelpCircle, type LucideIcon } from 'lucide-react'
import type { Weather } from '../../mocks/data/types'

interface WeatherBadgeProps {
  weather: Weather
}

interface WeatherConfig {
  Icon: LucideIcon
  label: string
  className: string
  iconClassName: string
}

const WEATHER_CONFIG: Record<Weather, WeatherConfig> = {
  SUNNY:   { Icon: Sun,       label: '晴れ', className: 'bg-yellow-100 text-yellow-700 border-yellow-200', iconClassName: 'text-yellow-500' },
  CLOUDY:  { Icon: Cloud,     label: '曇り', className: 'bg-gray-100 text-gray-600 border-gray-200',       iconClassName: 'text-gray-500'   },
  RAINY:   { Icon: CloudRain, label: '雨',   className: 'bg-blue-100 text-blue-700 border-blue-200',       iconClassName: 'text-blue-500'   },
  SNOWY:   { Icon: Snowflake, label: '雪',   className: 'bg-sky-100 text-sky-700 border-sky-200',          iconClassName: 'text-sky-500'    },
  UNKNOWN: { Icon: HelpCircle,label: '不明', className: 'bg-slate-100 text-slate-500 border-slate-200',    iconClassName: 'text-slate-400'  },
}

export function WeatherBadge({ weather }: WeatherBadgeProps) {
  const { Icon, label, className, iconClassName } = WEATHER_CONFIG[weather]

  return (
    <span
      className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-medium border ${className}`}
      aria-label={`天気: ${label}`}
    >
      <Icon className={`w-3 h-3 ${iconClassName}`} aria-hidden="true" />
      {label}
    </span>
  )
}
