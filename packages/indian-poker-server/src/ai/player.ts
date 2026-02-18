import type { Server } from 'socket.io'
import type { GameState } from '../game'
import type { AICharacter } from './character'
import type { AIContext, AIGameEvent, AIResponse } from './types'
import { getCharacter, getRandomCharacter } from './characters'
import { AIConversation, fallbackDecision, fallbackReaction, validateDecision, findSafeAction, getInstantCardReaction } from './brain'
import { buildSystemPrompt, buildEventMessage, buildPlayerChatMessage } from './prompt'
import { GameLogger } from './logger'
import type { SessionManager } from '../session'

export const AI_PLAYER_ID = 'ai-player'

export class AIPlayer {
  readonly character: AICharacter
  private gameId: string
  private io: Server
  private humanSocketId: string
  private sessionManager: SessionManager
  private processing = false
  private disposed = false
  private conversation: AIConversation
  private logger: GameLogger
  private pendingChat: string[] = []
  private pendingStateChange: { gameState: GameState; humanAction?: string } | null = null

  constructor(
    gameId: string,
    io: Server,
    humanSocketId: string,
    sessionManager: SessionManager,
    characterId?: string,
  ) {
    this.character = characterId ? (getCharacter(characterId) ?? getRandomCharacter()) : getRandomCharacter()
    this.gameId = gameId
    this.io = io
    this.humanSocketId = humanSocketId
    this.sessionManager = sessionManager
    this.logger = new GameLogger(gameId, this.character.id, this.character.name, this.character.difficulty)
    this.conversation = new AIConversation(buildSystemPrompt(this.character), this.logger)
  }

  get name(): string {
    return this.character.name
  }

  get characterId(): string {
    return this.character.id
  }

  dispose(): void {
    this.disposed = true
    this.pendingStateChange = null
    this.logger.close()
    this.conversation.reset()
  }

  async handlePlayerChat(message: string): Promise<void> {
    if (this.disposed) return

    if (this.processing) {
      this.pendingChat.push(message)
      return
    }

    this.processing = true
    try {
      const userMsg = buildPlayerChatMessage(message)
      const response = await this.conversation.chat(userMsg)

      if (this.disposed) return

      if (response) {
        this.io.to(this.humanSocketId).emit('ai-state', {
          expression: response.expression,
          message: response.message,
        })

        if (response.action) {
          const room = this.sessionManager.getRoom(this.gameId)
          if (room) {
            const engine = this.sessionManager.getEngine()
            const aiActions = engine.getValidActions(room.gameState, AI_PLAYER_ID)
            if (aiActions.length > 0) {
              const original = { action: response.action, expression: response.expression, message: response.message }
              const validated = validateDecision(original, aiActions)
              this.logger.logValidation(original, validated)
              await this.delay(300)
              if (this.disposed) return
              await this.executeAction(room.gameState, validated.action)
            }
          }
        }
      } else {
        const fallback: AIResponse = { expression: 'poker_face', message: '...' }
        this.conversation.addAssistantMessage(fallback, 'player_chat')
        this.io.to(this.humanSocketId).emit('ai-state', {
          expression: fallback.expression,
          message: fallback.message,
        })
      }
    } finally {
      this.processing = false
      await this.processNextPending()
    }
  }

  private async sendEvent(event: AIGameEvent, gameState: GameState, extraData?: Partial<AIContext>): Promise<AIResponse | null> {
    if (this.disposed) return null

    const engine = this.sessionManager.getEngine()
    const view = engine.getPlayerView(gameState, AI_PLAYER_ID)
    const aiActions = event === 'ai_turn' ? engine.getValidActions(gameState, AI_PLAYER_ID) : undefined

    const ctx: AIContext = {
      event,
      phase: gameState.phase,
      opponentCard: view.opponentCard,
      myChips: view.me.chips,
      opponentChips: view.opponent.chips,
      pot: view.pot,
      roundNumber: view.roundNumber,
      maxRounds: view.maxRounds,
      myIndex: view.myIndex,
      myPlayerId: AI_PLAYER_ID,
      difficulty: this.character.difficulty,
      roundHistory: view.roundHistory,
      validActions: aiActions,
      ...extraData,
    }

    const eventMessage = buildEventMessage(ctx)
    const response = await this.conversation.chat(eventMessage)

    if (this.disposed) return null

    if (response) {
      return response
    }

    if (event === 'ai_turn') {
      const fb = fallbackDecision(ctx)
      this.conversation.addAssistantMessage(fb, event)
      return fb
    }

    const fb = fallbackReaction(ctx)
    this.conversation.addAssistantMessage(fb, event)
    return fb
  }

