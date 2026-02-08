import type { Player, Stats } from '@forgod/core'
import { useGameStore } from '../../store/gameStore'
import RetroButton from '../ui/RetroButton'
import DiceDisplay from '../ui/DiceDisplay'

interface CorruptDicePanelProps {
  player: Player
}

const STAT_LABELS: Record<keyof Stats, string> = {
  strength: '힘',
  dexterity: '민첩',
  intelligence: '지능',
}

export default function CorruptDicePanel({ player }: CorruptDicePanelProps) {
  const { executeAction, validActions } = useGameStore()

  if (!player.corruptDice || player.corruptDiceTarget) return null

  const canApply = validActions.some(va => va.action.type === 'APPLY_CORRUPT_DICE')

  return (
    <div className="bg-corrupt/10 border border-corrupt/30 rounded-lg p-2">
      <div className="flex items-center gap-2 mb-1.5">
        <span className="text-xs font-serif font-bold text-corrupt">타락 주사위</span>
        <DiceDisplay value={player.corruptDice} size="sm" variant="corrupt" />
      </div>
      {canApply && (
        <div className="flex gap-1">
          {(Object.keys(STAT_LABELS) as (keyof Stats)[]).map(stat => (
            <RetroButton
              key={stat}
              variant="ghost"
              size="sm"
              onClick={() => executeAction({ type: 'APPLY_CORRUPT_DICE', stat })}
              className="text-[10px]"
            >
              {STAT_LABELS[stat]}에 적용
            </RetroButton>
          ))}
        </div>
      )}
    </div>
  )
}
