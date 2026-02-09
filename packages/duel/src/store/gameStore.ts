import { create } from 'zustand'
import type { PlayerView, ValidAction, GameAction, GameEvent, AIExpression } from '@duel/server/game'
import socket from '../socket/client'

export interface ChatMessage {
  sender: 'player' | 'ai'
  message: string
  expression?: AIExpression
}

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

  // AI 상태
  isAIGame: boolean
  aiExpression: AIExpression | null
  aiChatMessage: string | null
  chatMessages: ChatMessage[]

  // UI 상태
  error: string | null
  opponentName: string | null

  // 액션
  connect(): void
  disconnect(): void
  createGame(playerName: string): void
  createAIGame(playerName: string, personalityName?: string): void
  joinGame(gameId: string, playerName: string): void
  sendAction(action: GameAction): void
  sendChat(message: string): void
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
  isAIGame: false,
  aiExpression: null,
  aiChatMessage: null,
  chatMessages: [],
  error: null,
  opponentName: null,

  connect() {
    if (socket.connected) return

    // 중복 리스너 방지: 기존 리스너 제거 후 재등록
    socket.off('connect')
    socket.off('disconnect')
    socket.off('game-created')
    socket.off('game-state')
    socket.off('valid-actions')
    socket.off('action-result')
    socket.off('opponent-joined')
    socket.off('opponent-left')
    socket.off('ai-state')
    socket.off('error')

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

    socket.on('ai-state', ({ expression, message }) => {
      set(state => {
        const updates: Partial<DuelStore> = {
          aiExpression: expression,
          aiChatMessage: message,
        }
        if (message) {
          updates.chatMessages = [
            ...state.chatMessages,
            { sender: 'ai' as const, message, expression },
          ]
        }
        return updates
      })
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
    socket.off('ai-state')
    socket.off('error')
    socket.disconnect()
    set({ isConnected: false })
  },

  createGame(playerName: string) {
    const playerId = generatePlayerId()
    set({ playerId, playerName, error: null, isAIGame: false })
    socket.emit('create-game', { player: { id: playerId, name: playerName } })
  },

  createAIGame(playerName: string, personalityName?: string) {
    const playerId = generatePlayerId()
    set({ playerId, playerName, error: null, isAIGame: true, chatMessages: [] })
    socket.emit('create-ai-game', { player: { id: playerId, name: playerName }, personalityName })
  },

  joinGame(gameId: string, playerName: string) {
    const playerId = generatePlayerId()
    set({ playerId, playerName, gameId, error: null, isAIGame: false })
    socket.emit('join-game', { gameId, player: { id: playerId, name: playerName } })
  },

  sendAction(action: GameAction) {
    set({ error: null })
    socket.emit('game-action', { action })
  },

  sendChat(message: string) {
    set(state => ({
      chatMessages: [
        ...state.chatMessages,
        { sender: 'player' as const, message },
      ],
    }))
    socket.emit('player-chat', { message })
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
      isAIGame: false,
      aiExpression: null,
      aiChatMessage: null,
      chatMessages: [],
      error: null,
      opponentName: null,
    })
  },
}))
