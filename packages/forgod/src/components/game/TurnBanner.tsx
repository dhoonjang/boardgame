import clsx from 'clsx'
import type { GameState } from '@forgod/core'
import Badge from '../ui/Badge'
import RetroButton from '../ui/RetroButton'
import { CLASS_LABELS, STATE_LABELS } from '../../styles/theme'

interface TurnBannerProps {
  gameState: GameState
  currentPlayerId: string | null
  isMonsterTurn: boolean
  onQuit?: () => void
}

const phaseLabels: Record<string, string> = {
  move: '이동 페이즈',
  action: '행동 페이즈',
}

export default function TurnBanner({ gameState, currentPlayerId, isMonsterTurn, onQuit }: TurnBannerProps) {
  const player = gameState.players.find(p => p.id === currentPlayerId)

  return (
    <div className="bg-parchment-texture border-wood-frame rounded-lg px-4 py-2 flex items-center justify-between gap-3">
      {/* Left: Round info */}
      <div className="flex items-center gap-2">
        <span className="font-serif font-bold text-wood-dark text-lg">
          R{gameState.roundNumber}
        </span>
        <span className="text-ink-faded text-xs">
          턴 {gameState.currentTurnIndex + 1}/{gameState.roundTurnOrder.length}
        </span>
      </div>

      {/* Center: Current turn */}
      <div className="flex items-center gap-2">
        {isMonsterTurn ? (
          <span className="font-serif font-bold text-red-700 text-base">
            몬스터 턴
          </span>
        ) : player ? (
          <>
            <Badge variant={player.heroClass as 'warrior' | 'rogue' | 'mage'}>
              {CLASS_LABELS[player.heroClass]}
            </Badge>
            <span className="font-serif font-bold text-ink text-base">
              {player.name}
            </span>
            <Badge variant={player.state as 'holy' | 'corrupt'}>
              {STATE_LABELS[player.state]}
            </Badge>
            <span className={clsx(
              'text-sm font-medium px-2 py-0.5 rounded',
              player.turnPhase === 'move'
                ? 'bg-gold/20 text-gold-dark'
                : 'bg-warrior/20 text-warrior',
            )}>
              {phaseLabels[player.turnPhase] || player.turnPhase}
            </span>
          </>
        ) : (
          <span className="text-ink-faded">대기중...</span>
        )}
      </div>

      {/* Right: Movement/action info + quit button */}
      <div className="flex items-center gap-3 text-xs text-ink-faded">
        {player && player.turnPhase === 'move' && player.remainingMovement !== null && (
          <div className="flex items-center gap-1.5 bg-gold/20 border border-gold/40 rounded-lg px-3 py-1">
            <span className="text-gold-dark text-xs font-serif">이동력</span>
            <span className="font-mono font-bold text-gold text-lg leading-none">
              {player.remainingMovement}
            </span>
          </div>
        )}
        {player && player.turnPhase === 'move' && player.remainingMovement === null && (
          <span className="text-ink-faded text-xs font-serif italic">주사위를 굴려주세요</span>
        )}
        {player && player.turnPhase === 'action' && (
          <div className="flex items-center gap-1.5 bg-warrior/10 border border-warrior/30 rounded-lg px-3 py-1">
            <span className="text-warrior text-xs font-serif">스킬 비용</span>
            <span className="font-mono font-bold text-warrior text-base leading-none">
              {player.usedSkillCost}/{player.stats.intelligence[0] + player.stats.intelligence[1]}
            </span>
          </div>
        )}
        {onQuit && (
          <RetroButton variant="ghost" size="sm" onClick={onQuit}>
            나가기
          </RetroButton>
        )}
      </div>
    </div>
  )
}
