import type { PlayerView, RoundResult, Card } from '@duel/server/game'
import CardDisplay from './CardDisplay'

interface Props {
  view: PlayerView
  myPlayerId: string
  onGoHome: () => void
}

function getLastRoundInfo(lastRound: RoundResult, myIndex: number) {
  const myCard: Card = myIndex === 0 ? lastRound.player0Card : lastRound.player1Card
  const opponentCard: Card = myIndex === 0 ? lastRound.player1Card : lastRound.player0Card
  const chipChange = myIndex === 0 ? lastRound.player0ChipChange : lastRound.player1ChipChange
  const isDraw = lastRound.winner === null && lastRound.foldedPlayerId === null

  let label: string
  let color: string
  if (isDraw) {
    label = '무승부'
    color = 'text-slate-300'
  } else if (chipChange > 0) {
    label = '승리'
    color = 'text-emerald-400'
  } else {
    label = '패배'
    color = 'text-red-400'
  }

  return { myCard, opponentCard, label, color }
}

export default function GameOverModal({ view, myPlayerId, onGoHome }: Props) {
  const won = view.winner === myPlayerId
  const draw = view.isDraw
  const lastRound = view.roundHistory[view.roundHistory.length - 1] as RoundResult | undefined

  return (
    <div className="fixed inset-0 bg-black/70 flex items-center justify-center z-50">
      <div className="bg-duel-surface border border-duel-border rounded-2xl p-8 max-w-sm w-full mx-4 text-center">
        <h2 className="text-3xl font-extrabold mb-4">
          {draw ? (
            <span className="text-slate-300">무승부!</span>
          ) : won ? (
            <span className="text-duel-gold">승리!</span>
          ) : (
            <span className="text-red-400">패배...</span>
          )}
        </h2>

        {/* 마지막 라운드 결과 */}
        {lastRound && (() => {
          const info = getLastRoundInfo(lastRound, view.myIndex)
          return (
            <div className="mb-4">
              <p className="text-xs text-slate-500 mb-2">마지막 라운드</p>
              <div className="flex items-center justify-center gap-3 mb-1">
                <div className="flex flex-col items-center gap-1">
                  <span className="text-xs text-slate-400">{view.opponent.name}</span>
                  <CardDisplay value={info.opponentCard} size="sm" />
                </div>
                <span className="text-slate-500 font-bold">VS</span>
                <div className="flex flex-col items-center gap-1">
                  <span className="text-xs text-slate-400">{view.me.name}</span>
                  <CardDisplay value={info.myCard} size="sm" />
                </div>
              </div>
              <p className={`text-sm font-semibold ${info.color}`}>{info.label}</p>
            </div>
          )
        })()}

        <div className="flex justify-center gap-8 mb-6">
          <div className="text-center">
            <p className="text-sm text-slate-400">{view.me.name}</p>
            <p className="text-2xl font-bold text-duel-gold">{view.me.chips}</p>
          </div>
          <div className="text-slate-500 text-2xl font-bold self-end">vs</div>
          <div className="text-center">
            <p className="text-sm text-slate-400">{view.opponent.name}</p>
            <p className="text-2xl font-bold text-duel-gold">{view.opponent.chips}</p>
          </div>
        </div>

        <button
          onClick={onGoHome}
          className="w-full px-6 py-3 bg-duel-accent hover:bg-indigo-500 text-white font-semibold rounded-lg transition-colors"
        >
          홈으로
        </button>
      </div>
    </div>
  )
}
