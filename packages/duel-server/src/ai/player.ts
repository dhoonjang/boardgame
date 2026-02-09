import type { Server } from 'socket.io'
import type { GameState } from '../game'
import type { AIPersonality, AIMessageContext, AIGameEvent, AIResponse } from './types'
import { generatePersonality } from './personality'
import { AIConversation, fallbackDecision, fallbackReaction, validateDecision, findSafeAction } from './brain'
import { buildSystemPrompt, buildEventMessage, buildPlayerChatMessage } from './prompt'
import type { SessionManager } from '../session'

export const AI_PLAYER_ID = 'ai-player'

export class AIPlayer {
  readonly personality: AIPersonality
  private gameId: string
  private io: Server
  private humanSocketId: string
  private sessionManager: SessionManager
  private processing = false
  private disposed = false
  private conversation: AIConversation
  private pendingChat: string[] = []

  constructor(
    gameId: string,
    io: Server,
    humanSocketId: string,
    sessionManager: SessionManager,
    personalityName?: string,
  ) {
    this.personality = generatePersonality(personalityName)
    this.gameId = gameId
    this.io = io
    this.humanSocketId = humanSocketId
    this.sessionManager = sessionManager
    this.conversation = new AIConversation(buildSystemPrompt(this.personality))
  }

  get name(): string {
    return this.personality.name
  }

  dispose(): void {
    this.disposed = true
    this.conversation.reset()
  }

  /**
   * 유저의 직접 채팅 메시지 처리
   */
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

