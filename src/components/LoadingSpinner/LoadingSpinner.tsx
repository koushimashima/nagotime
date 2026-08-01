// src/components/LoadingSpinner/LoadingSpinner.tsx
// ローディングスピナー — animate-spin を使った CSS アニメーション

interface LoadingSpinnerProps {
  size?: 'sm' | 'md' | 'lg'
  className?: string
}

const SIZE_CLASS: Record<NonNullable<LoadingSpinnerProps['size']>, string> = {
  sm: 'h-4 w-4 border-2',
  md: 'h-8 w-8 border-2',
  lg: 'h-12 w-12 border-4',
}

export function LoadingSpinner({ size = 'md', className = '' }: LoadingSpinnerProps) {
  const sizeClass = SIZE_CLASS[size]

  return (
    <span
      role="status"
      aria-label="読み込み中"
      className={`inline-block animate-spin rounded-full border-orange-400 border-t-transparent ${sizeClass} ${className}`}
    />
  )
}
