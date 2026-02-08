import { GameEngine } from '@forgod/core'
import type { GameState, GameAction } from '@forgod/core'
import type { GameAdapter, CreateGameParams, ActionResult } from './types'

const engine = new GameEngine()
const games = new Map<string, GameState>()

export const localAdapter: GameAdapter = {
  async createGame(params: CreateGameParams) {
    const state = engine.createGame({ players: params.players })
    games.set(state.id, state)
    return { gameId: state.id, state }
  },

  async getGameState(gameId: string) {
    const state = games.get(gameId)
    if (!state) throw new Error('Game not found')
    return state
  },

  async getValidActions(gameId: string, playerId?: string) {
    const state = games.get(gameId)
    if (!state) throw new Error('Game not found')
    return engine.getValidActions(state, playerId)
  },

  async executeAction(gameId: string, action: GameAction, playerId?: string): Promise<ActionResult> {
    const state = games.get(gameId)
    if (!state) throw new Error('Game not found')
    const result = engine.executeAction(state, action, playerId)
    if (result.success) {
      games.set(gameId, result.newState)
    }
    return result
  },
}
