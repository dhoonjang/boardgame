import clsx from 'clsx'
import type { Player } from '@forgod/core'
import HealthBar from '../ui/HealthBar'
import Badge from '../ui/Badge'
import { CLASS_LABELS, STATE_LABELS } from '../../styles/theme'

interface PlayerListProps {
  players: Player[]
  currentPlayerId: string | null
  onPlayerSelect?: (playerId: string) => void
  selectedPlayerId?: string | null
}

export default function PlayerList({ players, currentPlayerId, onPlayerSelect, selectedPlayerId }: PlayerListProps) {
  return (
    <div className="bg-parchment-texture border-wood-frame rounded-lg p-2 space-y-1">
      <h3 className="font-serif font-bold text-wood-dark text-sm px-1">용사들</h3>
      {players.map(player => (
        <div
          key={player.id}
          onClick={() => onPlayerSelect?.(player.id)}
          className={clsx(
            'flex items-center gap-2 px-2 py-1.5 rounded cursor-pointer transition-colors',
            player.id === currentPlayerId && 'bg-gold/15 border border-gold/30',
            player.id === selectedPlayerId && 'ring-1 ring-gold',
            player.isDead && 'opacity-50',
            player.id !== currentPlayerId && 'hover:bg-parchment-dark/30'
          )}
        >
          {/* Class color dot */}
          <div className={clsx(
            'w-3 h-3 rounded-full shrink-0',
            player.heroClass === 'warrior' && 'bg-warrior',
            player.heroClass === 'rogue' && 'bg-rogue',
            player.heroClass === 'mage' && 'bg-mage',
          )} />

          {/* Name & badges */}
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-1">
              <span className="font-serif font-semibold text-ink text-sm truncate">
                {player.name}
              </span>
              {player.id === currentPlayerId && (
                <span className="text-[9px] text-gold-dark font-bold">NOW</span>
              )}
            </div>
            <div className="flex items-center gap-1 mt-0.5">
              <Badge variant={player.heroClass as 'warrior' | 'rogue' | 'mage'} size="sm">
                {CLASS_LABELS[player.heroClass]}
              </Badge>
              <Badge variant={player.state as 'holy' | 'corrupt'} size="sm">
                {STATE_LABELS[player.state]}
              </Badge>
              {player.isDead && <Badge variant="danger" size="sm">사망 ({player.deathTurnsRemaining})</Badge>}
              {player.hasDemonSword && <Badge variant="gold" size="sm">마검</Badge>}
            </div>
          </div>

          {/* HP bar */}
          <div className="w-16 shrink-0">
            <HealthBar current={player.health} max={player.maxHealth} size="sm" showText={false} />
            <div className="text-[9px] text-ink-faded text-center mt-0.5">
              {player.health}/{player.maxHealth}
            </div>
          </div>
        </div>
      ))}
    </div>
  )
}
