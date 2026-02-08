import type { RoundResult } from '@duel/core'

interface Props {
  history: RoundResult[]
  myPlayerId: string
}

export default function RoundHistory({ history, myPlayerId }: Props) {
  if (history.length === 0) return null

  return (
    <div className="bg-duel-surface rounded-lg border border-duel-border p-3">
      <h3 className="text-sm font-semibold text-slate-400 mb-2">라운드 기록</h3>
      <div className="flex flex-col gap-1">
        {history.map((r) => {
          const won = r.winner === myPlayerId
          const folded = r.foldedPlayerId !== null
          return (
            <div key={r.roundNumber} className="flex items-center gap-2 text-sm">
              <span className="text-slate-500 w-6">R{r.roundNumber}</span>
              <span className="text-slate-300">{r.player0Card} vs {r.player1Card}</span>
              {folded ? (
                <span className="text-yellow-400">폴드</span>
              ) : (
                <span className={won ? 'text-emerald-400' : r.winner === null ? 'text-slate-400' : 'text-red-400'}>
                  {won ? '승' : r.winner === null ? '무' : '패'}
                </span>
              )}
              <span className="text-duel-gold ml-auto">+{r.potWon}</span>
            </div>
          )
        })}
      </div>
    </div>
  )
}
