import type { GameState, Player, Revelation, HexCoord, GameEvent } from '../types'
import { deserializeBoard, coordToKey } from '../types'
import { getTile, coordEquals } from '../hex'
import { REVELATIONS } from '../constants'

export interface RevelationResult {
  success: boolean
  newState: GameState
  message: string
  events: GameEvent[]
}

/**
 * 계시 카드 뽑기
 */
export function drawRevelation(
  state: GameState,
  playerId: string,
  source: 'angel' | 'demon'
): { newState: GameState; revelation: Revelation | null } {
  const availableRevelations = state.revelationDeck.filter(r => r.source === source)

  if (availableRevelations.length === 0) {
    return { newState: state, revelation: null }
  }

  // 랜덤으로 하나 선택
  const index = Math.floor(Math.random() * availableRevelations.length)
  const revelation = availableRevelations[index]

  const newDeck = state.revelationDeck.filter(r => r.id !== revelation.id)
  const newPlayers = state.players.map(p =>
    p.id === playerId
      ? { ...p, revelations: [...p.revelations, revelation] }
      : p
  )

  return {
    newState: { ...state, revelationDeck: newDeck, players: newPlayers },
    revelation,
  }
}

/**
 * 계시 완료 조건 체크
 */
export function checkRevelationCondition(
  state: GameState,
  player: Player,
  revelation: Revelation
): boolean {
  const board = deserializeBoard(state.board)
  const playerTile = getTile(board, player.position)

  switch (revelation.id) {
    case 'rev-1':
      // 몬스터 제물 1개 신전에 바치기
      return playerTile?.type === 'temple' && player.monsterEssence >= 1
    case 'rev-2':
      // 세모 1개 신전에 바치기 (능력치 조건)
      return playerTile?.type === 'temple' && player.monsterEssence >= 1
    case 'rev-3':
      // 네모 1개 신전에 바치기 (능력치 조건)
      return playerTile?.type === 'temple' && player.monsterEssence >= 1
    case 'rev-4':
      // 타락한 상태로 마왕성에 도착
      return player.state === 'corrupt' && playerTile?.type === 'castle'
    case 'rev-5':
      // 신성 상태로 다른 용사를 죽여라 (처치 시 체크)
      return false // 이벤트 기반으로 체크해야 함
    default:
      return false
  }
}

/**
 * 계시 완료 처리
 */
export function completeRevelation(
  state: GameState,
  playerId: string,
  revelationId: string
): RevelationResult {
  const player = state.players.find(p => p.id === playerId)
  if (!player) {
    return {
      success: false,
      newState: state,
      message: '플레이어를 찾을 수 없습니다.',
      events: [],
    }
  }

  const revelation = player.revelations.find(r => r.id === revelationId)
  if (!revelation) {
    return {
      success: false,
      newState: state,
      message: '해당 계시를 보유하고 있지 않습니다.',
      events: [],
    }
  }

  // 조건 체크
  if (!checkRevelationCondition(state, player, revelation)) {
    return {
      success: false,
      newState: state,
      message: '계시 완료 조건을 충족하지 않았습니다.',
      events: [],
    }
  }

  const events: GameEvent[] = []
  let newState = state

  // 보상 지급
  newState = applyRevelationReward(newState, playerId, revelation)

  // 완료된 계시를 revelations에서 completedRevelations로 이동
  newState = {
    ...newState,
    players: newState.players.map(p =>
      p.id === playerId
        ? {
            ...p,
            revelations: p.revelations.filter(r => r.id !== revelationId),
            completedRevelations: [...p.completedRevelations, revelation],
          }
        : p
    ),
  }

  events.push({
    type: 'REVELATION_COMPLETED',
    playerId,
    revelationId,
  })

  // 승리 계시 체크
  if (revelation.isGameEnd) {
    events.push({
      type: 'GAME_OVER',
      winnerId: playerId,
    })
  }

  return {
    success: true,
    newState,
    message: `계시 "${revelation.name}"을(를) 완료했습니다!`,
    events,
  }
}

/**
 * 계시 보상 적용
 */
function applyRevelationReward(
  state: GameState,
  playerId: string,
  revelation: Revelation
): GameState {
  let newState = state
  const { reward } = revelation

  // 공통 점수 보상 적용
  if (reward.devilScore || reward.faithScore) {
    newState = {
      ...newState,
      players: newState.players.map(p =>
        p.id === playerId
          ? {
              ...p,
              devilScore: p.devilScore + (reward.devilScore ?? 0),
              faithScore: p.faithScore + (reward.faithScore ?? 0),
            }
          : p
      ),
    }
  }

  switch (revelation.id) {
    case 'rev-1':
      // 계시 카드 2장
      for (let i = 0; i < 2; i++) {
        const result = drawRevelation(newState, playerId, 'angel')
        newState = result.newState
      }
      // 정수 1 소모
      newState = {
        ...newState,
        players: newState.players.map(p =>
          p.id === playerId
            ? { ...p, monsterEssence: p.monsterEssence - 1 }
            : p
        ),
      }
      break

    case 'rev-2':
      // 신속의 장화 + 계시 카드 1장
      // TODO: 아이템 지급 시스템
      {
        const result = drawRevelation(newState, playerId, 'angel')
        newState = result.newState
        newState = {
          ...newState,
          players: newState.players.map(p =>
            p.id === playerId
              ? { ...p, monsterEssence: p.monsterEssence - 1 }
              : p
          ),
        }
      }
      break

    case 'rev-3':
      // 명석함의 장화 + 계시 카드 1장
      // TODO: 아이템 지급 시스템
      {
        const result = drawRevelation(newState, playerId, 'angel')
        newState = result.newState
        newState = {
          ...newState,
          players: newState.players.map(p =>
            p.id === playerId
              ? { ...p, monsterEssence: p.monsterEssence - 1 }
              : p
          ),
        }
      }
      break

    case 'rev-4':
      // 체력 회복, 무기 1개 선택, 계시 카드 1장
      {
        const player = newState.players.find(p => p.id === playerId)
        if (player) {
          newState = {
            ...newState,
            players: newState.players.map(p =>
              p.id === playerId
                ? { ...p, health: p.maxHealth }
                : p
            ),
          }
        }
        const result = drawRevelation(newState, playerId, 'demon')
        newState = result.newState
      }
      break

    case 'rev-5':
      // 타락 주사위 3으로 시작, 계시 카드 1장
      newState = {
        ...newState,
        players: newState.players.map(p =>
          p.id === playerId
            ? { ...p, corruptDice: 3 }
            : p
        ),
      }
      {
        const result = drawRevelation(newState, playerId, 'demon')
        newState = result.newState
      }
      break
  }

  return newState
}

/**
 * 초기 계시 덱 생성
 */
export function createRevelationDeck(): Revelation[] {
  return [...REVELATIONS]
}
