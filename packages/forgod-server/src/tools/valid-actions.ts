import { z } from 'zod'
import { sessionManager } from '../session'
import { GameEngine } from '@forgod/core'

export const getValidActionsSchema = z.object({
  gameId: z.string().describe('게임 ID'),
  playerId: z.string().describe('플레이어 ID'),
})

export type GetValidActionsInput = z.infer<typeof getValidActionsSchema>

export async function getValidActions(input: GetValidActionsInput) {
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

  // 현재 턴 플레이어 확인
  const engine = new GameEngine()
  const currentPlayer = engine.getCurrentPlayer(session.state)
  const isMyTurn = currentPlayer?.id === input.playerId

  // playerId를 전달하여 해당 플레이어의 유효한 액션 조회
  // 현재 턴이 아닌 플레이어도 비-턴 액션(계시 완료, 타락 주사위 적용 등)을 받을 수 있음
  const validActions = await sessionManager.getValidActions(input.gameId, input.playerId)

  return {
    success: true,
    playerId: input.playerId,
    isMyTurn,
    currentTurnPlayerId: currentPlayer?.id,
    currentTurnPlayerName: currentPlayer?.name,
    turnPhase: player.turnPhase,
    roundPhase: (session.state as any).roundPhase,
    validActions: validActions.map((va, index) => ({
      index,
      action: va.action,
      description: va.description,
    })),
  }
}
