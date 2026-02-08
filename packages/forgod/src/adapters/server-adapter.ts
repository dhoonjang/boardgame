import type { GameState, GameAction, GameEvent, ValidAction } from '@forgod/core'
import type { GameAdapter, CreateGameParams, ActionResult } from './types'

const API_BASE = import.meta.env.VITE_API_URL || 'http://localhost:3001'

async function request<T>(endpoint: string, options?: RequestInit): Promise<T> {
  const res = await fetch(`${API_BASE}${endpoint}`, {
    ...options,
    headers: { 'Content-Type': 'application/json', ...options?.headers },
  })
  if (!res.ok) {
    const err = await res.json().catch(() => ({ error: res.statusText }))
    throw new Error(err.error || `HTTP ${res.status}`)
  }
  return res.json() as Promise<T>
}

export const serverAdapter: GameAdapter = {
  async createGame(params: CreateGameParams) {
    const data = await request<{ gameId: string; gameState: GameState }>('/api/games', {
      method: 'POST',
      body: JSON.stringify({ players: params.players }),
    })
    return { gameId: data.gameId, state: data.gameState }
  },

  async getGameState(gameId: string) {
    const data = await request<{ gameState: GameState }>(`/api/games/${gameId}`)
    return data.gameState
  },

  async getValidActions(gameId: string, _playerId?: string) {
    const data = await request<{ validActions: ValidAction[] }>(
      `/api/games/${gameId}/valid-actions`
    )
    return data.validActions
  },

  async executeAction(gameId: string, action: GameAction, _playerId?: string): Promise<ActionResult> {
    const data = await request<{
      success: boolean
      gameState: GameState
      message: string
      events: GameEvent[]
    }>(`/api/games/${gameId}/actions`, {
      method: 'POST',
      body: JSON.stringify(action),
    })
    return {
      success: data.success,
      newState: data.gameState,
      message: data.message,
      events: data.events,
    }
  },
}
