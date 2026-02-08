import type { ValidAction, GameAction } from '@duel/server/game'

interface Props {
  validActions: ValidAction[]
  onAction: (action: GameAction) => void
}

export default function AbilityButtons({ validActions, onAction }: Props) {
  const swapAction = validActions.find(a => a.type === 'SWAP')
  const skipAction = validActions.find(a => a.type === 'SKIP_ABILITY')

  return (
    <div className="flex flex-col gap-2">
      <p className="text-sm text-slate-400 text-center">능력 선택</p>
      <div className="flex gap-2">
        {swapAction && (
          <button
            onClick={() => onAction({ type: 'SWAP' })}
            className="flex-1 px-4 py-3 bg-cyan-600 hover:bg-cyan-500 text-white font-semibold rounded-lg transition-colors"
          >
            {swapAction.description}
          </button>
        )}
        {skipAction && (
          <button
            onClick={() => onAction({ type: 'SKIP_ABILITY' })}
            className="flex-1 px-4 py-3 bg-slate-600 hover:bg-slate-500 text-white font-semibold rounded-lg transition-colors"
          >
            건너뛰기
          </button>
        )}
      </div>
    </div>
  )
}
