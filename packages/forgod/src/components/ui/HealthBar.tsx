import clsx from 'clsx'

interface HealthBarProps {
  current: number
  max: number
  size?: 'sm' | 'md' | 'lg'
  showText?: boolean
  className?: string
}

export default function HealthBar({
  current,
  max,
  size = 'md',
  showText = true,
  className,
}: HealthBarProps) {
  const pct = Math.max(0, Math.min(100, (current / max) * 100))
  const segments = Math.ceil(max / 10)

  const barColor =
    pct > 60 ? 'bg-green-600' :
    pct > 30 ? 'bg-yellow-600' :
    'bg-red-600'

  const heights = { sm: 'h-2', md: 'h-3', lg: 'h-4' }

  return (
    <div className={clsx('flex items-center gap-1', className)}>
      <div className={clsx(
        'flex-1 rounded-sm overflow-hidden bg-ink/40 border border-wood-dark/60',
        heights[size]
      )}>
        <div className="h-full flex">
          {Array.from({ length: segments }).map((_, i) => {
            const segStart = (i / segments) * 100
            const filled = pct > segStart
            return (
              <div
                key={i}
                className={clsx(
                  'flex-1 transition-colors duration-300',
                  i > 0 && 'border-l border-ink/20',
                  filled ? barColor : 'bg-transparent'
                )}
              />
            )
          })}
        </div>
      </div>
      {showText && (
        <span className={clsx(
          'font-mono font-bold text-ink whitespace-nowrap',
          size === 'sm' ? 'text-[10px]' : size === 'md' ? 'text-xs' : 'text-sm'
        )}>
          {current}/{max}
        </span>
      )}
    </div>
  )
}