  private buildPendingContext(gameState: GameState, humanAction?: string): string | null {
    const engine = this.sessionManager.getEngine()
    const view = engine.getPlayerView(gameState, AI_PLAYER_ID)

    if (humanAction) {
      if (humanAction === 'START_ROUND') {
        return `[시스템] 새 라운드 시작. 상대 카드: ${view.opponentCard ?? '?'}. 내 칩: ${view.me.chips}, 상대 칩: ${view.opponent.chips}.`
      }
      return `[시스템] 상대가 ${humanAction}을(를) 했어. 팟: ${view.pot}칩.`
    }

    return null
  }

  async onStateChanged(gameState: GameState, humanAction?: string): Promise<void> {
    if (this.disposed) return

    if (this.processing) {
      const ctx = this.buildPendingContext(gameState, humanAction)
      if (ctx) this.conversation.addUserMessage(ctx)
      this.pendingStateChange = { gameState, humanAction }
      return
    }

    const engine = this.sessionManager.getEngine()

    if (gameState.phase === 'game_over') {
      this.processing = true
      try {
        const aiPlayer = gameState.players.find(p => p.id === AI_PLAYER_ID)
        const humanPlayer = gameState.players.find(p => p.id !== AI_PLAYER_ID)
        if (aiPlayer && humanPlayer) {
          const iWon = gameState.winner === AI_PLAYER_ID
          const isDraw = gameState.isDraw
          const response = await this.sendEvent('game_over', gameState, {
            gameResult: {
              iWon,
              isDraw,
              myFinalChips: aiPlayer.chips,
              opponentFinalChips: humanPlayer.chips,
            },
          })
          if (response) {
            this.io.to(this.humanSocketId).emit('ai-state', {
              expression: response.expression,
              message: response.message,
            })
          }
        }
        if (this.disposed) return
        await this.delay(2000)
        if (this.disposed) return
        this.io.to(this.humanSocketId).emit('show-game-over')
      } finally {
        this.processing = false
      }
      return
    }

    const aiActions = engine.getValidActions(gameState, AI_PLAYER_ID)

    // Human이 START_ROUND를 했지만 AI 차례가 아닌 경우: 즉각 반응 + round_start 반응만 수행
    if (humanAction === 'START_ROUND' && gameState.phase === 'betting' && aiActions.length === 0) {
      this.processing = true
      try {
        this.emitInstantCardReaction(gameState)
        const reaction = await this.sendEvent('round_start', gameState)
        if (reaction) {
          this.io.to(this.humanSocketId).emit('ai-state', {
            expression: reaction.expression,
            message: reaction.message,
          })
        }
      } finally {
        this.processing = false
        await this.processNextPending()
      }
      return
    }

    // round_end인데 AI 차례가 아닌 경우: 대사 + show-round-result 전송
    if (gameState.phase === 'round_end' && aiActions.length === 0) {
      this.processing = true
      try {
        await this.reactToRoundEnd(gameState)
      } finally {
        this.processing = false
        await this.processNextPending()
      }
      return
    }

    if (aiActions.length === 0) return

    if (aiActions.some(a => a.type === 'START_ROUND')) {
      this.processing = true
      try {
        if (gameState.phase === 'round_end') {
          await this.reactToRoundEnd(gameState)
          if (this.disposed) return
        }

        await this.delay(500)
        if (this.disposed) return
        await this.executeAction(gameState, { type: 'START_ROUND' })

        if (this.disposed) return
        const room = this.sessionManager.getRoom(this.gameId)
        if (room && room.gameState.phase === 'betting') {
          this.emitInstantCardReaction(room.gameState)
          const response = await this.sendEvent('round_start', room.gameState)
          if (response) {
            this.io.to(this.humanSocketId).emit('ai-state', {
              expression: response.expression,
              message: response.message,
            })
          }
          if (this.disposed) return
          await this.delay(1000)
          if (this.disposed) return
        }
      } finally {
        this.processing = false
      }

      if (!this.disposed) {
        if (this.pendingStateChange) {
          await this.processNextPending()
        } else {
          const latestRoom = this.sessionManager.getRoom(this.gameId)
          if (latestRoom) {
            setTimeout(() => {
              if (this.disposed) return
              const r = this.sessionManager.getRoom(this.gameId)
              if (r) this.onStateChanged(r.gameState)
            }, 100)
          }
        }
      }
      return
    }

    if (gameState.phase !== 'betting') return

    this.processing = true
    try {
      if (humanAction) {
        if (humanAction === 'START_ROUND') {
          this.emitInstantCardReaction(gameState)
          const reaction = await this.sendEvent('round_start', gameState)
          if (reaction) {
            this.io.to(this.humanSocketId).emit('ai-state', {
              expression: reaction.expression,
              message: reaction.message,
            })
          }
        } else {
          const reaction = await this.sendEvent('human_action', gameState, { humanAction })
          if (reaction) {
            this.io.to(this.humanSocketId).emit('ai-state', {
              expression: reaction.expression,
              message: reaction.message,
            })
          }
        }
        if (this.disposed) return
        await this.delay(1000)
        if (this.disposed) return
      }

      this.io.to(this.humanSocketId).emit('ai-state', {
        expression: 'thinking',
        message: null,
      })

      const response = await this.sendEvent('ai_turn', gameState)
      if (this.disposed) return

      if (response) {
        this.io.to(this.humanSocketId).emit('ai-state', {
          expression: response.expression,
          message: response.message,
        })

        await this.delay(300)
        if (this.disposed) return

        // Stale state re-validation: 최신 상태로 재검증
        const currentRoom = this.sessionManager.getRoom(this.gameId)
        if (!currentRoom) return
        const currentActions = engine.getValidActions(currentRoom.gameState, AI_PLAYER_ID)
        if (currentActions.length === 0) return

        const action = response.action ?? findSafeAction(currentActions)
        const original = { action, expression: response.expression, message: response.message }
        const validated = validateDecision(original, currentActions)
        this.logger.logValidation(original, validated)
        await this.executeAction(currentRoom.gameState, validated.action)
      }
    } finally {
      this.processing = false
      await this.processNextPending()
    }
  }

