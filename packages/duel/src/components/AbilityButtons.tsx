import type { ValidAction, GameAction } from '@duel/core'

interface Props {
  validActions: ValidAction[]
  onAction: (action: GameAction) => void
}

export default function AbilityButtons({ validActions, onAction }: Props) {
  const peekAction = validActions.find(a => a.type === 'PEEK')
  const swapAction = validActions.find(a => a.type === 'SWAP')
  const skipAction = validActions.find(a => a.type === 'SKIP_ABILITY')

  return (
    <div className="flex flex-col gap-2">
      <p className="text-sm text-slate-400 text-center">능력 선택</p>
      <div className="flex gap-2">
        {peekAction && (
          <button
            onClick={() => onAction({ type: 'PEEK' })}
            className="flex-1 px-4 py-3 bg-purple-600 hover:bg-purple-500 text-white font-semibold rounded-lg transition-colors"
          >
            {peekAction.description}
          </button>
        )}
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
