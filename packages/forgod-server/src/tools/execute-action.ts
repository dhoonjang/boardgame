import { z } from 'zod'
import { sessionManager } from '../session.js'
import type { GameAction } from '@forgod/core'

export const executeActionSchema = z.object({
  gameId: z.string().describe('게임 ID'),
  playerId: z.string().describe('액션을 실행하는 플레이어 ID'),
  action: z.discriminatedUnion('type', [
    z.object({
      type: z.literal('ROLL_MOVE_DICE'),
    }),
    z.object({
      type: z.literal('MOVE'),
      position: z.object({
        q: z.number().describe('열 좌표'),
        r: z.number().describe('행 좌표'),
      }).describe('이동할 6각형 좌표'),
    }),
    z.object({
      type: z.literal('BASIC_ATTACK'),
      targetId: z.string().describe('공격 대상 ID (플레이어 또는 몬스터)'),
    }),
    z.object({
      type: z.literal('USE_SKILL'),
      skillId: z.string().describe('사용할 스킬 ID'),
      targetId: z.string().optional().describe('스킬 대상 ID'),
      position: z.object({
        q: z.number(),
        r: z.number(),
      }).optional().describe('스킬 대상 6각형 좌표'),
    }),
    z.object({
      type: z.literal('ROLL_STAT_DICE'),
      stat: z.enum(['strength', 'dexterity', 'intelligence']).describe('굴릴 능력치'),
    }),
    z.object({
      type: z.literal('END_TURN'),
    }),
    z.object({
      type: z.literal('COMPLETE_REVELATION'),
      revelationId: z.string().describe('완료할 계시 카드 ID'),
    }),
    z.object({
      type: z.literal('APPLY_CORRUPT_DICE'),
      stat: z.enum(['strength', 'dexterity', 'intelligence']).describe('타락 주사위 적용할 능력치'),
    }),
    z.object({
      type: z.literal('CHOOSE_HOLY'),
    }),
  ]).describe('실행할 액션'),
})

export type ExecuteActionInput = z.infer<typeof executeActionSchema>

export async function executeAction(input: ExecuteActionInput) {
  const session = await sessionManager.getSession(input.gameId)

  if (!session) {
    return {
      success: false,
      error: '게임을 찾을 수 없습니다.',
    }
  }

  // 플레이어 확인
  const player = session.state.players.find(p => p.id === input.playerId)
  if (!player) {
    return {
      success: false,
      error: '플레이어를 찾을 수 없습니다.',
    }
  }

  // 현재 턴인지 확인
  const currentPlayer = session.state.players[session.state.currentPlayerIndex]
  if (currentPlayer.id !== input.playerId) {
    return {
      success: false,
      error: '현재 당신의 턴이 아닙니다.',
    }
  }

  // Zod 스키마에서 검증된 액션을 GameAction 타입으로 변환
  const gameAction = input.action as GameAction

  const result = await sessionManager.executeAction(input.gameId, gameAction)

  if ('error' in result) {
    return {
      success: false,
      error: result.error,
    }
  }

  const newCurrentPlayer = result.newState.players[result.newState.currentPlayerIndex]

  return {
    success: result.success,
    message: result.message,
    events: result.events,
    newState: {
      currentPlayerId: newCurrentPlayer.id,
      currentPlayerName: newCurrentPlayer.name,
      // TODO: engine이 roundPhase로 마이그레이션되면 변경
      roundPhase: (result.newState as any).roundPhase ?? (result.newState as any).currentPhase,
      roundNumber: result.newState.roundNumber,
    },
  }
}
