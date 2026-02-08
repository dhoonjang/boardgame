import clsx from 'clsx'
import type { ValidAction, HexCoord } from '@forgod/core'
import { useGameStore } from '../../store/gameStore'
import { getReachableTiles } from '../../utils/hexUtils'
import RetroButton from '../ui/RetroButton'

interface ActionPanelProps {
  validActions: ValidAction[]
  onTileAction?: (coord: HexCoord) => void
}

// Categorize actions for display
function categorizeActions(actions: ValidAction[]) {
  const categories: Record<string, ValidAction[]> = {
    movement: [],
    combat: [],
    skill: [],
    special: [],
    other: [],
  }

  for (const va of actions) {
    const t = va.action.type
    if (t === 'ROLL_MOVE_DICE' || t === 'MOVE' || t === 'END_MOVE_PHASE' || t === 'CHOOSE_ESCAPE_TILE') {
      categories.movement.push(va)
    } else if (t === 'BASIC_ATTACK') {
      categories.combat.push(va)
    } else if (t === 'USE_SKILL') {
      categories.skill.push(va)
    } else if (t === 'END_TURN' || t === 'ROLL_STAT_DICE' || t === 'COMPLETE_REVELATION') {
      categories.other.push(va)
    } else {
      categories.special.push(va)
    }
  }
  return categories
}

function getActionVariant(type: string): 'primary' | 'secondary' | 'danger' | 'gold' | 'ghost' {
  switch (type) {
    case 'ROLL_MOVE_DICE': return 'gold'
    case 'BASIC_ATTACK': return 'danger'
    case 'USE_SKILL': return 'primary'
    case 'END_TURN': return 'secondary'
    case 'END_MOVE_PHASE': return 'secondary'
    default: return 'primary'
  }
}

