import type {
  AIExpression,
  GameAction,
  RoundResult,
  ValidAction,
} from '../game'

export interface AIPersonality {
  name: string
  aggressiveness: number
  bluffRate: number
  expressiveness: number
  chattiness: number
  speechDeception: number // 대사에서 속이는 비율 (0~1, 높을수록 거짓말 많이)
  description: string
}

export interface AIDecision {
  action: GameAction
  expression: AIExpression
  message: string | null
}

// ─── 멀티턴 대화 시스템 ───

export type AIGameEvent = 'round_start' | 'human_action' | 'ai_turn' | 'round_end' | 'game_over'

export interface AIMessageContext {
  event: AIGameEvent
  personality: AIPersonality
  phase: string
  opponentCard: number | null
  myChips: number
  opponentChips: number
  pot: number
  roundNumber: number
  maxRounds: number
  myIndex: number
  myPlayerId: string
  roundHistory: RoundResult[]
  validActions?: ValidAction[]
  mySwapCount?: number
  deckRemaining?: number
  humanAction?: string
  roundResult?: {
    myCard: number
    opponentCard: number
    iWon: boolean
    isDraw: boolean
    isFold: boolean
    potWon: number
  }
  gameResult?: {
    iWon: boolean
    isDraw: boolean
    myFinalChips: number
    opponentFinalChips: number
  }
}

export interface AIResponse {
  action?: GameAction
  expression: AIExpression
  message: string | null
}
