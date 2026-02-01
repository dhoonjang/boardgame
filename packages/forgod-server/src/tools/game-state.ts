import { z } from 'zod'
import { sessionManager } from '../session'
import { GAME_RULES } from '@forgod/core'

export const getGameStateSchema = z.object({
  gameId: z.string().describe('게임 ID'),
  playerId: z.string().optional().describe('조회하는 플레이어 ID (선택)'),
})

export type GetGameStateInput = z.infer<typeof getGameStateSchema>

export async function getGameState(input: GetGameStateInput) {
  const session = await sessionManager.getSession(input.gameId)

  if (!session) {
    return {
      success: false,
      error: '게임을 찾을 수 없습니다.',
    }
  }

  const state = session.state
  const currentTurnPlayer = state.players[state.currentPlayerIndex]

  // 조회하는 플레이어 찾기 (없으면 현재 턴 플레이어)
  const viewingPlayer = input.playerId
    ? state.players.find(p => p.id === input.playerId)
    : currentTurnPlayer

  if (input.playerId && !viewingPlayer) {
    return {
      success: false,
      error: '플레이어를 찾을 수 없습니다.',
    }
  }

  // TODO: engine 마이그레이션 후 roundPhase 사용
  const roundPhase = (state as any).roundPhase ?? (state as any).currentPhase

  return {
    success: true,
    gameState: {
      gameId: state.id,
      roundNumber: state.roundNumber,
      roundPhase,
      currentTurnPlayer: {
        id: currentTurnPlayer.id,
        name: currentTurnPlayer.name,
      },
      // 조회하는 플레이어의 상세 정보
      myPlayer: viewingPlayer ? {
        id: viewingPlayer.id,
        name: viewingPlayer.name,
        heroClass: viewingPlayer.heroClass,
        state: viewingPlayer.state,
        health: viewingPlayer.health,
        maxHealth: viewingPlayer.maxHealth,
        position: viewingPlayer.position,
        stats: viewingPlayer.stats,
        corruptDice: viewingPlayer.corruptDice,
        corruptDiceTarget: viewingPlayer.corruptDiceTarget,
        revelations: viewingPlayer.revelations.map(r => ({
          id: r.id,
          name: r.name,
          source: r.source,
          task: r.task,
          reward: r.reward,
          isVictory: r.isVictory,
        })),
        monsterEssence: viewingPlayer.monsterEssence,
        isDead: viewingPlayer.isDead,
        deathTurnsRemaining: viewingPlayer.deathTurnsRemaining,
        skillCooldowns: viewingPlayer.skillCooldowns,
        isMyTurn: viewingPlayer.id === currentTurnPlayer.id,
      } : null,
      // 모든 플레이어의 공개 정보
      players: state.players.map(p => ({
        id: p.id,
        name: p.name,
        heroClass: p.heroClass,
        state: p.state,
        health: p.health,
        maxHealth: p.maxHealth,
        position: p.position,
        isDead: p.isDead,
        monsterEssence: p.monsterEssence,
        isCurrentTurn: p.id === currentTurnPlayer.id,
      })),
      monsters: state.monsters.map(m => ({
        id: m.id,
        name: m.name,
        position: m.position,
        health: m.health,
        maxHealth: m.maxHealth,
        isDead: m.isDead,
      })),
      board: state.board.map(tile => ({
        coord: tile.coord,
        type: tile.type,
        villageClass: tile.villageClass,
        monsterId: tile.monsterId,
      })),
      monsterDice: state.monsterDice,
    },
  }
}

export const getGameRulesSchema = z.object({})

export function getGameRules() {
  return {
    success: true,
    rules: GAME_RULES,
  }
}
