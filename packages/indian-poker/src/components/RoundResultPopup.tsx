import type { RoundResult, Card } from '@indian-poker/server/game'
import CardDisplay from './CardDisplay'

interface Props {
  result: RoundResult
  myIndex: number
  myName: string
  opponentName: string
  onDismiss: () => void
}

export default function RoundResultPopup({ result, myIndex, myName, opponentName, onDismiss }: Props) {
  const myCard: Card = myIndex === 0 ? result.player0Card : result.player1Card
  const opponentCard: Card = myIndex === 0 ? result.player1Card : result.player0Card
  const chipChange = myIndex === 0 ? result.player0ChipChange : result.player1ChipChange

  const iWon = chipChange > 0
  const isDraw = result.winner === null && result.foldedPlayerId === null

  let resultLabel: string
  let resultColor: string

  if (isDraw) {
    resultLabel = '무승부'
    resultColor = 'text-slate-300'
  } else if (iWon) {
    resultLabel = '승리!'
    resultColor = 'text-emerald-400'
  } else {
    resultLabel = '패배'
    resultColor = 'text-red-400'
  }

  const chipStr = chipChange >= 0 ? `+${chipChange}` : `${chipChange}`

  return (
    <div
      className="fixed inset-0 bg-black/50 flex items-center justify-center z-40 cursor-pointer"
      onClick={onDismiss}
    >
      <div
        className="bg-poker-surface border border-poker-border rounded-2xl p-6 max-w-xs w-full mx-4 text-center animate-popup-in"
        onClick={(e) => e.stopPropagation()}
      >
        <p className="text-sm text-slate-400 mb-1">라운드 {result.roundNumber}</p>
        <h3 className={`text-2xl font-extrabold mb-4 ${resultColor}`}>{resultLabel}</h3>

        <div className="flex items-center justify-center gap-4 mb-4">
          <div className="flex flex-col items-center gap-1">
            <span className="text-xs text-slate-400">{opponentName}</span>
            <CardDisplay value={opponentCard} size="sm" />
          </div>
          <span className="text-slate-500 font-bold text-lg">VS</span>
          <div className="flex flex-col items-center gap-1">
            <span className="text-xs text-slate-400">{myName}</span>
            <CardDisplay value={myCard} size="sm" />
          </div>
        </div>

        <p className={`font-semibold text-lg ${isDraw ? 'mb-1' : 'mb-4'} ${chipChange > 0 ? 'text-emerald-400' : chipChange < 0 ? 'text-red-400' : 'text-slate-400'}`}>
          {chipStr}칩
        </p>
        {isDraw && result.potWon === 0 && (
          <p className="text-xs text-amber-400 mb-4">팟이 다음 라운드로 이월됩니다</p>
        )}

        <button
          onClick={onDismiss}
          className="w-full px-4 py-2 bg-poker-accent hover:bg-amber-600 text-white font-semibold rounded-lg transition-colors"
        >
          확인
        </button>
      </div>
    </div>
  )
}
