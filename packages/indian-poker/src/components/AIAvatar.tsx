import type { AIExpression, Card } from '@indian-poker/server/game'

interface Props {
  expression: AIExpression
  characterId: string
  card?: Card | null
  size?: 'sm' | 'md' | 'xl'
}

function cardColor(card: Card): string {
  if (card <= 3) return '#ef4444'   // 빨강 (약한 카드)
  if (card <= 6) return '#f59e0b'   // 주황 (중간 카드)
  return '#22c55e'                   // 초록 (강한 카드)
}

const sizeConfig = {
  sm: {
    container: 'w-14 h-14 rounded-xl',
    card: 'w-5 h-7 text-xs -top-1.5',
    noBorder: false,
  },
  md: {
    container: 'w-20 h-20 rounded-2xl',
    card: 'w-7 h-10 text-lg -top-2',
    noBorder: false,
  },
  xl: {
    container: 'w-48 h-48 sm:w-64 sm:h-64 md:w-80 md:h-80 lg:w-[28rem] lg:h-[28rem]',
    card: 'w-10 h-14 text-xl sm:w-12 sm:h-16 sm:text-2xl -top-1 sm:-top-1.5 md:-top-2',
    noBorder: true,
  },
}

export default function AIAvatar({ expression, characterId, card, size = 'md' }: Props) {
  const cfg = sizeConfig[size]

  return (
    <div className="relative inline-block">
      <img
        src={`/characters/${characterId}/${expression}.png`}
        alt={expression}
        className={`${cfg.container} ${cfg.noBorder ? 'object-contain' : 'object-cover border-2 border-poker-border'}`}
        onError={e => {
          const img = e.target as HTMLImageElement
          if (!img.src.endsWith('/poker_face.png')) {
            img.src = `/characters/${characterId}/poker_face.png`
          }
        }}
      />

      {/* 이마 카드 오버레이 */}
      {card && (
        <div
          className={`absolute ${cfg.card} left-1/2 -translate-x-1/2 -rotate-3
                     bg-white rounded-md shadow-lg border-2 border-poker-gold
                     flex items-center justify-center font-bold`}
          style={{ color: cardColor(card) }}
        >
          {card}
        </div>
      )}
    </div>
  )
}
