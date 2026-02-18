import type {
  AIExpression,
  GameAction,
  RoundResult,
  ValidAction,
} from '../game'

export interface AIDecision {
  action: GameAction
  expression: AIExpression
  message: string | null
}

// ─── 멀티턴 대화 시스템 ───

export type AIGameEvent = 'round_start' | 'human_action' | 'ai_turn' | 'round_end' | 'game_over'

export interface AIContext {
  event: AIGameEvent
  phase: string
  opponentCard: number | null
  myChips: number
  opponentChips: number
  pot: number
  roundNumber: number
  maxRounds: number
  myIndex: number
  myPlayerId: string
  difficulty?: 'easy' | 'normal' | 'hard'
  roundHistory: RoundResult[]
  validActions?: ValidAction[]
  humanAction?: string
  roundResult?: {
    myCard: number
    opponentCard: number
    iWon: boolean
    isDraw: boolean
    isFold: boolean
    potWon: number
    penalty?: number
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
