import { z } from 'zod'
import { sessionManager } from '../session.js'

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

  // 현재 턴이 아닌 플레이어는 액션 없음
  const currentPlayer = session.state.players[session.state.currentPlayerIndex]
  const isMyTurn = currentPlayer.id === input.playerId

  if (!isMyTurn) {
    return {
      success: true,
      playerId: input.playerId,
      isMyTurn: false,
      currentTurnPlayerId: currentPlayer.id,
      currentTurnPlayerName: currentPlayer.name,
      roundPhase: session.state.roundPhase,
      validActions: [],
    }
  }

  const validActions = await sessionManager.getValidActions(input.gameId)

  return {
    success: true,
    playerId: input.playerId,
    isMyTurn: true,
    turnPhase: player.turnPhase,
    roundPhase: session.state.roundPhase,
    validActions: validActions.map((va, index) => ({
      index,
      action: va.action,
      description: va.description,
    })),
  }
}
