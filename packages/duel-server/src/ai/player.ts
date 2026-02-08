import type { Server } from 'socket.io'
import type { GameState } from '../game'
import type { AIPersonality, AITurnContext, AIReactionEvent, AIReactionContext } from './types'
import { generatePersonality } from './personality'
import { decideAITurn, generateReaction } from './brain'
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
  }

  get name(): string {
    return this.personality.name
  }

  dispose(): void {
    this.disposed = true
  }

  /**
   * 게임 이벤트에 대한 리액션 (표정+대사만, 액션 없음)
   */
  async reactToEvent(event: AIReactionEvent, gameState: GameState, extraData?: Partial<AIReactionContext>): Promise<void> {
    if (this.disposed) return

    const engine = this.sessionManager.getEngine()
    const view = engine.getPlayerView(gameState, AI_PLAYER_ID)

    const ctx: AIReactionContext = {
      personality: this.personality,
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
      roundHistory: view.roundHistory,
      ...extraData,
    }

    const reaction = await generateReaction(ctx)
    if (this.disposed) return

    this.io.to(this.humanSocketId).emit('ai-state', {
      expression: reaction.expression,
      message: reaction.message,
    })
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
          await this.reactToEvent('game_over', gameState, {
            gameResult: {
              iWon,
              isDraw,
              myFinalChips: aiPlayer.chips,
              opponentFinalChips: humanPlayer.chips,
            },
          })
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

            await this.reactToEvent('round_end', gameState, {
              roundResult: {
                myCard,
                opponentCard: oppCard,
                iWon,
                isDraw,
                isFold,
                potWon: lastRound.potWon,
              },
            })
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
          await this.reactToEvent('round_start', room.gameState)
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
      // humanAction이 있으면 리액션 먼저
      if (humanAction) {
        await this.reactToEvent('human_action', gameState, { humanAction })
        if (this.disposed) return
        await this.delay(1000)
        if (this.disposed) return
      }

      // 'thinking' 표정 전송
      this.io.to(this.humanSocketId).emit('ai-state', {
        expression: 'thinking',
        message: '음...',
      })

      const view = engine.getPlayerView(gameState, AI_PLAYER_ID)

      const context: AITurnContext = {
        personality: this.personality,
        phase: gameState.phase as 'ability' | 'betting',
        validActions: aiActions,
        opponentCard: view.opponentCard,
        myChips: view.me.chips,
        opponentChips: view.opponent.chips,
        pot: view.pot,
        roundNumber: view.roundNumber,
        maxRounds: view.maxRounds,
        mySwapCount: view.me.swapCount,
        myIndex: view.myIndex,
        myPlayerId: AI_PLAYER_ID,
        roundHistory: view.roundHistory,
        deckRemaining: view.deckRemaining,
      }

      const decision = await decideAITurn(context)

      if (this.disposed) return

      // 표정 + 대사 전송
      this.io.to(this.humanSocketId).emit('ai-state', {
        expression: decision.expression,
        message: decision.message,
      })

      // 짧은 딜레이 후 액션 실행
      await this.delay(300)
      if (this.disposed) return

      await this.executeAction(gameState, decision.action)
    } finally {
      this.processing = false
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

  private getHumanPlayerId(state: GameState): string {
    return state.players.find(p => p.id !== AI_PLAYER_ID)?.id ?? state.players[0].id
  }

  private delay(ms: number): Promise<void> {
    return new Promise(resolve => setTimeout(resolve, ms))
  }
}
