import type { GameState, Player, Monster, HexCoord, GameEvent, TileType } from '../types.js'
import { deserializeBoard, coordToKey } from '../types.js'
import { getTile, getDistance, getNeighbors, coordEquals } from '../hex.js'
import { TILE_EFFECTS, DEATH_RESPAWN_TURNS, STARTING_POSITIONS } from '../constants.js'

/**
 * 피해 계산 결과
 */
export interface DamageCalculation {
  baseDamage: number
  bonusDamage: number
  reduction: number
  finalDamage: number
  description: string
}

/**
 * 기본 피해 계산
 */
export function calculateDamage(
  _attacker: Player,
  _target: Player | Monster,
  baseDamage: number,
  options: {
    isSkill?: boolean
    skillBonus?: number
    ignoreArmor?: boolean
  } = {}
): DamageCalculation {
  let bonus = 0
  const reduction = 0
  const descriptions: string[] = []

  // 스킬 보너스
  if (options.skillBonus) {
    bonus += options.skillBonus
    descriptions.push(`스킬 보너스 +${options.skillBonus}`)
  }

  const finalDamage = Math.max(0, baseDamage + bonus - reduction)

  return {
    baseDamage,
    bonusDamage: bonus,
    reduction,
    finalDamage,
    description: descriptions.length > 0 ? descriptions.join(', ') : '기본 피해',
  }
}

/**
 * 플레이어에게 피해 적용
 */
export function applyDamageToPlayer(
  state: GameState,
  targetId: string,
  damage: number,
  attackerId?: string
): { newState: GameState; events: GameEvent[] } {
  const events: GameEvent[] = []
  const target = state.players.find(p => p.id === targetId)

  if (!target || target.isDead) {
    return { newState: state, events: [] }
  }

  const newHealth = Math.max(0, target.health - damage)
  const isDead = newHealth <= 0

  const newState = {
    ...state,
    players: state.players.map(p =>
      p.id === targetId
        ? {
            ...p,
            health: newHealth,
            isDead,
            deathTurnsRemaining: isDead ? DEATH_RESPAWN_TURNS : p.deathTurnsRemaining,
          }
        : p
    ),
  }

  if (attackerId) {
    events.push({
      type: 'PLAYER_ATTACKED',
      attackerId,
      targetId,
      damage,
    })
  }

  if (isDead) {
    events.push({
      type: 'PLAYER_DIED',
      playerId: targetId,
    })
  }

  return { newState, events }
}

/**
 * 몬스터에게 피해 적용
 */
export function applyDamageToMonster(
  state: GameState,
  targetId: string,
  damage: number,
  attackerId: string
): { newState: GameState; events: GameEvent[] } {
  const events: GameEvent[] = []
  const monster = state.monsters.find(m => m.id === targetId)

  if (!monster || monster.isDead) {
    return { newState: state, events: [] }
  }

  // 실제 피해량 (남은 체력보다 많으면 남은 체력만큼만)
  const actualDamage = Math.min(damage, monster.health)
  const newHealth = Math.max(0, monster.health - damage)
  const isDead = newHealth <= 0

  let newState = {
    ...state,
    monsters: state.monsters.map(m =>
      m.id === targetId ? { ...m, health: newHealth, isDead } : m
    ),
    // 실제 피해만큼 몬스터 정수 획득
    players: state.players.map(p =>
      p.id === attackerId ? { ...p, monsterEssence: p.monsterEssence + actualDamage } : p
    ),
  }

  events.push({
    type: 'PLAYER_ATTACKED',
    attackerId,
    targetId,
    damage,
  })

  if (isDead) {
    events.push({
      type: 'MONSTER_DIED',
      monsterId: targetId,
    })

    // 제물 분배: 막타 절반, 나머지 인접 순환
    newState = distributeMonsterSacrifice(newState, monster, attackerId)
  }

  return { newState, events }
}

/**
 * 몬스터 제물 분배
 * 막타: 절반
 * 나머지: 인접한 플레이어에게 순환 분배
 */
