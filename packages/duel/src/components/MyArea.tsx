import type { PlayerViewPlayer, Card } from '@duel/core'
import CardDisplay from './CardDisplay'
import HiddenCard from './HiddenCard'
import ChipStack from './ChipStack'

interface Props {
  me: PlayerViewPlayer
  myCard: Card | null
  hasPeeked: boolean
}

export default function MyArea({ me, myCard, hasPeeked }: Props) {
  return (
    <div className="flex flex-col items-center gap-3 p-4 bg-duel-surface rounded-xl border border-duel-accent/30">
      <div className="flex items-center gap-2">
        <span className="text-lg font-semibold text-duel-accent">{me.name} (나)</span>
      </div>

      {/* 내 카드: peek 했으면 보임, 아니면 숨김 */}
      <div className="relative">
        {myCard ? (
          <CardDisplay value={myCard} />
        ) : hasPeeked ? (
          <div className="w-28 h-40 bg-slate-700 rounded-xl flex items-center justify-center text-slate-500">
            대기 중
          </div>
        ) : (
          <HiddenCard />
        )}
        <div className="absolute -top-2 -right-2 bg-duel-accent text-white text-xs px-2 py-0.5 rounded-full font-semibold">
          내 카드
        </div>
      </div>

      <div className="flex gap-6">
        <ChipStack amount={me.chips} label="칩" />
        <div className="flex flex-col items-center gap-1">
          <span className="text-sm text-slate-400">베팅</span>
          <span className="text-xl font-bold text-white">{me.currentBet}</span>
        </div>
      </div>

      <div className="flex gap-3 text-xs text-slate-400">
        <span>엿보기: {me.peekCount}회</span>
        <span>교체: {me.swapCount}회</span>
      </div>
    </div>
  )
}