export default function ActionPanel({ validActions }: ActionPanelProps) {
  const { executeAction, setInteraction, interactionMode, clearInteraction, isLoading } = useGameStore()

  const categories = categorizeActions(validActions)

  const handleAction = (va: ValidAction) => {
    const t = va.action.type

    // Actions that need tile selection on the board
    if (t === 'MOVE') {
      // BFS: 이동력으로 도달 가능한 모든 타일 계산
      const { gameState, currentPlayer } = useGameStore.getState()
      const cp = currentPlayer()
      if (cp && gameState && cp.remainingMovement !== null) {
        const otherPlayerPositions = gameState.players
          .filter(p => p.id !== cp.id && !p.isDead)
          .map(p => p.position)
        const reachable = getReachableTiles(
          cp.position,
          cp.remainingMovement,
          gameState.board,
          cp.state === 'corrupt',
          cp.hasDemonSword,
          otherPlayerPositions,
        )
        setInteraction('move', reachable)
      }
      return
    }

    if (t === 'BASIC_ATTACK') {
      // Toggle attack mode
      if (interactionMode === 'attack') {
        clearInteraction()
      } else {
        // 공격 가능한 대상 위치를 하이라이트
        const { gameState } = useGameStore.getState()
        const attackTargetTiles = validActions
          .filter(a => a.action.type === 'BASIC_ATTACK')
          .map(a => {
            const targetId = (a.action as { targetId: string }).targetId
            const player = gameState?.players.find(p => p.id === targetId)
            if (player) return player.position
            const monster = gameState?.monsters.find(m => m.id === targetId)
            if (monster) return monster.position
            return null
          })
          .filter((p): p is HexCoord => p !== null)
        setInteraction('attack', attackTargetTiles)
      }
      return
    }

    if (t === 'CHOOSE_ESCAPE_TILE') {
      const escapeTiles = validActions
        .filter(a => a.action.type === 'CHOOSE_ESCAPE_TILE')
        .map(a => (a.action as { type: 'CHOOSE_ESCAPE_TILE'; position: HexCoord }).position)
      setInteraction('escape_tile', escapeTiles)
      return
    }

    // Direct execute
    executeAction(va.action)
  }

  // Don't show individual MOVE actions as buttons, show a single "Move" button
  const renderCategory = (label: string, actions: ValidAction[]) => {
    if (actions.length === 0) return null

    // Collapse MOVE actions into one button
    if (label === 'movement') {
      const moveActions = actions.filter(a => a.action.type === 'MOVE')
      const nonMoveActions = actions.filter(a => a.action.type !== 'MOVE')
      const escapeActions = actions.filter(a => a.action.type === 'CHOOSE_ESCAPE_TILE')

      return (
        <div className="flex flex-wrap gap-1.5">
          {/* Show escape tiles as a single button */}
          {escapeActions.length > 0 && (
            <RetroButton
              variant="gold"
              size="sm"
              onClick={() => handleAction(escapeActions[0])}
              disabled={isLoading}
              className={clsx(interactionMode === 'escape_tile' && 'ring-2 ring-rogue')}
            >
              탈출 위치 선택 ({escapeActions.length})
            </RetroButton>
          )}
          {/* Show "Move" button if there are valid tiles */}
          {moveActions.length > 0 && (
            <RetroButton
              variant="gold"
              size="sm"
              onClick={() => handleAction(moveActions[0])}
              disabled={isLoading}
              className={clsx(interactionMode === 'move' && 'ring-2 ring-gold')}
            >
              이동 ({moveActions.length})
            </RetroButton>
          )}
          {nonMoveActions.filter(a => a.action.type !== 'CHOOSE_ESCAPE_TILE').map((va, i) => (
            <RetroButton
              key={i}
              variant={getActionVariant(va.action.type)}
              size="sm"
              onClick={() => handleAction(va)}
              disabled={isLoading}
            >
              {va.description}
            </RetroButton>
          ))}
        </div>
      )
    }

    // Collapse BASIC_ATTACK into one button
    if (label === 'combat') {
      return (
        <div className="flex flex-wrap gap-1.5">
          <RetroButton
            variant="danger"
            size="sm"
            onClick={() => handleAction(actions[0])}
            disabled={isLoading}
            className={clsx(interactionMode === 'attack' && 'ring-2 ring-warrior')}
          >
            기본 공격 ({actions.length})
          </RetroButton>
        </div>
      )
    }

    return (
      <div className="flex flex-wrap gap-1.5">
        {actions.map((va, i) => (
          <RetroButton
            key={i}
            variant={getActionVariant(va.action.type)}
            size="sm"
            onClick={() => handleAction(va)}
            disabled={isLoading}
          >
            {va.description}
          </RetroButton>
        ))}
      </div>
    )
  }

  if (validActions.length === 0) {
    return (
      <div className="bg-parchment-texture border-wood-frame rounded-lg p-3 text-center text-ink-faded text-sm">
        사용 가능한 행동이 없습니다
      </div>
    )
  }

  return (
    <div className="bg-parchment-texture border-wood-frame rounded-lg p-3 space-y-2">
      <h3 className="font-serif font-bold text-wood-dark text-sm">행동</h3>
      <div className="space-y-1.5">
        {renderCategory('movement', [...categories.movement])}
        {renderCategory('combat', categories.combat)}
        {renderCategory('special', categories.special)}
        {renderCategory('other', categories.other)}
      </div>
      {interactionMode !== 'none' && (
        <div className="flex items-center gap-2 pt-1 border-t border-wood/20">
          <span className="text-xs text-ink-faded flex-1">
            {interactionMode === 'move' && '보드에서 이동할 타일을 클릭하세요'}
            {interactionMode === 'attack' && '공격할 대상을 클릭하세요'}
            {interactionMode === 'skill_target' && '스킬 대상을 클릭하세요'}
            {interactionMode === 'skill_position' && '스킬 위치를 클릭하세요'}
            {interactionMode === 'escape_tile' && '탈출할 위치를 클릭하세요'}
          </span>
          <RetroButton variant="ghost" size="sm" onClick={clearInteraction}>
            취소
          </RetroButton>
        </div>
      )}
    </div>
  )
}