        // AI 턴이고 response에 action이 있으면 실행
        if (response.action) {
          const room = this.sessionManager.getRoom(this.gameId)
          if (room) {
            const engine = this.sessionManager.getEngine()
            const aiActions = engine.getValidActions(room.gameState, AI_PLAYER_ID)
            if (aiActions.length > 0) {
              const validated = validateDecision(
                { action: response.action, expression: response.expression, message: response.message },
                aiActions,
              )
              await this.delay(300)
              if (this.disposed) return
              await this.executeAction(room.gameState, validated.action)
            }
          }
        }
      } else {
        // API 실패 시 간단한 fallback 대화
        const fallback: AIResponse = { expression: 'poker_face', message: '...' }
        this.conversation.addAssistantMessage(fallback)
        this.io.to(this.humanSocketId).emit('ai-state', {
          expression: fallback.expression,
          message: fallback.message,
        })
      }
    } finally {
      this.processing = false
      await this.processPendingChat()
    }
  }

  /**
   * 게임 이벤트에 대한 대화형 응답 (리액션 or 액션+리액션)
   */
  private async sendEvent(event: AIGameEvent, gameState: GameState, extraData?: Partial<AIMessageContext>): Promise<AIResponse | null> {
    if (this.disposed) return null

    const engine = this.sessionManager.getEngine()
    const view = engine.getPlayerView(gameState, AI_PLAYER_ID)
    const aiActions = event === 'ai_turn' ? engine.getValidActions(gameState, AI_PLAYER_ID) : undefined

    const ctx: AIMessageContext = {
      event,
      personality: this.personality,
      phase: gameState.phase,
      opponentCard: view.opponentCard,
      myChips: view.me.chips,
      opponentChips: view.opponent.chips,
      pot: view.pot,
      roundNumber: view.roundNumber,
      maxRounds: view.maxRounds,
      myIndex: view.myIndex,
      myPlayerId: AI_PLAYER_ID,
      roundHistory: view.roundHistory,
      validActions: aiActions,
      mySwapCount: view.me.swapCount,
      deckRemaining: view.deckRemaining,
      ...extraData,
    }

    const eventMessage = buildEventMessage(ctx)
    const response = await this.conversation.chat(eventMessage)

    if (this.disposed) return null

    if (response) {
      return response
    }

    // fallback
    if (event === 'ai_turn') {
      const fb = fallbackDecision(ctx)
      this.conversation.addAssistantMessage(fb)
      return fb
    }

    const fb = fallbackReaction(ctx)
    this.conversation.addAssistantMessage(fb)
    return fb
  }

  /**
   * 상태가 변경된 후 AI 턴인지 확인하고, 맞으면 행동
   */
  async onStateChanged(gameState: GameState, humanAction?: string): Promise<void> {
    if (this.disposed || this.processing) return

    const engine = this.sessionManager.getEngine()

    // 1. game_over → 리액션만 하고 끝
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
      } finally {
        this.processing = false
      }
      return
    }

    // AI 턴인지 확인
    const aiActions = engine.getValidActions(gameState, AI_PLAYER_ID)
    if (aiActions.length === 0) return

    // 2. START_ROUND 액션 (round_end/waiting 상태)
    if (aiActions.some(a => a.type === 'START_ROUND')) {
      this.processing = true
      try {
        // round_end이면 결과 리액션
        if (gameState.phase === 'round_end') {
          const lastRound = gameState.roundHistory[gameState.roundHistory.length - 1]
          if (lastRound) {
            const aiIndex = gameState.players.findIndex(p => p.id === AI_PLAYER_ID)
            const myCard = aiIndex === 0 ? lastRound.player0Card : lastRound.player1Card
            const oppCard = aiIndex === 0 ? lastRound.player1Card : lastRound.player0Card
            const iWon = lastRound.winner === AI_PLAYER_ID
            const isDraw = lastRound.winner !== null && !iWon && lastRound.foldedPlayerId === null
              ? false : lastRound.winner === null && lastRound.foldedPlayerId === null

            const isFold = lastRound.foldedPlayerId !== null

            const response = await this.sendEvent('round_end', gameState, {
              roundResult: {
                myCard,
                opponentCard: oppCard,
                iWon,
                isDraw,
                isFold,
                potWon: lastRound.potWon,
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
          }
        }

        // START_ROUND 실행
        await this.delay(500)
        if (this.disposed) return
        await this.executeAction(gameState, { type: 'START_ROUND' })

        // START_ROUND 후 새 상태에서 round_start 리액션
        if (this.disposed) return
        const room = this.sessionManager.getRoom(this.gameId)
        if (room && room.gameState.phase === 'ability') {
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

      // START_ROUND 후 재귀 (AI 능력 턴이면 결정)
      if (!this.disposed) {
        const room = this.sessionManager.getRoom(this.gameId)
        if (room) {
          setTimeout(() => this.onStateChanged(room.gameState), 100)
        }
      }
      return
    }

    // 3. 능력/베팅 단계 (AI 턴)
    if (gameState.phase !== 'ability' && gameState.phase !== 'betting') return

    this.processing = true
    try {
      // humanAction이 있으면 리액션 먼저 (START_ROUND는 round_start로 처리)
      if (humanAction) {
        if (humanAction === 'START_ROUND') {
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

      // 'thinking' 표정 전송
      this.io.to(this.humanSocketId).emit('ai-state', {
        expression: 'thinking',
        message: null,
      })

      // AI 턴 결정
      const response = await this.sendEvent('ai_turn', gameState)
      if (this.disposed) return

      if (response) {
        // 표정 + 대사 전송
        this.io.to(this.humanSocketId).emit('ai-state', {
          expression: response.expression,
          message: response.message,
        })

        // 짧은 딜레이 후 액션 실행
        await this.delay(300)
        if (this.disposed) return

        const action = response.action ?? findSafeAction(aiActions)
        const validated = validateDecision(
          { action, expression: response.expression, message: response.message },
          aiActions,
        )
        await this.executeAction(gameState, validated.action)
      }
    } finally {
      this.processing = false
    }
  }

  /**
   * 외부 이벤트용 (socket-handlers에서 호출) — round_start 리액션
   */
  async reactToEvent(event: AIGameEvent, gameState: GameState, extraData?: Partial<AIMessageContext>): Promise<void> {
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

    // 상태 업데이트
    this.sessionManager.updateGame(this.gameId, result.newState)

    // human에게 상태 전송
    const humanView = engine.getPlayerView(result.newState, this.getHumanPlayerId(result.newState))
    this.io.to(this.humanSocketId).emit('game-state', { playerView: humanView })
    this.io.to(this.humanSocketId).emit('valid-actions', {
      actions: engine.getValidActions(result.newState, this.getHumanPlayerId(result.newState)),
    })

    // 아직 AI 턴이면 재귀
    if (!this.disposed) {
      // 비동기로 재귀하여 스택 오버플로우 방지
      setTimeout(() => this.onStateChanged(result.newState), 100)
    }
  }

  private async processPendingChat(): Promise<void> {
    while (this.pendingChat.length > 0 && !this.disposed) {
      const msg = this.pendingChat.shift()!
      await this.handlePlayerChat(msg)
    }
  }

  private getHumanPlayerId(state: GameState): string {
    return state.players.find(p => p.id !== AI_PLAYER_ID)?.id ?? state.players[0].id
  }

  private delay(ms: number): Promise<void> {
    return new Promise(resolve => setTimeout(resolve, ms))
  }
}
