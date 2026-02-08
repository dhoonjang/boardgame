import { useState, useCallback } from 'react'

interface MonsterTurnState {
  isActive: boolean
  phase: 'rolling' | 'effects' | 'attacks' | 'done'
}

export function useMonsterTurn() {
  const [state, setState] = useState<MonsterTurnState>({
    isActive: false,
    phase: 'done',
  })

  const startMonsterTurn = useCallback(() => {
    setState({ isActive: true, phase: 'rolling' })

    // Auto-progress through phases
    setTimeout(() => setState({ isActive: true, phase: 'effects' }), 800)
    setTimeout(() => setState({ isActive: true, phase: 'attacks' }), 1600)
    setTimeout(() => setState({ isActive: false, phase: 'done' }), 2400)
  }, [])

  const endMonsterTurn = useCallback(() => {
    setState({ isActive: false, phase: 'done' })
  }, [])

  return {
    ...state,
    startMonsterTurn,
    endMonsterTurn,
  }
}
