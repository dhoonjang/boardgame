import { DEATH_RESPAWN_TURNS, MONSTERS } from '../constants.js';
import { getDistance } from '../hex.js';
import type { GameEvent, GameState, HexCoord, Monster, Player } from '../types.js';

/**
 * 몬스터 주사위 굴리기 (6개)
 */
export function rollMonsterDice(): number[] {
  return Array.from({ length: 6 }, () => Math.floor(Math.random() * 6) + 1)
}

/**
 * 몬스터 단계 처리
 */
export function processMonsterPhase(state: GameState): { newState: GameState; events: GameEvent[] } {
  const events: GameEvent[] = []
  const monsterDice = rollMonsterDice()

  let newState = { ...state, monsterDice }
  let newPlayers = [...state.players]

  for (const monster of state.monsters) {
    if (monster.isDead) continue

    // 몬스터 정의 찾기
    const monsterDef = MONSTERS.find(m => m.id === monster.id)
    if (!monsterDef) continue

    // 몬스터의 주사위 합 계산: 작은 순으로 정렬 후 diceIndices가 가리키는 주사위들을 더함
    const sortedDice = [...monsterDice].sort((a, b) => a - b)
    const diceSum = monster.diceIndices.reduce((sum, idx) => sum + sortedDice[idx], 0)

    // 인접한 용사 찾기
    const adjacentPlayers = newPlayers.filter(p =>
      !p.isDead && getDistance(monster.position, p.position) === 1
    )

    if (adjacentPlayers.length === 0) continue

    // 몬스터별 고유 효과 처리
    const result = processMonsterEffect(
      monster,
      monsterDef.id,
      diceSum,
      adjacentPlayers,
      newPlayers,
      newState
    )

    newPlayers = result.players
    events.push(...result.events)
  }

  return {
    newState: { ...newState, players: newPlayers },
    events,
  }
}

interface MonsterEffectResult {
  players: Player[]
  events: GameEvent[]
}

/**
 * 몬스터별 고유 효과 처리
 */
function processMonsterEffect(
  monster: Monster,
  monsterId: string,
  diceSum: number,
  adjacentPlayers: Player[],
  allPlayers: Player[],
  state: GameState
): MonsterEffectResult {
  const events: GameEvent[] = []
  let players = [...allPlayers]

  // 공격 대상 결정: 주사위합 % 인접타일수
  const targetIndex = diceSum % adjacentPlayers.length
  const targetPlayer = adjacentPlayers[targetIndex]

  switch (monsterId) {
    case 'hydra': {
      // 히드라: 주사위 합이 15 이상이면 인접한 용사에게 피해
      if (diceSum >= 15) {
        const damage = diceSum
        const result = applyMonsterDamage(players, targetPlayer.id, damage, monster.id)
        players = result.players
        events.push(...result.events)
      }
      break
    }

    case 'grindylow': {
      // 그린딜로: 주사위 합이 7 이상이면 속박 (이동 불가)
      // TODO: 속박 상태 시스템 필요
      if (diceSum >= 7) {
        const damage = Math.floor(diceSum / 2) // 절반 피해
        const result = applyMonsterDamage(players, targetPlayer.id, damage, monster.id)
        players = result.players
        events.push(...result.events)
      }
      break
    }

    case 'troll': {
      // 트롤: 타락한 용사에게는 주사위 합이 음수일 때만 공격
      // (실제로 음수가 될 수 없으므로 타락 용사는 공격 안 받음)
      if (targetPlayer.state !== 'corrupt') {
        const damage = diceSum
        const result = applyMonsterDamage(players, targetPlayer.id, damage, monster.id)
        players = result.players
        events.push(...result.events)
      }
      break
    }

    case 'golem': {
      // 골렘: 주사위 합이 12면 기본 공격 피해 무시 (자신에게 오는)
      // 일반 공격만 함
      const damage = diceSum
      const result = applyMonsterDamage(players, targetPlayer.id, damage, monster.id)
      players = result.players
      events.push(...result.events)
      break
    }

    case 'harpy': {
      // 하피: 주사위 합이 7 이상이면 밀어냄
      if (diceSum >= 7) {
        // 밀려날 방향 계산 (몬스터에서 멀어지는 방향)
        const pushDir: HexCoord = {
          q: targetPlayer.position.q - monster.position.q,
          r: targetPlayer.position.r - monster.position.r,
        }
        const newPosition: HexCoord = {
          q: targetPlayer.position.q + pushDir.q,
          r: targetPlayer.position.r + pushDir.r,
        }

        // 이동 가능한지 확인 (간단히 처리)
        players = players.map(p =>
          p.id === targetPlayer.id ? { ...p, position: newPosition } : p
        )
        events.push({
          type: 'PLAYER_MOVED',
          playerId: targetPlayer.id,
          from: targetPlayer.position,
          to: newPosition,
        })
      }
      break
    }

    case 'balrog': {
      // 발록: 일반 공격 + 죽으면 희생 라운드 직후 부활 (별도 처리 필요)
      const damage = diceSum
      const result = applyMonsterDamage(players, targetPlayer.id, damage, monster.id)
      players = result.players
      events.push(...result.events)
      break
    }

    case 'lich': {
      // 리치: 주사위 합이 8 이상이면 몬스터들이 매직 피해 무시
      // TODO: 마법 면역 상태 시스템 필요
      const damage = diceSum
      const result = applyMonsterDamage(players, targetPlayer.id, damage, monster.id)
      players = result.players
      events.push(...result.events)
      break
    }

    default: {
      // 기본 공격
      const damage = diceSum
      const result = applyMonsterDamage(players, targetPlayer.id, damage, monster.id)
      players = result.players
      events.push(...result.events)
    }
  }

  return { players, events }
}

/**
 * 몬스터 피해 적용
 */
function applyMonsterDamage(
  players: Player[],
  targetId: string,
  damage: number,
  attackerId: string
): { players: Player[]; events: GameEvent[] } {
  const events: GameEvent[] = []
  const target = players.find(p => p.id === targetId)

  if (!target) {
    return { players, events }
  }

  const newHealth = Math.max(0, target.health - damage)
  const isDead = newHealth <= 0

  const newPlayers = players.map(p =>
    p.id === targetId
      ? {
          ...p,
          health: newHealth,
          isDead,
          deathTurnsRemaining: isDead ? DEATH_RESPAWN_TURNS : p.deathTurnsRemaining,
        }
      : p
  )

  events.push({
    type: 'PLAYER_ATTACKED',
    attackerId,
    targetId,
    damage,
  })

  if (isDead) {
    events.push({
      type: 'PLAYER_DIED',
      playerId: targetId,
    })
  }

  return { players: newPlayers, events }
}

/**
 * 발록 부활 체크 (희생 라운드 후)
 */
export function checkBalrogRespawn(state: GameState): GameState {
  const balrog = state.monsters.find(m => m.id === 'balrog')
  if (!balrog || !balrog.isDead) {
    return state
  }

  const balrogDef = MONSTERS.find(m => m.id === 'balrog')
  if (!balrogDef) {
    return state
  }

  // 발록 부활
  return {
    ...state,
    monsters: state.monsters.map(m =>
      m.id === 'balrog'
        ? { ...m, isDead: false, health: balrogDef.maxHealth }
        : m
    ),
  }
}
