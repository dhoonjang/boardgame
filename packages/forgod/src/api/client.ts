import type { GameAction, HeroClass, HexCoord, TileType, Stats } from '@forgod/core'

// 계시 관련 타입 (core 빌드 전 임시 정의)
export type RevelationSource = 'angel' | 'demon'

export interface RevelationReward {
  devilScore?: number
  faithScore?: number
  corruptScore?: number
  extraRevelations?: number
}

const API_BASE = import.meta.env.VITE_API_URL || 'http://localhost:3001'

// ===== Types =====

export interface CreateGameRequest {
  players: Array<{
    id: string
    name: string
    heroClass: HeroClass
  }>
}

export interface CreateGameResponse {
  success: boolean
  gameId?: string
  message?: string
  error?: string
  initialState?: {
    currentPlayer: string
    roundPhase: string
    roundNumber: number
    playerCount: number
  }
}

export interface GameListResponse {
  success: boolean
  games: Array<{
    gameId: string
    playerCount: number
    currentRound: number
    roundPhase: string
    createdAt: string
    lastActionAt: string
  }>
  error?: string
}

export interface PlayerRevelation {
  id: string
  name: string
  source: RevelationSource
  task: string
  reward: RevelationReward
  isVictory: boolean
}

export interface MyPlayerInfo {
  id: string
  name: string
  heroClass: HeroClass
  state: 'holy' | 'corrupt'
  health: number
  maxHealth: number
  position: HexCoord
  stats: Stats
  corruptDice: number | null
  corruptDiceTarget: keyof Stats | null
  revelations: PlayerRevelation[]
  monsterEssence: number
  isDead: boolean
  deathTurnsRemaining: number
  skillCooldowns: Record<string, number>
  isMyTurn: boolean
}

export interface PublicPlayerInfo {
  id: string
  name: string
  heroClass: HeroClass
  state: 'holy' | 'corrupt'
  health: number
  maxHealth: number
  position: HexCoord
  isDead: boolean
  monsterEssence: number
  isCurrentTurn: boolean
}

export interface GameStateResponse {
  success: boolean
  gameState?: {
    gameId: string
    roundNumber: number
    roundPhase: string
    currentTurnPlayer: {
      id: string
      name: string
    }
    myPlayer: MyPlayerInfo | null
    players: PublicPlayerInfo[]
    monsters: Array<{
      id: string
      name: string
      position: HexCoord
      health: number
      maxHealth: number
      isDead: boolean
    }>
    board: Array<{
      coord: HexCoord
      type: TileType
      monsterId?: string
      villageClass?: HeroClass
    }>
    monsterDice: number[]
  }
  error?: string
}

export interface ValidActionsResponse {
  success: boolean
  playerId?: string
  isMyTurn?: boolean
  turnPhase?: string
  roundPhase?: string
  currentTurnPlayerId?: string
  currentTurnPlayerName?: string
  validActions?: Array<{
    index: number
    action: GameAction
    description: string
  }>
  error?: string
}

export interface ExecuteActionRequest {
  action: GameAction
}

export interface ExecuteActionResponse {
  success: boolean
  message?: string
  events?: Array<unknown>
  newState?: {
    currentPlayerId: string
    currentPlayerName: string
    roundPhase: string
    roundNumber: number
  }
  error?: string
}

export interface GameRulesResponse {
  success: boolean
  rules: string
}

// ===== API Client =====

async function request<T>(
  endpoint: string,
  options?: RequestInit
): Promise<T> {
  const response = await fetch(`${API_BASE}${endpoint}`, {
    ...options,
    headers: {
      'Content-Type': 'application/json',
      ...options?.headers,
    },
  })

  const data = await response.json()
  return data as T
}

export const api = {
  // 게임 생성
  createGame: (data: CreateGameRequest) =>
    request<CreateGameResponse>('/api/games', {
      method: 'POST',
      body: JSON.stringify(data),
    }),

  // 게임 목록 조회
  listGames: () =>
    request<GameListResponse>('/api/games'),

  // 게임 상태 조회 (playerId를 전달하면 해당 플레이어 시점으로 조회)
  getGameState: (gameId: string, playerId?: string) => {
    const url = playerId
      ? `/api/games/${gameId}?playerId=${encodeURIComponent(playerId)}`
      : `/api/games/${gameId}`
    return request<GameStateResponse>(url)
  },

  // 게임 삭제
  deleteGame: (gameId: string) =>
    request<{ success: boolean; message?: string; error?: string }>(
      `/api/games/${gameId}`,
      { method: 'DELETE' }
    ),

  // 가능한 액션 조회
  getValidActions: (gameId: string, playerId?: string) => {
    const url = playerId
      ? `/api/games/${gameId}/valid-actions?playerId=${encodeURIComponent(playerId)}`
      : `/api/games/${gameId}/valid-actions`
    return request<ValidActionsResponse>(url)
  },

  // 액션 실행
  executeAction: (gameId: string, action: GameAction, playerId?: string) => {
    const url = playerId
      ? `/api/games/${gameId}/actions?playerId=${encodeURIComponent(playerId)}`
      : `/api/games/${gameId}/actions`
    return request<ExecuteActionResponse>(url, {
      method: 'POST',
      body: JSON.stringify(action),
    })
  },

  // 게임 규칙 조회
  getGameRules: () =>
    request<GameRulesResponse>('/api/rules'),
}

export default api
