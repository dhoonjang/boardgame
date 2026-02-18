import { useEffect, useState } from 'react'
import type { ValidAction, GameAction } from '@indian-poker/server/game'

interface Props {
  validActions: ValidAction[]
  onAction: (action: GameAction) => void
}

export default function BettingControls({ validActions, onAction }: Props) {
  const raiseAction = validActions.find(a => a.type === 'RAISE')
  const minRaise = raiseAction?.minAmount ?? 1
  const maxRaise = raiseAction?.maxAmount ?? 1
  const [raiseAmount, setRaiseAmount] = useState(minRaise)

  // validActions 변경 시 raiseAmount를 유효 범위 내로 보정
  useEffect(() => {
    setRaiseAmount(prev => Math.max(minRaise, Math.min(prev, maxRaise)))
  }, [minRaise, maxRaise])

  const callAction = validActions.find(a => a.type === 'CALL')
  const foldAction = validActions.find(a => a.type === 'FOLD')

  return (
    <div className="flex flex-col gap-3">
      {raiseAction && (
        <div className="flex items-center gap-2">
          <input
            type="range"
            min={raiseAction.minAmount ?? 1}
            max={raiseAction.maxAmount ?? 1}
            value={raiseAmount}
            onChange={e => setRaiseAmount(parseInt(e.target.value))}
            className="flex-1 accent-poker-accent"
          />
          <button
            onClick={() => onAction({ type: 'RAISE', amount: raiseAmount })}
            className="px-4 py-2 bg-poker-accent hover:bg-amber-600 text-white font-semibold rounded-lg transition-colors min-w-[120px]"
          >
            레이즈 {raiseAmount}
          </button>
        </div>
      )}
      <div className="flex gap-2">
        {callAction && (
          <button
            onClick={() => onAction({ type: 'CALL' })}
            className="flex-1 px-4 py-2 bg-emerald-600 hover:bg-emerald-500 text-white font-semibold rounded-lg transition-colors"
          >
            {callAction.description}
          </button>
        )}
        {foldAction && (
          <button
            onClick={() => onAction({ type: 'FOLD' })}
            className="flex-1 px-4 py-2 bg-red-600 hover:bg-red-500 text-white font-semibold rounded-lg transition-colors"
          >
            폴드
          </button>
        )}
      </div>
    </div>
  )
}
