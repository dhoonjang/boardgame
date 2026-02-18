import type { RoundResult } from '@indian-poker/server/game'

interface Props {
  history: RoundResult[]
  myPlayerId: string
  myIndex: number
}

export default function RoundHistory({ history, myPlayerId, myIndex }: Props) {
  if (history.length === 0) return null

  return (
    <div className="bg-poker-surface rounded-lg border border-poker-border p-3">
      <h3 className="text-sm font-semibold text-slate-400 mb-2">라운드 기록</h3>
      <div className="flex flex-col gap-1">
        {history.map((r) => {
          const won = r.winner === myPlayerId
          const isDraw = r.winner === null && r.foldedPlayerId === null
          const chipChange = myIndex === 0 ? r.player0ChipChange : r.player1ChipChange
          const chipStr = chipChange >= 0 ? `+${chipChange}` : `${chipChange}`

          return (
            <div key={r.roundNumber} className="flex items-center gap-2 text-sm">
              <span className="text-slate-500 w-6">R{r.roundNumber}</span>
              <span className="text-slate-300">{r.player0Card} vs {r.player1Card}</span>
              <span className={won ? 'text-emerald-400' : isDraw ? 'text-slate-400' : 'text-red-400'}>
                {won ? '승' : isDraw ? '무' : '패'}
              </span>
              <span className={`ml-auto ${chipChange > 0 ? 'text-emerald-400' : chipChange < 0 ? 'text-red-400' : 'text-slate-400'}`}>
                {chipStr}
              </span>
            </div>
          )
        })}
      </div>
    </div>
  )
}
