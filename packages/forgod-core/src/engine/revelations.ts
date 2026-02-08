import type { GameState, Player, Revelation, GameEvent } from '../types'
import { deserializeBoard } from '../types'
import { getTile } from '../hex'
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
    // ===== 천사 계시 =====
    case 'angel-1':
      // 계시 기도: 제물 1개 신전에 바치기 (TODO: 제물 시스템 필요, 임시로 monsterEssence)
      return playerTile?.type === 'temple' && player.monsterEssence >= 1

    case 'angel-2':
      // 동그라미 제물 바치기: ● 신전에 바치기 (TODO: 제물 시스템 필요)
      return playerTile?.type === 'temple'

    case 'angel-3':
      // 세모 제물 바치기: ▲ 신전에 바치기 (TODO: 제물 시스템 필요)
      return playerTile?.type === 'temple'

    case 'angel-4':
      // 네모 제물 바치기: ■ 신전에 바치기 (TODO: 제물 시스템 필요)
      return playerTile?.type === 'temple'

    case 'angel-5':
      // 발록 공격: 발록을 공격했는지 (이벤트 기반 → 공격 시 체크 필요)
      return false

    case 'angel-6':
      // 발록 처단: 신성 상태로 발록을 죽여라 (이벤트 기반)
      return false

    case 'angel-7':
      // 천사의 가호: 타락 용사로부터 죽을만큼 피해 (이벤트 기반)
      return false

    case 'angel-8':
      // 신의 승리: 세모 3개, 네모 3개 신전에 바치기 (TODO: 제물 시스템 필요)
      return playerTile?.type === 'temple'

    case 'angel-9':
      // 마왕 처단: 신앙 점수 5점 이상 + 마왕성 진입
      return player.faithScore >= 5 && playerTile?.type === 'castle'

    // ===== 마왕 계시 =====
    case 'demon-1':
      // 동그라미 제물 수습: ● 가지고 마왕성 도착 (TODO: 제물 시스템 필요)
      return playerTile?.type === 'castle'

    case 'demon-2':
      // 세모 제물 수습: ▲ 가지고 마왕성 도착 (TODO: 제물 시스템 필요)
      return playerTile?.type === 'castle'

    case 'demon-3':
      // 네모 제물 수습: ■ 가지고 마왕성 도착 (TODO: 제물 시스템 필요)
      return playerTile?.type === 'castle'

    case 'demon-4':
      // 선제 공격: 신성 상태로 용사 공격 (이벤트 기반)
      return false

    case 'demon-5': {
      // 성장: 플레이어 중 최고 레벨
      const playerLevel = Math.max(
        player.stats.strength[0] + player.stats.strength[1],
        player.stats.dexterity[0] + player.stats.dexterity[1],
        player.stats.intelligence[0] + player.stats.intelligence[1]
      )
      const maxLevel = Math.max(
        ...state.players.map(p => Math.max(
          p.stats.strength[0] + p.stats.strength[1],
          p.stats.dexterity[0] + p.stats.dexterity[1],
          p.stats.intelligence[0] + p.stats.intelligence[1]
        ))
      )
      return playerLevel >= maxLevel
    }

    case 'demon-6':
      // 마을 습격: 마을 타일에 있는 용사 공격 (이벤트 기반)
      return false

    case 'demon-7':
      // 배신: 제물을 주고받았던 용사 공격 (이벤트 기반, TODO: 교환 추적 필요)
      return false

    case 'demon-8':
      // 타락 유혹: 신성 상태로 용사 처치 (이벤트 기반)
      return false

    case 'demon-9':
      // 타락함 증명: 타락 주사위 3 이상
      return (player.corruptDice ?? 0) >= 3

    case 'demon-10':
      // 마검 뽑기: 마검 획득
      return player.hasDemonSword

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
 * reward에 정의된 공통 보상(점수, 추가 계시)을 적용하고,
 * 개별 계시의 특수 보상을 처리합니다.
 */
function applyRevelationReward(
  state: GameState,
  playerId: string,
  revelation: Revelation
): GameState {
  let newState = state
  const { reward } = revelation

  // 공통 점수 보상 적용
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

  // 타락 점수(corruptScore) 보상 → 타락 주사위 증가 또는 설정
  if (reward.corruptScore) {
    newState = {
      ...newState,
      players: newState.players.map(p => {
        if (p.id !== playerId) return p
        const currentCorrupt = p.corruptDice ?? 0
        return {
          ...p,
          state: 'corrupt' as const,
          corruptDice: Math.min(6, currentCorrupt + reward.corruptScore!),
        }
      }),
    }
  }

  // 추가 계시 카드
  if (reward.extraRevelations) {
    const source = revelation.source
    for (let i = 0; i < reward.extraRevelations; i++) {
      const result = drawRevelation(newState, playerId, source)
      newState = result.newState
    }
  }

  return newState
}

/**
 * 초기 계시 덱 생성
 */
export function createRevelationDeck(): Revelation[] {
  return [...REVELATIONS]
}
