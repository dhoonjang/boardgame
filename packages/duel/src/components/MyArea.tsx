import type { PlayerViewPlayer } from '@duel/server/game'
import HiddenCard from './HiddenCard'
import ChipStack from './ChipStack'

interface Props {
  me: PlayerViewPlayer
}

export default function MyArea({ me }: Props) {
  return (
    <div className="flex flex-col items-center gap-3 p-4 bg-duel-surface rounded-xl border border-duel-accent/30">
      <div className="flex items-center gap-2">
        <span className="text-lg font-semibold text-duel-accent">{me.name} (나)</span>
      </div>

      {/* 내 카드: 항상 숨김 (순수 인디언 포커) */}
      <div className="relative">
        <HiddenCard />
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
        <span>교체: {me.swapCount}회</span>
      </div>
    </div>
  )
}
