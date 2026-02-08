import type { Player, Stats } from '@forgod/core'
import { useGameStore } from '../../store/gameStore'
import RetroButton from '../ui/RetroButton'
import DiceDisplay from '../ui/DiceDisplay'

interface StatUpgradePanelProps {
  player: Player
}

const STAT_LABELS: Record<keyof Stats, string> = {
  strength: '힘',
  dexterity: '민첩',
  intelligence: '지능',
}

function getLevel(player: Player): number {
  return Math.max(
    player.stats.strength[0] + player.stats.strength[1],
    player.stats.dexterity[0] + player.stats.dexterity[1],
    player.stats.intelligence[0] + player.stats.intelligence[1],
  )
}

export default function StatUpgradePanel({ player }: StatUpgradePanelProps) {
  const { executeAction, validActions } = useGameStore()

  const level = getLevel(player)
  const cost = level
  const canAfford = player.monsterEssence >= cost
  const canRoll = validActions.some(va => va.action.type === 'ROLL_STAT_DICE')

  if (!canRoll) return null

  return (
    <div className="bg-parchment-dark/20 rounded-lg p-2">
      <div className="flex items-center justify-between mb-1.5">
        <span className="text-xs font-serif font-bold text-wood-dark">능력치 업그레이드</span>
        <span className="text-[10px] text-ink-faded">
          비용: {cost} 정수 (보유: {player.monsterEssence})
        </span>
      </div>
      <div className="grid grid-cols-3 gap-1">
        {(Object.keys(STAT_LABELS) as (keyof Stats)[]).map(stat => {
          const dice = player.stats[stat]
          return (
            <RetroButton
              key={stat}
              variant="secondary"
              size="sm"
              disabled={!canAfford}
              onClick={() => executeAction({ type: 'ROLL_STAT_DICE', stat })}
              className="flex flex-col items-center gap-0.5"
            >
              <span className="text-[10px]">{STAT_LABELS[stat]}</span>
              <div className="flex gap-0.5">
                <DiceDisplay value={dice[0]} size="sm" />
                <DiceDisplay value={dice[1]} size="sm" />
              </div>
              <span className="text-[9px] text-ink-faded font-mono">{dice[0] + dice[1]}</span>
            </RetroButton>
          )
        })}
      </div>
    </div>
  )
}
