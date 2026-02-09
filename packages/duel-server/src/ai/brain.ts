import type { GameAction, ValidAction } from '../game'
import type { AIDecision, AIMessageContext, AIResponse } from './types'

let Anthropic: any = null

try {
  const mod = await import('@anthropic-ai/sdk')
  Anthropic = mod.default
} catch {
  // SDK 미설치 시 무시
}

function getClient(): any | null {
  if (!Anthropic) return null
  if (!process.env.ANTHROPIC_API_KEY) return null
  return new Anthropic()
}

const VALID_EXPRESSIONS = new Set([
  'poker_face', 'confident', 'nervous',
  'smirking', 'surprised', 'thinking', 'taunting',
  'laughing', 'angry', 'disappointed', 'pleased',
  'shocked', 'cold', 'sweating', 'mocking',
])

export function findSafeAction(validActions: ValidAction[]): GameAction {
  const skip = validActions.find(a => a.type === 'SKIP_ABILITY')
  if (skip) return { type: 'SKIP_ABILITY' }

  const call = validActions.find(a => a.type === 'CALL')
  if (call) return { type: 'CALL' }

  const fold = validActions.find(a => a.type === 'FOLD')
  if (fold) return { type: 'FOLD' }

  return { type: validActions[0].type } as GameAction
}

function isValidActionType(actionType: string, validActions: ValidAction[]): boolean {
  return validActions.some(a => a.type === actionType)
}

export function validateDecision(decision: AIDecision, validActions: ValidAction[]): AIDecision {
  let { action, expression, message } = decision

  if (!VALID_EXPRESSIONS.has(expression)) {
    expression = 'poker_face'
  }

  if (!action?.type || !isValidActionType(action.type, validActions)) {
    action = findSafeAction(validActions)
  }

  if (action.type === 'RAISE') {
    const raiseAction = validActions.find(a => a.type === 'RAISE')
    if (raiseAction && raiseAction.minAmount != null && raiseAction.maxAmount != null) {
      const amount = (action as any).amount
      if (typeof amount !== 'number' || amount < raiseAction.minAmount || amount > raiseAction.maxAmount) {
        action = { type: 'RAISE', amount: raiseAction.minAmount }
      }
    }
  }

  return { action, expression, message }
}

function validateResponse(response: AIResponse): AIResponse {
  let { action, expression, message } = response

  if (!VALID_EXPRESSIONS.has(expression)) {
    expression = 'poker_face'
  }

  return { action, expression, message }
}

export function fallbackDecision(ctx: AIMessageContext): AIDecision {
  const validActions = ctx.validActions ?? []
  const { opponentCard } = ctx
  const isAbility = ctx.phase === 'ability'

  if (isAbility) {
    const swapAction = validActions.find(a => a.type === 'SWAP')
    if (swapAction && opponentCard != null && opponentCard >= 7 && Math.random() < 0.5) {
      return { action: { type: 'SWAP' }, expression: 'thinking', message: '바꿔볼까...' }
    }
    return { action: { type: 'SKIP_ABILITY' }, expression: 'poker_face', message: '그냥 가지 뭐' }
  }

  const callAction = validActions.find(a => a.type === 'CALL')
  const raiseAction = validActions.find(a => a.type === 'RAISE')
  const foldAction = validActions.find(a => a.type === 'FOLD')

  if (opponentCard != null && opponentCard <= 4 && raiseAction && raiseAction.minAmount != null) {
    const amount = Math.min(raiseAction.minAmount + 1, raiseAction.maxAmount ?? raiseAction.minAmount)
    return { action: { type: 'RAISE', amount }, expression: 'confident', message: '좀 더 올려볼까?' }
  }

  if (opponentCard != null && opponentCard >= 8 && foldAction && Math.random() < 0.4) {
    return { action: { type: 'FOLD' }, expression: 'nervous', message: '이건 좀...' }
  }

  if (callAction) {
    return { action: { type: 'CALL' }, expression: 'poker_face', message: '콜' }
  }

  return { action: findSafeAction(validActions), expression: 'poker_face', message: '흠...' }
}

export function fallbackReaction(ctx: AIMessageContext): AIResponse {
  const { event, opponentCard, roundResult, gameResult } = ctx

  switch (event) {
    case 'round_start':
      if (opponentCard != null && opponentCard <= 4) {
        return { expression: 'confident', message: '이거 이길 수 있겠는데?' }
      }
      if (opponentCard != null && opponentCard >= 8) {
        return { expression: 'sweating', message: '상대가 높네...' }
      }
      return { expression: 'poker_face', message: '어디 한번 해보자' }

    case 'human_action':
      if (ctx.humanAction?.startsWith('RAISE')) {
        return { expression: 'nervous', message: '크게 나오네?' }
      }
      if (ctx.humanAction === 'FOLD') {
        return { expression: 'pleased', message: '역시 내가 이기지' }
      }
      if (ctx.humanAction === 'CALL') {
        return { expression: 'smirking', message: '받아들이는구나' }
      }
      if (ctx.humanAction === 'SWAP') {
        return { expression: 'surprised', message: '카드를 바꾸네?' }
      }
      return { expression: 'poker_face', message: '흠...' }

    case 'round_end':
      if (roundResult) {
        if (roundResult.isDraw) {
          return { expression: 'surprised', message: '비기다니!' }
        }
        if (roundResult.iWon) {
          return { expression: 'laughing', message: '이번 판은 내 거야!' }
        }
        return { expression: 'disappointed', message: '이번엔 졌네...' }
      }
      return { expression: 'poker_face', message: '다음 판이다' }

    case 'game_over':
      if (gameResult) {
        if (gameResult.isDraw) {
          return { expression: 'surprised', message: '비기다니, 아쉽네!' }
        }
        if (gameResult.iWon) {
          return { expression: 'laughing', message: '재밌었다!' }
        }
        return { expression: 'angry', message: '다음엔 지지 않을 거야' }
      }
      return { expression: 'poker_face', message: '수고했어' }

    default:
      return { expression: 'poker_face', message: '...' }
  }
}

// ─── 멀티턴 대화 클래스 ───

interface MessageParam {
  role: 'user' | 'assistant'
  content: string
}

export class AIConversation {
  private messages: MessageParam[] = []
  private systemPrompt: string

  constructor(systemPrompt: string) {
    this.systemPrompt = systemPrompt
  }

  async chat(userMessage: string): Promise<AIResponse | null> {
    this.messages.push({ role: 'user', content: userMessage })

    const client = getClient()
    if (!client) {
      return null
    }

    try {
      const response = await client.messages.create({
        model: 'claude-haiku-4-5-20251001',
        max_tokens: 300,
        system: this.systemPrompt,
        messages: this.messages,
      })

      const text = (response.content[0] as { type: string; text: string }).text
      this.messages.push({ role: 'assistant', content: text })

      const jsonMatch = text.match(/\{[\s\S]*\}/)
      if (!jsonMatch) {
        console.warn('[AI Conversation] JSON 파싱 실패:', text)
        return null
      }

      const parsed = JSON.parse(jsonMatch[0]) as AIResponse
      return validateResponse(parsed)
    } catch (err) {
      console.warn('[AI Conversation] API 호출 실패:', err)
      return null
    }
  }

  addAssistantMessage(response: AIResponse): void {
    this.messages.push({
      role: 'assistant',
      content: JSON.stringify(response),
    })
  }

  reset(): void {
    this.messages = []
  }
}
