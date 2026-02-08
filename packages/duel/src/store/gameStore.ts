import { create } from 'zustand'
import type { PlayerView, ValidAction, GameAction, GameEvent } from '@duel/core'
import socket from '../socket/client'

interface DuelStore {
  // 연결 상태
  isConnected: boolean

  // 게임 식별
  gameId: string | null
  playerId: string | null
  playerName: string | null

  // 게임 데이터
  playerView: PlayerView | null
  validActions: ValidAction[]
  lastEvents: GameEvent[]

  // UI 상태
  error: string | null
  opponentName: string | null

  // 액션
  connect(): void
  disconnect(): void
  createGame(playerName: string): void
  joinGame(gameId: string, playerName: string): void
  sendAction(action: GameAction): void
  setError(error: string | null): void
  reset(): void
}

function generatePlayerId(): string {
  return 'player-' + Math.random().toString(36).substring(2, 8)
}

export const useGameStore = create<DuelStore>((set, get) => ({
  isConnected: false,
  gameId: null,
  playerId: null,
  playerName: null,
  playerView: null,
  validActions: [],
  lastEvents: [],
  error: null,
  opponentName: null,

  connect() {
    if (socket.connected) return

    socket.connect()

    socket.on('connect', () => {
      set({ isConnected: true, error: null })
    })

    socket.on('disconnect', () => {
      set({ isConnected: false })
    })

    socket.on('game-created', ({ gameId }) => {
      set({ gameId })
    })

    socket.on('game-state', ({ playerView }) => {
      set({ playerView })
    })

    socket.on('valid-actions', ({ actions }) => {
      set({ validActions: actions })
    })

    socket.on('action-result', ({ success, message, events }) => {
      if (!success) {
        set({ error: message })
      }
      set({ lastEvents: events })
    })

    socket.on('opponent-joined', ({ opponentName }) => {
      set({ opponentName })
    })

    socket.on('opponent-left', () => {
      set({ opponentName: null, error: '상대방이 나갔습니다.' })
    })

    socket.on('error', ({ message }) => {
      set({ error: message })
    })
  },

  disconnect() {
    socket.off('connect')
    socket.off('disconnect')
    socket.off('game-created')
    socket.off('game-state')
    socket.off('valid-actions')
    socket.off('action-result')
    socket.off('opponent-joined')
    socket.off('opponent-left')
    socket.off('error')
    socket.disconnect()
    set({ isConnected: false })
  },

  createGame(playerName: string) {
    const playerId = generatePlayerId()
    set({ playerId, playerName, error: null })
    socket.emit('create-game', { player: { id: playerId, name: playerName } })
  },

  joinGame(gameId: string, playerName: string) {
    const playerId = generatePlayerId()
    set({ playerId, playerName, gameId, error: null })
    socket.emit('join-game', { gameId, player: { id: playerId, name: playerName } })
  },

  sendAction(action: GameAction) {
    set({ error: null })
    socket.emit('game-action', { action })
  },

  setError(error: string | null) {
    set({ error })
  },

  reset() {
    const store = get()
    store.disconnect()
    set({
      gameId: null,
      playerId: null,
      playerName: null,
      playerView: null,
      validActions: [],
      lastEvents: [],
      error: null,
      opponentName: null,
    })
  },
}))
