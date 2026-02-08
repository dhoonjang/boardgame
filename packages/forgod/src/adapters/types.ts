import type { GameState, GameAction, GameEvent, ValidAction, HeroClass } from '@forgod/core'

export interface CreateGameParams {
  players: Array<{ id: string; name: string; heroClass: HeroClass }>
}

export interface ActionResult {
  success: boolean
  newState: GameState
  message: string
  events: GameEvent[]
}

export interface GameAdapter {
  createGame(params: CreateGameParams): Promise<{ gameId: string; state: GameState }>
  getGameState(gameId: string): Promise<GameState>
  getValidActions(gameId: string, playerId?: string): Promise<ValidAction[]>
  executeAction(gameId: string, action: GameAction, playerId?: string): Promise<ActionResult>
}
