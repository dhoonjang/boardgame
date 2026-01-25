import type { GameState, Player, GameEvent } from '../types.js'
import { deserializeBoard } from '../types.js'
import { getTile } from '../hex.js'

export type VictoryType = 'demon_king' | 'angel' | 'revelation' | null

export interface VictoryCheckResult {
  hasWinner: boolean
  winnerId: string | null
  triggerPlayerId: string | null  // 승리 조건을 트리거한 플레이어
  victoryType: VictoryType
  message: string
}

/**
 * 승리 조건 체크
 * - 승리 조건을 트리거한 플레이어와 실제 승자가 다를 수 있음
 * - 마왕 승리: (마왕 점수 - 신앙 점수)가 가장 높은 플레이어 승리
 * - 천사 승리: (신앙 점수 - 마왕 점수)가 가장 높은 플레이어 승리
 * - 계시 승리: 승리 계시를 완료한 플레이어 승리
 */
export function checkVictoryCondition(state: GameState): VictoryCheckResult {
  // 각 플레이어에 대해 승리 조건 체크
  for (const player of state.players) {
    if (player.isDead) continue

    const board = deserializeBoard(state.board)
    const playerTile = getTile(board, player.position)

    // 1. 마왕 승리 트리거: 타락 + 타락 주사위 6 + 마왕성 진입
    if (checkDemonKingTrigger(player, playerTile?.type)) {
      const winner = findDemonKingWinner(state.players)
      return {
        hasWinner: true,
        winnerId: winner.id,
        triggerPlayerId: player.id,
        victoryType: 'demon_king',
        message: `${player.name}이(가) 마왕 승리를 발동! ${winner.name}이(가) 마왕으로 승천했습니다! (마왕 점수 - 신앙 점수: ${winner.devilScore - winner.faithScore})`,
      }
    }

    // 2. 천사 승리 트리거: 신성 + 신앙 5점 + 마왕성 진입
    if (checkAngelTrigger(player, playerTile?.type)) {
      const winner = findAngelWinner(state.players)
      return {
        hasWinner: true,
        winnerId: winner.id,
        triggerPlayerId: player.id,
        victoryType: 'angel',
        message: `${player.name}이(가) 천사 승리를 발동! ${winner.name}이(가) 천사의 축복을 받았습니다! (신앙 점수 - 마왕 점수: ${winner.faithScore - winner.devilScore})`,
      }
    }

    // 3. 계시 승리: 승리 계시 완료
    if (checkRevelationVictory(player)) {
      return {
        hasWinner: true,
        winnerId: player.id,
        triggerPlayerId: player.id,
        victoryType: 'revelation',
        message: `${player.name}이(가) 계시를 완수했습니다!`,
      }
    }
  }

  return {
    hasWinner: false,
    winnerId: null,
    triggerPlayerId: null,
    victoryType: null,
    message: '',
  }
}

/**
 * 마왕 승리 트리거 조건 체크
 * - 타락 상태
 * - 타락 주사위가 6 (최대치)
 * - 마왕성에 진입
 */
function checkDemonKingTrigger(player: Player, tileType?: string): boolean {
  if (player.state !== 'corrupt') return false
  if (player.corruptDice !== 6) return false
  return tileType === 'castle'
}

/**
 * 마왕 승리 시 실제 승자 결정
 * - (마왕 점수 - 신앙 점수)가 가장 높은 플레이어
 */
function findDemonKingWinner(players: Player[]): Player {
  return players.reduce((winner, player) => {
    const winnerScore = winner.devilScore - winner.faithScore
    const playerScore = player.devilScore - player.faithScore
    return playerScore > winnerScore ? player : winner
  })
}

/**
 * 천사 승리 트리거 조건 체크
 * - 신성 상태
 * - 신앙 5점 이상
 * - 마왕성 진입
 */
function checkAngelTrigger(player: Player, tileType?: string): boolean {
  if (player.state !== 'holy') return false
  if (player.faithScore < 5) return false
  return tileType === 'castle'
}

/**
 * 천사 승리 시 실제 승자 결정
 * - (신앙 점수 - 마왕 점수)가 가장 높은 플레이어
 */
function findAngelWinner(players: Player[]): Player {
  return players.reduce((winner, player) => {
    const winnerScore = winner.faithScore - winner.devilScore
    const playerScore = player.faithScore - player.devilScore
    return playerScore > winnerScore ? player : winner
  })
}

/**
 * 계시 승리 조건 체크
 * - 승리 계시 카드 완료
 */
function checkRevelationVictory(player: Player): boolean {
  // 완료한 계시 중 승리 계시가 있는지 확인
  return player.completedRevelations.some(r => r.isGameEnd)
}

/**
 * 게임 종료 처리
 */
export function handleGameOver(
  state: GameState,
  winnerId: string,
  _victoryType: VictoryType
): { newState: GameState; events: GameEvent[] } {
  const events: GameEvent[] = [{
    type: 'GAME_OVER',
    winnerId,
  }]

  const newState = {
    ...state,
  }

  return { newState, events }
}

/**
 * 플레이어 점수 조회
 */
export function getPlayerScores(player: Player): {
  devilScore: number
  faithScore: number
} {
  return {
    devilScore: player.devilScore,
    faithScore: player.faithScore,
  }
}
