import type { Player, Skill } from '@forgod/core'
import { SKILLS_BY_CLASS } from '@forgod/core'
import HealthBar from '../ui/HealthBar'
import Badge from '../ui/Badge'
import DiceDisplay from '../ui/DiceDisplay'
import { CLASS_LABELS, STATE_LABELS } from '../../styles/theme'

interface CurrentPlayerPanelProps {
  player: Player
}

function getStatValue(dice: [number, number]): number {
  return dice[0] + dice[1]
}

function getLevel(player: Player): number {
  return Math.max(
    getStatValue(player.stats.strength),
    getStatValue(player.stats.dexterity),
    getStatValue(player.stats.intelligence),
  )
}

export default function CurrentPlayerPanel({ player }: CurrentPlayerPanelProps) {
  const level = getLevel(player)
  const skills: Skill[] = SKILLS_BY_CLASS[player.heroClass] || []

  return (
    <div className="bg-parchment-texture border-wood-frame rounded-lg p-3 space-y-3">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h3 className="font-serif font-bold text-ink text-lg">{player.name}</h3>
          <div className="flex items-center gap-1 mt-0.5">
            <Badge variant={player.heroClass as 'warrior' | 'rogue' | 'mage'}>
              {CLASS_LABELS[player.heroClass]}
            </Badge>
            <Badge variant={player.state as 'holy' | 'corrupt'}>
              {STATE_LABELS[player.state]}
            </Badge>
            <Badge variant="gold">Lv.{level}</Badge>
          </div>
        </div>
        <div className="text-right">
          <div className="text-xs text-ink-faded">정수</div>
          <div className="font-mono font-bold text-gold-dark text-lg">{player.monsterEssence}</div>
        </div>
      </div>

      {/* HP */}
      <HealthBar current={player.health} max={player.maxHealth} size="lg" />

      {/* Stats */}
      <div className="grid grid-cols-3 gap-2">
        {(['strength', 'dexterity', 'intelligence'] as const).map(stat => {
          const dice = player.stats[stat]
          const label = stat === 'strength' ? '힘' : stat === 'dexterity' ? '민첩' : '지능'
          const isCorruptTarget = player.corruptDiceTarget === stat
          return (
            <div key={stat} className="text-center p-1.5 bg-parchment-dark/30 rounded">
              <div className="text-[10px] text-ink-faded font-medium">{label}</div>
              <div className="flex justify-center items-center gap-0.5 mt-1">
                <DiceDisplay value={dice[0]} size="sm" />
                <span className="text-ink-faded text-xs">+</span>
                <DiceDisplay value={dice[1]} size="sm" />
                {isCorruptTarget && player.corruptDice && (
                  <>
                    <span className="text-corrupt text-xs">+</span>
                    <DiceDisplay value={player.corruptDice} size="sm" variant="corrupt" />
                  </>
                )}
              </div>
              <div className="font-mono font-bold text-ink text-sm mt-0.5">
                {getStatValue(dice)}{isCorruptTarget && player.corruptDice ? `+${player.corruptDice}` : ''}
              </div>
            </div>
          )
        })}
      </div>

      {/* Skills */}
      <div>
        <h4 className="font-serif font-semibold text-wood-dark text-xs mb-1">스킬</h4>
        <div className="space-y-1">
          {skills.map(skill => {
            const cd = player.skillCooldowns[skill.id] || 0
            const onCooldown = cd > 0
            return (
              <div key={skill.id} className="flex items-center gap-1.5 text-xs">
                <span className={`flex-1 truncate ${onCooldown ? 'text-ink-faded' : 'text-ink'}`}>
                  {skill.name}
                </span>
                <span className="text-gold-dark font-mono">{skill.cost}</span>
                {onCooldown && (
                  <span className="text-red-600 font-mono text-[10px]">CD:{cd}</span>
                )}
              </div>
            )
          })}
        </div>
      </div>

      {/* Scores */}
      <div className="flex gap-3 pt-2 border-t border-wood/20">
        <div className="text-center flex-1">
          <div className="text-[10px] text-holy">신앙</div>
          <div className="font-mono font-bold text-holy">{player.faithScore}</div>
        </div>
        <div className="text-center flex-1">
          <div className="text-[10px] text-corrupt">마왕</div>
          <div className="font-mono font-bold text-corrupt">{player.devilScore}</div>
        </div>
        <div className="text-center flex-1">
          <div className="text-[10px] text-ink-faded">계시</div>
          <div className="font-mono font-bold text-ink">{player.revelations.length}</div>
        </div>
      </div>

      {/* Buffs */}
      {(player.ironStanceActive || player.poisonActive || player.isStealthed || player.isEnhanced || player.isBound) && (
        <div className="flex flex-wrap gap-1 pt-1 border-t border-wood/20">
          {player.ironStanceActive && <Badge variant="default">무적 태세</Badge>}
          {player.poisonActive && <Badge variant="rogue">독</Badge>}
          {player.isStealthed && <Badge variant="default">은신</Badge>}
          {player.isEnhanced && <Badge variant="mage">강화</Badge>}
          {player.isBound && <Badge variant="danger">속박</Badge>}
        </div>
      )}
    </div>
  )
}
