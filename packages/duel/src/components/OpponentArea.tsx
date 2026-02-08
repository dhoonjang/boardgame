import type { PlayerViewPlayer, Card } from '@duel/core'
import CardDisplay from './CardDisplay'
import ChipStack from './ChipStack'

interface Props {
  opponent: PlayerViewPlayer
  opponentCard: Card | null
}

export default function OpponentArea({ opponent, opponentCard }: Props) {
  return (
    <div className="flex flex-col items-center gap-3 p-4 bg-duel-surface rounded-xl border border-duel-border">
      <div className="flex items-center gap-2">
        <span className="text-lg font-semibold">{opponent.name}</span>
        {opponent.hasPeeked && (
          <span className="text-xs px-2 py-0.5 bg-purple-600/30 text-purple-300 rounded-full">엿봤음</span>
        )}
      </div>

      {/* 상대 카드: 항상 보임 (인디언 포커 핵심) */}
      <div className="relative">
        {opponentCard ? (
          <CardDisplay value={opponentCard} />
        ) : (
          <div className="w-28 h-40 bg-slate-700 rounded-xl flex items-center justify-center text-slate-500">
            대기 중
          </div>
        )}
        <div className="absolute -top-2 -right-2 bg-emerald-500 text-white text-xs px-2 py-0.5 rounded-full font-semibold">
          상대 카드
        </div>
      </div>

      <div className="flex gap-6">
        <ChipStack amount={opponent.chips} label="칩" />
        <div className="flex flex-col items-center gap-1">
          <span className="text-sm text-slate-400">베팅</span>
          <span className="text-xl font-bold text-white">{opponent.currentBet}</span>
        </div>
      </div>
    </div>
  )
}
