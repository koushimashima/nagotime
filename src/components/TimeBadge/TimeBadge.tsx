// src/components/TimeBadge/TimeBadge.tsx
// 時間帯バッジ — 時間帯アイコン付きバッジ（Requirements 3.6）

import { Sunrise, Sun, Sunset, Moon, type LucideIcon } from 'lucide-react'
import type { TimeSlot } from '../../mocks/data/types'

interface TimeBadgeProps {
  timeSlot: TimeSlot
}

interface TimeSlotConfig {
  Icon: LucideIcon
  label: string
  className: string
  iconClassName: string
}

const TIME_SLOT_CONFIG: Record<TimeSlot, TimeSlotConfig> = {
  MORNING:   { Icon: Sunrise, label: '朝',   className: 'bg-orange-100 text-orange-700 border-orange-200', iconClassName: 'text-orange-500' },
  AFTERNOON: { Icon: Sun,     label: '昼',   className: 'bg-amber-100 text-amber-700 border-amber-200',   iconClassName: 'text-amber-500'  },
  EVENING:   { Icon: Sunset,  label: '夕方', className: 'bg-rose-100 text-rose-700 border-rose-200',       iconClassName: 'text-rose-500'   },
  NIGHT:     { Icon: Moon,    label: '夜',   className: 'bg-indigo-100 text-indigo-700 border-indigo-200', iconClassName: 'text-indigo-500' },
}

export function TimeBadge({ timeSlot }: TimeBadgeProps) {
  const { Icon, label, className, iconClassName } = TIME_SLOT_CONFIG[timeSlot]

  return (
    <span
      className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-medium border ${className}`}
      aria-label={`時間帯: ${label}`}
    >
      <Icon className={`w-3 h-3 ${iconClassName}`} aria-hidden="true" />
      {label}
    </span>
  )
}
