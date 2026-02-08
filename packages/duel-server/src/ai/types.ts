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

export interface AITurnContext {
  personality: AIPersonality
  phase: 'ability' | 'betting'
  validActions: ValidAction[]
  opponentCard: number | null
  myChips: number
  opponentChips: number
  pot: number
  roundNumber: number
  maxRounds: number
  mySwapCount: number
  myIndex: number
  myPlayerId: string
  roundHistory: RoundResult[]
  deckRemaining: number
}

// ─── 리액션 시스템 ───

export type AIReactionEvent =
  | 'human_action'
  | 'round_start'
  | 'round_end'
  | 'game_over'

export interface AIReactionContext {
  personality: AIPersonality
  event: AIReactionEvent
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

export interface AIReaction {
  expression: AIExpression
  message: string
}
