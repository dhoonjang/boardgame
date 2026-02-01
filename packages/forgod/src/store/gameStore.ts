import type { GameAction, HeroClass, HexCoord, TileType } from '@forgod/core'
import { create } from 'zustand'
import api, { ValidActionsResponse } from '../api/client'

interface PlayerState {
  id: string
  name: string
  heroClass: HeroClass
  state: 'holy' | 'corrupt'
  health: number
  maxHealth: number
  position: HexCoord
  isDead: boolean
}

interface MonsterState {
  id: string
  name: string
  position: HexCoord
  health: number
  maxHealth: number
  isDead: boolean
}

interface HexTileState {
  coord: HexCoord
  type: TileType
  monsterId?: string
  villageClass?: HeroClass
}

interface GameStore {
  // 상태
  gameId: string | null
  playerId: string | null  // 현재 사용자의 플레이어 ID
  isLoading: boolean
  error: string | null

  // 게임 데이터
  roundNumber: number
  currentPhase: string
  currentPlayerId: string | null
  players: PlayerState[]
  monsters: MonsterState[]
  board: HexTileState[]
  validActions: ValidActionsResponse['validActions']

  // 액션
  createGame: (players: Array<{ id: string; name: string; heroClass: HeroClass }>, myPlayerId: string) => Promise<void>
  loadGame: (gameId: string, playerId: string) => Promise<void>
  refreshGameState: () => Promise<void>
  executeAction: (action: GameAction) => Promise<void>
  resetGame: () => void
}

export const useGameStore = create<GameStore>((set, get) => ({
  // 초기 상태
  gameId: null,
  playerId: null,
  isLoading: false,
  error: null,
  roundNumber: 0,
  currentPhase: '',
  currentPlayerId: null,
  players: [],
  monsters: [],
  board: [],
  validActions: [],

  // 게임 생성
  createGame: async (players, myPlayerId) => {
    set({ isLoading: true, error: null })

    try {
      const result = await api.createGame({ players })

      if (!result.success || !result.gameId) {
        throw new Error(result.error || '게임 생성 실패')
      }

      set({ gameId: result.gameId, playerId: myPlayerId })

      // 게임 상태 로드
      await get().loadGame(result.gameId, myPlayerId)
    } catch (error) {
      const message = error instanceof Error ? error.message : '알 수 없는 오류'
      set({ error: message, isLoading: false })
    }
  },

  // 게임 로드
  loadGame: async (gameId, playerId) => {
    set({ isLoading: true, error: null })

    try {
      const [stateResult, actionsResult] = await Promise.all([
        api.getGameState(gameId, playerId),
        api.getValidActions(gameId, playerId),  // playerId는 선택적 쿼리 파라미터
      ])

      if (!stateResult.success || !stateResult.gameState) {
        throw new Error(stateResult.error || '게임을 찾을 수 없습니다')
      }

      const { gameState } = stateResult

      set({
        gameId,
        playerId,
        roundNumber: gameState.roundNumber,
        currentPhase: gameState.roundPhase,
        currentPlayerId: gameState.currentTurnPlayer.id,
        players: gameState.players,
        monsters: gameState.monsters,
        board: gameState.board,
        validActions: actionsResult.validActions || [],
        isLoading: false,
      })
    } catch (error) {
      const message = error instanceof Error ? error.message : '알 수 없는 오류'
      set({ error: message, isLoading: false })
    }
  },

  // 게임 상태 새로고침
  refreshGameState: async () => {
    const { gameId, playerId } = get()
    if (!gameId || !playerId) return

    await get().loadGame(gameId, playerId)
  },

  // 액션 실행
  executeAction: async (action) => {
    const { gameId, playerId } = get()
    if (!gameId) return

    set({ isLoading: true, error: null })

    try {
      const result = await api.executeAction(gameId, action, playerId || undefined)

      if (!result.success) {
        throw new Error(result.error || '액션 실행 실패')
      }

      // 게임 상태 새로고침
      await get().refreshGameState()
    } catch (error) {
      const message = error instanceof Error ? error.message : '알 수 없는 오류'
      set({ error: message, isLoading: false })
    }
  },

  // 게임 리셋
  resetGame: () => {
    set({
      gameId: null,
      playerId: null,
      isLoading: false,
      error: null,
      roundNumber: 0,
      currentPhase: '',
      currentPlayerId: null,
      players: [],
      monsters: [],
      board: [],
      validActions: [],
    })
  },
}))
