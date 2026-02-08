import { create } from 'zustand'
import type { GameState, GameAction, GameEvent, ValidAction, HeroClass, HexCoord } from '@forgod/core'
import { createAdapter, type AdapterMode, type GameAdapter } from '../adapters'

export type InteractionMode =
  | 'none'
  | 'move'           // Tile click = MOVE
  | 'attack'         // Token click = BASIC_ATTACK
  | 'skill_target'   // Token click = USE_SKILL with targetId
  | 'skill_position' // Tile click = USE_SKILL with position
  | 'escape_tile'    // Tile click = CHOOSE_ESCAPE_TILE

export interface UIGameEvent {
  id: number
  event: GameEvent
  timestamp: number
}

interface GameStore {
  // Adapter
  adapter: GameAdapter
  adapterMode: AdapterMode
  setAdapterMode: (mode: AdapterMode) => void

  // Core state
  gameId: string | null
  gameState: GameState | null
  validActions: ValidAction[]
  isLoading: boolean
  error: string | null

  // Interaction state
  interactionMode: InteractionMode
  highlightedTiles: HexCoord[]
  selectedSkillId: string | null
  pendingActionPlayerId: string | null

  // Event log
  eventLog: UIGameEvent[]
  eventCounter: number

  // Derived helpers
  currentPlayerId: () => string | null
  currentPlayer: () => GameState['players'][0] | null
  isMonsterTurn: () => boolean

  // Actions
  createGame: (players: Array<{ id: string; name: string; heroClass: HeroClass }>) => Promise<string>
  loadGame: (gameId: string) => Promise<void>
  executeAction: (action: GameAction) => Promise<void>
  executeMovePath: (path: HexCoord[]) => Promise<void>
  refreshState: () => Promise<void>
  resetGame: () => void

  // Interaction
  setInteraction: (mode: InteractionMode, tiles?: HexCoord[], skillId?: string | null) => void
  clearInteraction: () => void

  // Event log
  pushEvents: (events: GameEvent[]) => void
  clearEventLog: () => void
}

export const useGameStore = create<GameStore>((set, get) => ({
  adapter: createAdapter('local'),
  adapterMode: 'local',
  setAdapterMode: (mode) => set({ adapter: createAdapter(mode), adapterMode: mode }),

  gameId: null,
  gameState: null,
  validActions: [],
  isLoading: false,
  error: null,

  interactionMode: 'none',
  highlightedTiles: [],
  selectedSkillId: null,
  pendingActionPlayerId: null,

  eventLog: [],
  eventCounter: 0,

  // Derived
  currentPlayerId: () => {
    const { gameState } = get()
    if (!gameState) return null
    const entry = gameState.roundTurnOrder[gameState.currentTurnIndex]
    return entry === 'monster' ? null : entry
  },

  currentPlayer: () => {
    const { gameState } = get()
    const pid = get().currentPlayerId()
    if (!gameState || !pid) return null
    return gameState.players.find(p => p.id === pid) ?? null
  },

  isMonsterTurn: () => {
    const { gameState } = get()
    if (!gameState) return false
    return gameState.roundTurnOrder[gameState.currentTurnIndex] === 'monster'
  },

  createGame: async (players) => {
    set({ isLoading: true, error: null })
    try {
      const { gameId, state } = await get().adapter.createGame({ players })
      const validActions = await get().adapter.getValidActions(gameId)
      set({
        gameId,
        gameState: state,
        validActions,
        isLoading: false,
        eventLog: [],
        eventCounter: 0,
      })
      return gameId
    } catch (e) {
      set({ error: (e as Error).message, isLoading: false })
      throw e
    }
  },

  loadGame: async (gameId) => {
    set({ isLoading: true, error: null })
    try {
      const [state, validActions] = await Promise.all([
        get().adapter.getGameState(gameId),
        get().adapter.getValidActions(gameId),
      ])
      set({ gameId, gameState: state, validActions, isLoading: false })
    } catch (e) {
      set({ error: (e as Error).message, isLoading: false })
    }
  },

  executeAction: async (action) => {
    const { gameId, adapter } = get()
    if (!gameId) return
    set({ isLoading: true, error: null })
    try {
      const result = await adapter.executeAction(gameId, action)
      if (!result.success) {
        set({ error: result.message, isLoading: false })
        return
      }
      get().pushEvents(result.events)
      const validActions = await adapter.getValidActions(gameId)
      set({
        gameState: result.newState,
        validActions,
        isLoading: false,
        interactionMode: 'none',
        highlightedTiles: [],
        selectedSkillId: null,
      })
    } catch (e) {
      set({ error: (e as Error).message, isLoading: false })
    }
  },

  executeMovePath: async (path) => {
    const { gameId, adapter } = get()
    if (!gameId || path.length === 0) return
    set({ isLoading: true, error: null, interactionMode: 'none', highlightedTiles: [], selectedSkillId: null })
    try {
      const allEvents: GameEvent[] = []
      let lastState: GameState | null = null
      for (const step of path) {
        const result = await adapter.executeAction(gameId, { type: 'MOVE', position: step })
        if (!result.success) break
        allEvents.push(...result.events)
        lastState = result.newState
        // 플레이어가 죽었으면 이동 중단
        const pid = get().currentPlayerId()
        if (lastState && pid) {
          const p = lastState.players.find(pl => pl.id === pid)
          if (p?.isDead) break
        }
      }
      if (allEvents.length > 0) get().pushEvents(allEvents)
      if (lastState) {
        const validActions = await adapter.getValidActions(gameId)
        set({ gameState: lastState, validActions, isLoading: false })
      } else {
        set({ isLoading: false })
      }
    } catch (e) {
      set({ error: (e as Error).message, isLoading: false })
    }
  },

  refreshState: async () => {
    const { gameId, adapter } = get()
    if (!gameId) return
    try {
      const [state, validActions] = await Promise.all([
        adapter.getGameState(gameId),
        adapter.getValidActions(gameId),
      ])
      set({ gameState: state, validActions })
    } catch (e) {
      set({ error: (e as Error).message })
    }
  },

  resetGame: () => set({
    gameId: null,
    gameState: null,
    validActions: [],
    isLoading: false,
    error: null,
    interactionMode: 'none',
    highlightedTiles: [],
    selectedSkillId: null,
    eventLog: [],
    eventCounter: 0,
  }),

  setInteraction: (mode, tiles = [], skillId = null) => set({
    interactionMode: mode,
    highlightedTiles: tiles,
    selectedSkillId: skillId,
  }),

  clearInteraction: () => set({
    interactionMode: 'none',
    highlightedTiles: [],
    selectedSkillId: null,
  }),

  pushEvents: (events) => {
    const { eventLog, eventCounter } = get()
    const now = Date.now()
    const newEntries = events.map((event, i) => ({
      id: eventCounter + i + 1,
      event,
      timestamp: now,
    }))
    set({
      eventLog: [...eventLog, ...newEntries].slice(-100),
      eventCounter: eventCounter + events.length,
    })
  },

  clearEventLog: () => set({ eventLog: [], eventCounter: 0 }),
}))