  private async handleCatchUp(): Promise<void> {
    if (this.disposed) return
    const room = this.sessionManager.getRoom(this.gameId)
    if (!room) return

    const currentState = room.gameState
    const engine = this.sessionManager.getEngine()

    this.processing = true
    try {
      // game_over
      if (currentState.phase === 'game_over') {
        const aiPlayer = currentState.players.find(p => p.id === AI_PLAYER_ID)
        const humanPlayer = currentState.players.find(p => p.id !== AI_PLAYER_ID)
        if (aiPlayer && humanPlayer) {
          const iWon = currentState.winner === AI_PLAYER_ID
          const isDraw = currentState.isDraw
          const response = await this.sendEvent('game_over', currentState, {
            gameResult: {
              iWon,
              isDraw,
              myFinalChips: aiPlayer.chips,
              opponentFinalChips: humanPlayer.chips,
            },
          })
          if (response) {
            this.io.to(this.humanSocketId).emit('ai-state', {
              expression: response.expression,
              message: response.message,
            })
          }
        }
        if (this.disposed) return
        await this.delay(2000)
        if (this.disposed) return
        this.io.to(this.humanSocketId).emit('show-game-over')
        return
      }

      // round_end
      if (currentState.phase === 'round_end') {
        await this.reactToRoundEnd(currentState)
        if (this.disposed) return
        const aiActions = engine.getValidActions(currentState, AI_PLAYER_ID)
        if (aiActions.some(a => a.type === 'START_ROUND')) {
          await this.delay(500)
          if (this.disposed) return
          await this.executeAction(currentState, { type: 'START_ROUND' })
        }
        return
      }

      // betting or other
      const aiActions = engine.getValidActions(currentState, AI_PLAYER_ID)
      if (aiActions.length === 0) return

      if (aiActions.some(a => a.type === 'START_ROUND')) {
        await this.executeAction(currentState, { type: 'START_ROUND' })
        return
      }

      if (currentState.phase === 'betting') {
        this.io.to(this.humanSocketId).emit('ai-state', { expression: 'thinking', message: null })
        const response = await this.sendEvent('ai_turn', currentState)
        if (this.disposed) return

        if (response) {
          this.io.to(this.humanSocketId).emit('ai-state', {
            expression: response.expression,
            message: response.message,
          })

          await this.delay(300)
          if (this.disposed) return

          // Re-validate with latest state
          const latestRoom = this.sessionManager.getRoom(this.gameId)
          if (!latestRoom) return
          const latestActions = engine.getValidActions(latestRoom.gameState, AI_PLAYER_ID)
          if (latestActions.length === 0) return

          const action = response.action ?? findSafeAction(latestActions)
          const original = { action, expression: response.expression, message: response.message }
          const validated = validateDecision(original, latestActions)
          this.logger.logValidation(original, validated)
          await this.executeAction(latestRoom.gameState, validated.action)
        }
      }
    } finally {
      this.processing = false
      await this.processNextPending()
    }
  }

