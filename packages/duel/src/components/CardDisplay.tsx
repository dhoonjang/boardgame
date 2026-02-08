import type { Card } from '@duel/server/game'

function getCardColor(value: Card): string {
  if (value <= 3) return 'from-red-500 to-red-700'
  if (value <= 6) return 'from-amber-500 to-amber-700'
  return 'from-emerald-500 to-emerald-700'
}

export default function CardDisplay({ value, size = 'lg' }: { value: Card; size?: 'sm' | 'lg' }) {
  const sizeClasses = size === 'lg'
    ? 'w-28 h-40 text-5xl'
    : 'w-16 h-24 text-2xl'

  return (
    <div className={`${sizeClasses} bg-gradient-to-br ${getCardColor(value)} rounded-xl flex items-center justify-center font-extrabold text-white shadow-lg border-2 border-white/20`}>
      {value}
    </div>
  )
}
