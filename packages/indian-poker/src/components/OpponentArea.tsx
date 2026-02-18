import type { PlayerViewPlayer, Card, AIExpression } from '@indian-poker/server/game'
import AIAvatar from './AIAvatar'

interface Props {
  opponent: PlayerViewPlayer
  opponentCard: Card | null
  isAIGame?: boolean
  aiExpression?: AIExpression | null
  aiCharacterId?: string | null
}

function cardColor(card: Card): string {
  if (card <= 3) return '#ef4444'
  if (card <= 6) return '#f59e0b'
  return '#22c55e'
}

export default function OpponentArea({ opponent, opponentCard, isAIGame, aiExpression, aiCharacterId }: Props) {
  return (
    <div className="flex flex-col items-center gap-2">
      {/* 아바타 (AI 또는 이니셜) */}
      <div className="relative">
        {isAIGame && aiCharacterId ? (
          <AIAvatar
            expression={aiExpression ?? 'poker_face'}
            characterId={aiCharacterId}
            card={opponentCard}
            size="xl"
          />
        ) : (
          <div className="relative inline-block">
            {/* 이니셜 원형 아바타 */}
            <div className="w-48 h-48 sm:w-64 sm:h-64 md:w-80 md:h-80 lg:w-[28rem] lg:h-[28rem] rounded-3xl bg-slate-700 border-2 border-poker-border flex items-center justify-center">
              <span className="text-5xl sm:text-6xl md:text-7xl lg:text-8xl font-bold text-slate-400">
                {opponent.name.charAt(0).toUpperCase()}
              </span>
            </div>
            {/* 이마 카드 오버레이 (비AI) */}
            {opponentCard && (
              <div
                className="absolute -top-1 sm:-top-1.5 md:-top-2 left-1/2 -translate-x-1/2 -rotate-3
                           bg-white rounded-md shadow-lg border-2 border-poker-gold
                           w-10 h-14 sm:w-12 sm:h-16 flex items-center justify-center
                           text-xl sm:text-2xl font-bold"
                style={{ color: cardColor(opponentCard) }}
              >
                {opponentCard}
              </div>
            )}
          </div>
        )}
      </div>

      {/* 이름 + 칩 + AI 뱃지 */}
      <div className="flex items-center gap-2">
        <span className="text-lg font-semibold">{opponent.name}</span>
        <span className="text-sm text-slate-300 font-semibold">🪙 {opponent.chips}</span>
        {isAIGame && (
          <span className="text-xs px-2 py-0.5 bg-amber-500/20 text-amber-300 rounded-full">AI</span>
        )}
      </div>
    </div>
  )
}
