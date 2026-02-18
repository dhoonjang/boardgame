import { create } from 'zustand'
import type { PlayerView, ValidAction, GameAction, GameEvent, AIExpression, RoundResult } from '@indian-poker/server/game'
import socket from '../socket/client'

export interface ChatMessage {
  sender: 'player' | 'ai' | 'opponent'
  message: string
  expression?: AIExpression
}

interface GameStore {
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
  aiCharacterId: string | null
  aiExpression: AIExpression | null
  aiChatMessage: string | null
  chatMessages: ChatMessage[]

  // 서버 이벤트 기반 모달 제어
  pendingRoundResult: RoundResult | null
  pendingGameOver: boolean

  // UI 상태
  error: string | null
  opponentName: string | null

  // 액션
  connect(): void
  disconnect(): void
  createGame(playerName: string): void
  createAIGame(playerName: string, characterId?: string): void
  joinGame(gameId: string, playerName: string): void
  sendAction(action: GameAction): void
  sendChat(message: string): void
  setError(error: string | null): void
  reset(): void
}

function generatePlayerId(): string {
  return 'player-' + Math.random().toString(36).substring(2, 8)
}

export const useGameStore = create<GameStore>((set, get) => ({
  isConnected: false,
  gameId: null,
  playerId: null,
  playerName: null,
  playerView: null,
  validActions: [],
  lastEvents: [],
  isAIGame: false,
  aiCharacterId: null,
  aiExpression: null,
  aiChatMessage: null,
  chatMessages: [],
  pendingRoundResult: null,
  pendingGameOver: false,
  error: null,
  opponentName: null,

  connect() {
    if (socket.connected) return

    socket.off('connect')
    socket.off('disconnect')
    socket.off('game-created')
    socket.off('game-state')
    socket.off('valid-actions')
    socket.off('action-result')
    socket.off('opponent-joined')
    socket.off('opponent-left')
    socket.off('ai-state')
    socket.off('player-message')
    socket.off('show-round-result')
    socket.off('show-game-over')
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

    socket.on('opponent-joined', ({ opponentName, characterId }) => {
      set({ opponentName, aiCharacterId: characterId ?? null })
    })

    socket.on('opponent-left', () => {
      set({ opponentName: null, error: '상대방이 나갔습니다.' })
    })

    socket.on('ai-state', ({ expression, message }) => {
      set(state => {
        const updates: Partial<GameStore> = {
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

    socket.on('player-message', ({ senderName, message }) => {
      set(state => ({
        chatMessages: [
          ...state.chatMessages,
          { sender: 'opponent' as const, message: `${senderName}: ${message}` },
        ],
      }))
    })

    socket.on('show-round-result', ({ roundResult }) => {
      set({ pendingRoundResult: roundResult })
    })

    socket.on('show-game-over', () => {
      set({ pendingGameOver: true })
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
    socket.off('player-message')
    socket.off('show-round-result')
    socket.off('show-game-over')
    socket.off('error')
    socket.disconnect()
    set({ isConnected: false })
  },

  createGame(playerName: string) {
    const playerId = generatePlayerId()
    set({ playerId, playerName, error: null, isAIGame: false })
    socket.emit('create-game', { player: { id: playerId, name: playerName } })
  },

  createAIGame(playerName: string, characterId?: string) {
    const playerId = generatePlayerId()
    set({ playerId, playerName, error: null, isAIGame: true, chatMessages: [] })
    socket.emit('create-ai-game', { player: { id: playerId, name: playerName }, characterId })
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
      aiCharacterId: null,
      aiExpression: null,
      aiChatMessage: null,
      chatMessages: [],
      pendingRoundResult: null,
      pendingGameOver: false,
      error: null,
      opponentName: null,
    })
  },
}))
