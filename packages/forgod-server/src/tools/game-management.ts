import { z } from 'zod'
import { sessionManager } from '../session'

export const createGameSchema = z.object({
  players: z.array(
    z.object({
      id: z.string().describe('플레이어 고유 ID'),
      name: z.string().describe('플레이어 이름'),
      heroClass: z.enum(['warrior', 'rogue', 'mage']).describe('영웅 직업'),
    })
  ).min(2).max(4).describe('게임에 참여할 플레이어 목록 (2-4명)'),
})

export type CreateGameInput = z.infer<typeof createGameSchema>

export async function createGame(input: CreateGameInput) {
  const session = await sessionManager.createSession({
    players: input.players,
  })

  return {
    success: true,
    gameId: session.id,
    message: `게임이 생성되었습니다. 플레이어: ${input.players.map(p => p.name).join(', ')}`,
    initialState: {
      currentPlayer: session.state.players[session.state.currentPlayerIndex].name,
      currentPhase: session.state.currentPhase,
      roundNumber: session.state.roundNumber,
      playerCount: session.state.players.length,
    },
  }
}

export const listGamesSchema = z.object({})

export async function listGames() {
  const sessions = await sessionManager.getAllSessions()

  return {
    success: true,
    games: sessions.map(session => ({
      gameId: session.id,
      playerCount: session.state.players.length,
      currentRound: session.state.roundNumber,
      currentPhase: session.state.currentPhase,
      createdAt: session.createdAt.toISOString(),
      lastActionAt: session.lastActionAt.toISOString(),
    })),
  }
}

export const deleteGameSchema = z.object({
  gameId: z.string().describe('삭제할 게임의 ID'),
})

export type DeleteGameInput = z.infer<typeof deleteGameSchema>

export async function deleteGame(input: DeleteGameInput) {
  const deleted = await sessionManager.deleteSession(input.gameId)

  if (deleted) {
    return {
      success: true,
      message: '게임이 삭제되었습니다.',
    }
  } else {
    return {
      success: false,
      error: '게임을 찾을 수 없습니다.',
    }
  }
}
