import clsx from 'clsx'

interface DiceDisplayProps {
  value: number
  size?: 'sm' | 'md' | 'lg'
  variant?: 'default' | 'gold' | 'corrupt'
  className?: string
}

// SVG pip positions for each face
const pipPositions: Record<number, Array<[number, number]>> = {
  1: [[12, 12]],
  2: [[6, 6], [18, 18]],
  3: [[6, 6], [12, 12], [18, 18]],
  4: [[6, 6], [18, 6], [6, 18], [18, 18]],
  5: [[6, 6], [18, 6], [12, 12], [6, 18], [18, 18]],
  6: [[6, 6], [18, 6], [6, 12], [18, 12], [6, 18], [18, 18]],
}

const sizes = { sm: 24, md: 32, lg: 40 }

const variantColors = {
  default: { bg: '#F5E6C8', border: '#5C3D2E', pip: '#2C1810' },
  gold: { bg: '#C9A84C', border: '#A08030', pip: '#2C1810' },
  corrupt: { bg: '#6B3A8E', border: '#4A2660', pip: '#E8D5F0' },
}

export default function DiceDisplay({
  value,
  size = 'md',
  variant = 'default',
  className,
}: DiceDisplayProps) {
  const s = sizes[size]
  const v = Math.max(1, Math.min(6, value))
  const pips = pipPositions[v]
  const c = variantColors[variant]
  const pipR = s < 30 ? 2 : 2.5
  const scale = s / 24

  return (
    <svg
      width={s}
      height={s}
      viewBox="0 0 24 24"
      className={clsx('inline-block', className)}
    >
      <rect
        x="1" y="1" width="22" height="22" rx="3"
        fill={c.bg} stroke={c.border} strokeWidth="1.5"
      />
      {pips.map(([cx, cy], i) => (
        <circle
          key={i}
          cx={cx} cy={cy} r={pipR / scale}
          fill={c.pip}
        />
      ))}
    </svg>
  )
}
