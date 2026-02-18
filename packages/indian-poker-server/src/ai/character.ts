import type { AIExpression } from '../game'

export interface ExpressionProfile {
  favorable: AIExpression[]
  neutral: AIExpression[]
  unfavorable: AIExpression[]
}

export interface AICharacter {
  id: string
  name: string
  description: string
  difficulty: 'easy' | 'normal' | 'hard'
  characterPrompt: string
  avatarUrl: string
  expressionProfile?: ExpressionProfile
}
