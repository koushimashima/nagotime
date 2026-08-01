// src/components/TimeBadge/TimeBadge.tsx
// 時間帯バッジ — 時間帯アイコン付きバッジ（Requirements 3.6）

import type { TimeSlot } from '../../mocks/data/types'

interface TimeBadgeProps {
  timeSlot: TimeSlot
}

interface TimeSlotConfig {
  icon: string
  label: string
  className: string
}

const TIME_SLOT_CONFIG: Record<TimeSlot, TimeSlotConfig> = {
  MORNING:   { icon: '🌅', label: '朝',   className: 'bg-orange-100 text-orange-700 border-orange-200' },
  AFTERNOON: { icon: '☀️', label: '昼',   className: 'bg-amber-100 text-amber-700 border-amber-200' },
  EVENING:   { icon: '🌆', label: '夕方', className: 'bg-rose-100 text-rose-700 border-rose-200' },
  NIGHT:     { icon: '🌙', label: '夜',   className: 'bg-indigo-100 text-indigo-700 border-indigo-200' },
}

export function TimeBadge({ timeSlot }: TimeBadgeProps) {
  const { icon, label, className } = TIME_SLOT_CONFIG[timeSlot]

  return (
    <span
      className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-medium border ${className}`}
      aria-label={`時間帯: ${label}`}
    >
      <span aria-hidden="true">{icon}</span>
      {label}
    </span>
  )
}
