import type { PlayerView } from '@duel/core'

interface Props {
  view: PlayerView
  myPlayerId: string
  onGoHome: () => void
}

export default function GameOverModal({ view, myPlayerId, onGoHome }: Props) {
  const won = view.winner === myPlayerId
  const draw = view.isDraw

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
