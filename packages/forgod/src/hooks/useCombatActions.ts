import { useCallback } from 'react'
import type { ValidAction, HexCoord } from '@forgod/core'
import { useGameStore } from '../store/gameStore'

export function useCombatActions(validActions: ValidAction[]) {
  const { executeAction, setInteraction, clearInteraction, interactionMode, selectedSkillId } = useGameStore()

  const startMove = useCallback(() => {
    const moveTiles = validActions
      .filter(va => va.action.type === 'MOVE')
      .map(va => (va.action as { type: 'MOVE'; position: HexCoord }).position)
    if (moveTiles.length > 0) {
      setInteraction('move', moveTiles)
    }
  }, [validActions, setInteraction])

  const startAttack = useCallback(() => {
    if (interactionMode === 'attack') {
      clearInteraction()
    } else {
      setInteraction('attack')
    }
  }, [interactionMode, setInteraction, clearInteraction])

  const startSkill = useCallback((skillId: string) => {
    const skillActions = validActions.filter(
      va => va.action.type === 'USE_SKILL' && (va.action as { skillId: string }).skillId === skillId
    )
    if (skillActions.length === 0) return

    if (selectedSkillId === skillId) {
      clearInteraction()
      return
    }

    const first = skillActions[0].action as { type: 'USE_SKILL'; skillId: string; targetId?: string; position?: HexCoord }
    if (first.targetId !== undefined) {
      setInteraction('skill_target', [], skillId)
    } else if (first.position !== undefined) {
      const positions = skillActions
        .map(a => (a.action as { position?: HexCoord }).position)
        .filter((p): p is HexCoord => !!p)
      setInteraction('skill_position', positions, skillId)
    } else {
      executeAction(skillActions[0].action)
    }
  }, [validActions, selectedSkillId, setInteraction, clearInteraction, executeAction])

  const startEscape = useCallback(() => {
    const escapeTiles = validActions
      .filter(va => va.action.type === 'CHOOSE_ESCAPE_TILE')
      .map(va => (va.action as { type: 'CHOOSE_ESCAPE_TILE'; position: HexCoord }).position)
    if (escapeTiles.length > 0) {
      setInteraction('escape_tile', escapeTiles)
    }
  }, [validActions, setInteraction])

  const hasAction = useCallback((type: string) => {
    return validActions.some(va => va.action.type === type)
  }, [validActions])

  const getDirectAction = useCallback((type: string) => {
    return validActions.find(va => va.action.type === type)
  }, [validActions])

  return {
    startMove,
    startAttack,
    startSkill,
    startEscape,
    hasAction,
    getDirectAction,
  }
}