function distributeMonsterSacrifice(
  state: GameState,
  monster: Monster,
  killerId: string
): GameState {
  // 제물 총량은 몬스터의 최대 체력 기반 (예: maxHealth / 10)
  const totalSacrifice = Math.floor(monster.maxHealth / 10)
  const killerShare = Math.ceil(totalSacrifice / 2)
  const remaining = totalSacrifice - killerShare

  let newState = {
    ...state,
    players: state.players.map(p =>
      p.id === killerId
        ? { ...p, monsterEssence: p.monsterEssence + killerShare }
        : p
    ),
  }

  if (remaining > 0) {
    // 인접한 플레이어 찾기
    const adjacentPlayers = state.players.filter(p =>
      !p.isDead && p.id !== killerId && getDistance(monster.position, p.position) === 1
    )

    if (adjacentPlayers.length > 0) {
      const sharePerPlayer = Math.floor(remaining / adjacentPlayers.length)
      if (sharePerPlayer > 0) {
        newState = {
          ...newState,
          players: newState.players.map(p => {
            if (adjacentPlayers.some(ap => ap.id === p.id)) {
              return { ...p, monsterEssence: p.monsterEssence + sharePerPlayer }
            }
            return p
          }),
        }
      }
    }
  }

  return newState
}

/**
 * 마을에서 회복
 */
export function healAtVillage(
  state: GameState,
  playerId: string
): { newState: GameState; healAmount: number } {
  const player = state.players.find(p => p.id === playerId)
  if (!player) {
    return { newState: state, healAmount: 0 }
  }

  const board = deserializeBoard(state.board)
  const tile = getTile(board, player.position)

  if (!tile || tile.type !== 'village') {
    return { newState: state, healAmount: 0 }
  }

  // 자기 직업 마을: 10, 타 직업 마을: 5
  const healAmount = tile.villageClass === player.heroClass
    ? TILE_EFFECTS.village.selfClassHeal
    : TILE_EFFECTS.village.otherClassHeal

  const newHealth = Math.min(player.maxHealth, player.health + healAmount)
  const actualHeal = newHealth - player.health

  const newState = {
    ...state,
    players: state.players.map(p =>
      p.id === playerId ? { ...p, health: newHealth } : p
    ),
  }

  return { newState, healAmount: actualHeal }
}

/**
 * 화염 타일 피해 계산 및 적용
 */
export function applyFireTileDamage(
  state: GameState,
  playerId: string
): { newState: GameState; damage: number; events: GameEvent[] } {
  const player = state.players.find(p => p.id === playerId)
  if (!player) {
    return { newState: state, damage: 0, events: [] }
  }

  const board = deserializeBoard(state.board)
  const tile = getTile(board, player.position)

  if (!tile || tile.type !== 'fire') {
    return { newState: state, damage: 0, events: [] }
  }

  // 타락 용사는 화염 면역
  if (player.state === 'corrupt') {
    return { newState: state, damage: 0, events: [] }
  }

  // 피해 = 10 - 타락 수치 (타락 주사위)
  const corruptValue = player.corruptDice ?? 0
  const damage = Math.max(0, TILE_EFFECTS.fire.baseDamage - corruptValue)

  if (damage <= 0) {
    return { newState: state, damage: 0, events: [] }
  }

  const result = applyDamageToPlayer(state, playerId, damage)
  return { ...result, damage }
}

/**
 * 신전/마왕성 진입 피해 (상태에 따라)
 */
export function applyTileEntryDamage(
  state: GameState,
  playerId: string,
  tileType: TileType
): { newState: GameState; damage: number; events: GameEvent[] } {
  const player = state.players.find(p => p.id === playerId)
  if (!player) {
    return { newState: state, damage: 0, events: [] }
  }

  let damage = 0

  if (tileType === 'temple' && player.state === 'corrupt') {
    // 타락 용사가 신전 진입 (마검 있을 때만 가능)
    damage = TILE_EFFECTS.temple.corruptDamage
  } else if (tileType === 'castle' && player.state === 'holy') {
    // 신성 용사가 마왕성 진입
    damage = TILE_EFFECTS.castle.holyDamage
  }

  if (damage <= 0) {
    return { newState: state, damage: 0, events: [] }
  }

  const result = applyDamageToPlayer(state, playerId, damage)
  return { ...result, damage }
}