  private async processNextPending(): Promise<void> {
    // Priority 1: 상태 변경 (게임 진행 > 채팅)
    if (this.pendingStateChange && !this.disposed) {
      this.pendingStateChange = null
      await this.handleCatchUp()
      return
    }
    // Priority 2: 대기 중인 채팅
    if (this.pendingChat.length > 0 && !this.disposed) {
      const msg = this.pendingChat.shift()!
      await this.handlePlayerChat(msg)
    }
  }

  async reactToEvent(event: AIGameEvent, gameState: GameState, extraData?: Partial<AIContext>): Promise<void> {
    if (this.disposed) return

    const response = await this.sendEvent(event, gameState, extraData)
    if (this.disposed) return

    if (response) {
      this.io.to(this.humanSocketId).emit('ai-state', {
        expression: response.expression,
        message: response.message,
      })
    }
  }

  private async executeAction(currentState: GameState, action: any): Promise<void> {
    const room = this.sessionManager.getRoom(this.gameId)
    if (!room) return

    const engine = this.sessionManager.getEngine()
    const result = engine.executeAction(room.gameState, action, AI_PLAYER_ID)

    if (!result.success) {
      console.warn(`[AI Player] 액션 실패: ${result.message}`)
      return
    }

    this.sessionManager.updateGame(this.gameId, result.newState)

    const humanView = engine.getPlayerView(result.newState, this.getHumanPlayerId(result.newState))
    this.io.to(this.humanSocketId).emit('game-state', { playerView: humanView })
    this.io.to(this.humanSocketId).emit('valid-actions', {
      actions: engine.getValidActions(result.newState, this.getHumanPlayerId(result.newState)),
    })

    if (!this.disposed) {
      setTimeout(() => {
        if (this.disposed) return
        const latestRoom = this.sessionManager.getRoom(this.gameId)
        if (latestRoom) this.onStateChanged(latestRoom.gameState)
      }, 100)
    }
  }

  private getHumanPlayerId(state: GameState): string {
    return state.players.find(p => p.id !== AI_PLAYER_ID)?.id ?? state.players[0].id
  }

  private async reactToRoundEnd(gameState: GameState): Promise<void> {
    const lastRound = gameState.roundHistory[gameState.roundHistory.length - 1]
    if (!lastRound) {
      this.emitShowRoundResult(gameState)
      return
    }

    const aiIndex = gameState.players.findIndex(p => p.id === AI_PLAYER_ID)
    const myCard = aiIndex === 0 ? lastRound.player0Card : lastRound.player1Card
    const oppCard = aiIndex === 0 ? lastRound.player1Card : lastRound.player0Card
    const iWon = lastRound.winner === AI_PLAYER_ID
    const isDraw = lastRound.winner === null && lastRound.foldedPlayerId === null
    const isFold = lastRound.foldedPlayerId !== null

    const response = await this.sendEvent('round_end', gameState, {
      roundResult: {
        myCard, opponentCard: oppCard, iWon, isDraw, isFold, potWon: lastRound.potWon,
        ...(lastRound.penalty ? { penalty: lastRound.penalty } : {}),
      },
    })
    if (response) {
      this.io.to(this.humanSocketId).emit('ai-state', {
        expression: response.expression,
        message: response.message,
      })
    }
    if (this.disposed) return
    await this.delay(2000)
    if (this.disposed) return
    this.emitShowRoundResult(gameState)
  }

  private emitShowRoundResult(gameState: GameState): void {
    const lastRound = gameState.roundHistory[gameState.roundHistory.length - 1]
    if (!lastRound) return
    this.io.to(this.humanSocketId).emit('show-round-result', { roundResult: lastRound })
  }

  private emitInstantCardReaction(gameState: GameState): void {
    const engine = this.sessionManager.getEngine()
    const view = engine.getPlayerView(gameState, AI_PLAYER_ID)
    if (view.opponentCard == null) return

    const expression = getInstantCardReaction(view.opponentCard, this.character)
    this.logger.logInstantReaction(view.opponentCard, expression)
    this.io.to(this.humanSocketId).emit('ai-state', {
      expression,
      message: null,
    })
  }

  private delay(ms: number): Promise<void> {
    return new Promise(resolve => setTimeout(resolve, ms))
  }
}
