import type { AIExpression, GameAction, ValidAction } from '../game'
import type { AIDecision, AIContext, AIResponse } from './types'
import type { AICharacter, ExpressionProfile } from './character'
import type { GameLogger } from './logger'

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

function extractJSON(text: string): Record<string, unknown> | null {
  // thinking 블록 제거
  const cleaned = text.replace(/<thinking>[\s\S]*?<\/thinking>/g, '').trim()

  // 브레이스 매칭으로 최외곽 JSON 객체 추출
  const start = cleaned.indexOf('{')
  if (start === -1) return null

  let depth = 0
  let inString = false
  let escape = false
  for (let i = start; i < cleaned.length; i++) {
    const ch = cleaned[i]
    if (escape) { escape = false; continue }
    if (ch === '\\' && inString) { escape = true; continue }
    if (ch === '"') { inString = !inString; continue }
    if (inString) continue
    if (ch === '{') depth++
    else if (ch === '}') {
      depth--
      if (depth === 0) {
        try {
          return JSON.parse(cleaned.slice(start, i + 1))
        } catch {
          return null
        }
      }
    }
  }
  return null
}

const VALID_EXPRESSIONS = new Set([
  'poker_face', 'confident', 'nervous',
  'smirking', 'surprised', 'thinking', 'taunting',
  'laughing', 'angry', 'disappointed', 'pleased',
  'shocked', 'cold', 'sweating', 'mocking',
  'bewildered', 'scheming', 'relieved', 'devastated', 'respect',
])

export function findSafeAction(validActions: ValidAction[]): GameAction {
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

export function fallbackDecision(ctx: AIContext): AIDecision {
  const validActions = ctx.validActions ?? []
  const { opponentCard } = ctx

  const callAction = validActions.find(a => a.type === 'CALL')
  const raiseAction = validActions.find(a => a.type === 'RAISE')
  const foldAction = validActions.find(a => a.type === 'FOLD')

  if (opponentCard != null && opponentCard <= 4 && raiseAction && raiseAction.minAmount != null) {
    const amount = Math.min(raiseAction.minAmount + 1, raiseAction.maxAmount ?? raiseAction.minAmount)
    return { action: { type: 'RAISE', amount }, expression: 'confident', message: '좀 더 올려볼까?' }
  }

  // 상대 카드가 10이면 → 쇼다운 가면 지지만, 상대가 자기 카드를 모르므로 블러프로 폴드 유도
  if (opponentCard === 10 && raiseAction && raiseAction.minAmount != null && Math.random() < 0.4) {
    const amount = Math.min(raiseAction.minAmount + 2, raiseAction.maxAmount ?? raiseAction.minAmount)
    return { action: { type: 'RAISE', amount }, expression: 'smirking', message: '별로인데?' }
  }

  // 상대 카드 높을 때 폴드
  if (opponentCard != null && opponentCard >= 8 && foldAction && Math.random() < 0.4) {
    return { action: { type: 'FOLD' }, expression: 'nervous', message: '이건 좀...' }
  }

  if (callAction) {
    return { action: { type: 'CALL' }, expression: 'poker_face', message: '콜' }
  }

  return { action: findSafeAction(validActions), expression: 'poker_face', message: '흠...' }
}

const DEFAULT_EXPRESSION_PROFILE: ExpressionProfile = {
  favorable: ['confident', 'smirking', 'pleased'],
  neutral: ['poker_face', 'thinking'],
  unfavorable: ['nervous', 'thinking', 'poker_face'],
}

export function getInstantCardReaction(opponentCard: number, character: AICharacter): AIExpression {
  const profile = character.expressionProfile ?? DEFAULT_EXPRESSION_PROFILE
  let candidates: AIExpression[]

  if (opponentCard <= 3) {
    candidates = profile.favorable
  } else if (opponentCard <= 7) {
    candidates = profile.neutral
  } else {
    candidates = profile.unfavorable
  }

  return candidates[Math.floor(Math.random() * candidates.length)]
}

export function fallbackReaction(ctx: AIContext): AIResponse {
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
  private logger?: GameLogger

  constructor(systemPrompt: string, logger?: GameLogger) {
    this.systemPrompt = systemPrompt
    this.logger = logger
    logger?.logSystemPrompt(systemPrompt)
  }

  async chat(userMessage: string): Promise<AIResponse | null> {
    this.messages.push({ role: 'user', content: userMessage })

    const client = getClient()
    if (!client) {
      this.logger?.logChat(userMessage, null, null)
      return null
    }

    try {
      const response = await client.messages.create({
        model: 'claude-sonnet-4-5-20250929',
        max_tokens: 300,
        system: this.systemPrompt,
        messages: this.messages,
      })

      const text = (response.content[0] as { type: string; text: string }).text
      this.messages.push({ role: 'assistant', content: text })

      const parsed = extractJSON(text) as AIResponse | null
      if (!parsed) {
        console.warn('[AI Conversation] JSON 파싱 실패:', text)
        this.logger?.logChat(userMessage, text, null)
        return null
      }

      const validated = validateResponse(parsed)
      this.logger?.logChat(userMessage, text, validated)
      return validated
    } catch (err) {
      console.warn('[AI Conversation] API 호출 실패:', err)
      this.logger?.logChat(userMessage, null, null, err instanceof Error ? err.message : String(err))
      return null
    }
  }

  addUserMessage(message: string): void {
    this.messages.push({ role: 'user', content: message })
  }

  addAssistantMessage(response: AIResponse, event?: string): void {
    this.messages.push({
      role: 'assistant',
      content: JSON.stringify(response),
    })
    this.logger?.logFallback(event ?? 'unknown', response)
  }

  reset(): void {
    this.messages = []
  }
}
