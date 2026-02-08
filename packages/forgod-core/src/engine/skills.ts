import type { GameState, Player, HexCoord, GameEvent } from '../types'
import { coordToKey, deserializeBoard } from '../types'
import { getDistance, getTile, getNeighbors, coordEquals, getDirection, moveInDirection } from '../hex'
import { ALL_SKILLS } from '../constants'

export interface SkillResult {
  success: boolean
  newState: GameState
  message: string
  events: GameEvent[]
}

/**
 * 스킬을 사용할 수 있는지 검사
 */
export function canUseSkill(
  state: GameState,
  player: Player,
  skillId: string,
  targetId?: string,
  position?: HexCoord
): { canUse: boolean; reason?: string } {
  const skill = ALL_SKILLS.find(s => s.id === skillId)
  if (!skill) {
    return { canUse: false, reason: '존재하지 않는 스킬입니다.' }
  }

  // 직업 확인
  if (skill.heroClass !== player.heroClass) {
    return { canUse: false, reason: '해당 직업의 스킬이 아닙니다.' }
  }

  // 쿨다운 확인
  const cooldown = player.skillCooldowns[skillId] ?? 0
  if (cooldown > 0) {
    return { canUse: false, reason: `스킬 재사용 대기 중 (${cooldown}턴)` }
  }

  // 지능 확인 (이번 턴에 사용한 스킬 비용 + 새 스킬 비용 <= 지능)
  const intelligence = player.stats.intelligence[0] + player.stats.intelligence[1]
  const totalCostAfterUse = player.usedSkillCost + skill.cost
  if (totalCostAfterUse > intelligence) {
    const remainingCost = intelligence - player.usedSkillCost
    return {
      canUse: false,
      reason: `스킬 비용이 부족합니다. (필요: ${skill.cost}, 남은 비용: ${remainingCost}, 지능: ${intelligence})`,
    }
  }

  return { canUse: true }
}

/**
 * 현재 턴의 플레이어를 반환합니다 (몬스터 턴이면 null).
 */
function getCurrentPlayer(state: GameState): Player | null {
  const turnEntry = state.roundTurnOrder[state.currentTurnIndex]
  if (turnEntry === 'monster') return null
  return state.players.find(p => p.id === turnEntry) ?? null
}

/**
 * 스킬 사용 처리
 */
export function useSkill(
  state: GameState,
  skillId: string,
  targetId?: string,
  position?: HexCoord
): SkillResult {
  const currentPlayer = getCurrentPlayer(state)

  if (!currentPlayer) {
    return {
      success: false,
      newState: state,
      message: '몬스터 턴에는 스킬을 사용할 수 없습니다.',
      events: [],
    }
  }

  const skill = ALL_SKILLS.find(s => s.id === skillId)

  if (!skill) {
    return {
      success: false,
      newState: state,
      message: '존재하지 않는 스킬입니다.',
      events: [],
    }
  }

  const canUse = canUseSkill(state, currentPlayer, skillId, targetId, position)
  if (!canUse.canUse) {
    return {
      success: false,
      newState: state,
      message: canUse.reason || '스킬을 사용할 수 없습니다.',
      events: [],
    }
  }

  // 직업별 스킬 효과 처리
  switch (skillId) {
    // ===== 전사 스킬 =====
    case 'warrior-charge':
      return handleWarriorCharge(state, currentPlayer, targetId)
    case 'warrior-power-strike':
      return handleWarriorPowerStrike(state, currentPlayer, targetId)
    case 'warrior-throw':
      return handleWarriorThrow(state, currentPlayer, targetId, position)
    case 'warrior-iron-stance':
      return handleWarriorIronStance(state, currentPlayer)
    case 'warrior-sword-wave':
      return handleWarriorSwordWave(state, currentPlayer, position)

    // ===== 도적 스킬 =====
    case 'rogue-poison':
      return handleRoguePoison(state, currentPlayer)
    case 'rogue-shadow-trap':
      return handleRogueShadowTrap(state, currentPlayer)
    case 'rogue-backstab':
      return handleRogueBackstab(state, currentPlayer, targetId)
    case 'rogue-stealth':
      return handleRogueStealth(state, currentPlayer)
    case 'rogue-shuriken':
      return handleRogueShuriken(state, currentPlayer, position)

    // ===== 법사 스킬 =====
    case 'mage-enhance':
      return handleMageEnhance(state, currentPlayer)
    case 'mage-magic-arrow':
      return handleMageMagicArrow(state, currentPlayer, targetId)
    case 'mage-clone':
      return handleMageClone(state, currentPlayer)
    case 'mage-burst':
      return handleMageBurst(state, currentPlayer)
    case 'mage-meteor':
      return handleMageMeteor(state, currentPlayer, position)

    default:
      return {
        success: false,
        newState: state,
        message: '스킬 효과가 구현되지 않았습니다.',
        events: [],
      }
  }
}

/**
 * 스킬 사용 후 쿨다운 및 비용 적용
 * skillId로 ALL_SKILLS에서 cost와 cooldown을 자동으로 조회합니다.
 */
function applySkillUsage(state: GameState, playerId: string, skillId: string): GameState {
  const skill = ALL_SKILLS.find(s => s.id === skillId)
  if (!skill) return state

  return {
    ...state,
    players: state.players.map(p =>
      p.id === playerId
        ? {
            ...p,
            skillCooldowns: { ...p.skillCooldowns, [skillId]: skill.cooldown },
            usedSkillCost: p.usedSkillCost + skill.cost,
          }
        : p
    ),
  }
}

/**
 * 능력치 합계 계산
 */
function getStatTotal(stat: [number, number]): number {
  return stat[0] + stat[1]
}

// ===== 전사 스킬 =====

/**
 * 돌진 (warrior-charge): 2칸 떨어진 대상에 근접한다. 원하는 스킬의 쿨을 1 줄인다.
 */
function handleWarriorCharge(state: GameState, player: Player, targetId?: string): SkillResult {
  if (!targetId) {
    return { success: false, newState: state, message: '대상을 지정해야 합니다.', events: [] }
  }

  const target = state.players.find(p => p.id === targetId) ?? state.monsters.find(m => m.id === targetId)
  if (!target) {
    return { success: false, newState: state, message: '대상을 찾을 수 없습니다.', events: [] }
  }

  const targetPosition = target.position
  const distance = getDistance(player.position, targetPosition)

  if (distance !== 2) {
    return { success: false, newState: state, message: '2칸 떨어진 대상만 선택할 수 있습니다.', events: [] }
  }

  // 대상에게 인접한 위치 찾기
  const board = deserializeBoard(state.board)
  const neighbors = getNeighbors(targetPosition)
  let newPosition: HexCoord | null = null

  for (const neighbor of neighbors) {
    const tile = getTile(board, neighbor)
    if (tile && tile.type !== 'mountain' && tile.type !== 'lake' && tile.type !== 'monster') {
      // 다른 플레이어가 없는지 확인
      const occupied = state.players.some(p => !p.isDead && coordEquals(p.position, neighbor))
      if (!occupied) {
        newPosition = neighbor
        break
      }
    }
  }

  if (!newPosition) {
    return { success: false, newState: state, message: '대상에게 접근할 수 있는 타일이 없습니다.', events: [] }
  }

  const events: GameEvent[] = []
  let newState = applySkillUsage(state, player.id, 'warrior-charge')

  // 위치 이동
  newState = {
    ...newState,
    players: newState.players.map(p =>
      p.id === player.id ? { ...p, position: newPosition! } : p
    ),
  }
  events.push({ type: 'PLAYER_MOVED', playerId: player.id, from: player.position, to: newPosition })

  // TODO: 스킬 쿨다운 감소 선택 UI 필요 (일단 자동으로 첫 번째 쿨다운 중인 스킬 감소)
  const cooldownSkillId = Object.keys(player.skillCooldowns).find(
    sid => player.skillCooldowns[sid] > 0
  )
  if (cooldownSkillId) {
    newState = {
      ...newState,
      players: newState.players.map(p =>
        p.id === player.id
          ? {
              ...p,
              skillCooldowns: {
                ...p.skillCooldowns,
                [cooldownSkillId]: Math.max(0, p.skillCooldowns[cooldownSkillId] - 1),
              },
            }
          : p
      ),
    }
  }

  return {
    success: true,
    newState,
    message: `돌진! 대상에게 접근했습니다.${cooldownSkillId ? ' 스킬 쿨다운이 1 감소했습니다.' : ''}`,
    events,
  }
}

/**
 * 일격 필살 (warrior-power-strike): 기본 공격의 피해에 힘 수치를 더한다.
 */
function handleWarriorPowerStrike(state: GameState, player: Player, targetId?: string): SkillResult {
  if (!targetId) {
    return { success: false, newState: state, message: '대상을 지정해야 합니다.', events: [] }
  }

  const target = state.players.find(p => p.id === targetId) ?? state.monsters.find(m => m.id === targetId)
  if (!target) {
    return { success: false, newState: state, message: '대상을 찾을 수 없습니다.', events: [] }
  }

  const targetPosition = target.position
  if (getDistance(player.position, targetPosition) !== 1) {
    return { success: false, newState: state, message: '인접한 대상만 공격할 수 있습니다.', events: [] }
  }

  // 피해 = 힘(주사위 합) + 힘(주사위 합) = 힘 x 2
  const strengthTotal = getStatTotal(player.stats.strength)
  const damage = strengthTotal * 2

  const events: GameEvent[] = []
  let newState = applySkillUsage(state, player.id, 'warrior-power-strike')

  if ('heroClass' in target) {
    // 플레이어 대상
    const newHealth = Math.max(0, target.health - damage)
    const isDead = newHealth <= 0

    newState = {
      ...newState,
      players: newState.players.map(p =>
        p.id === targetId
          ? { ...p, health: newHealth, isDead, deathTurnsRemaining: isDead ? 3 : p.deathTurnsRemaining }
          : p
      ),
    }

    events.push({ type: 'PLAYER_ATTACKED', attackerId: player.id, targetId, damage })
    if (isDead) events.push({ type: 'PLAYER_DIED', playerId: targetId })
  } else {
    // 몬스터 대상
    const actualDamage = Math.min(damage, target.health)
    const newHealth = Math.max(0, target.health - damage)
    const isDead = newHealth <= 0

    newState = {
      ...newState,
      monsters: newState.monsters.map(m =>
        m.id === targetId ? { ...m, health: newHealth, isDead } : m
      ),
      players: newState.players.map(p =>
        p.id === player.id ? { ...p, monsterEssence: p.monsterEssence + actualDamage } : p
      ),
    }

    events.push({ type: 'PLAYER_ATTACKED', attackerId: player.id, targetId, damage })
    if (isDead) events.push({ type: 'MONSTER_DIED', monsterId: targetId })
  }

  return {
    success: true,
    newState,
    message: `일격 필살! ${damage}의 피해를 입혔습니다.`,
    events,
  }
}

/**
 * 던져버리기 (warrior-throw): 대상을 최대 2칸 던진다. 산에다 던지면 힘 피해를 준다.
 */
function handleWarriorThrow(
  state: GameState,
  player: Player,
  targetId?: string,
  position?: HexCoord
): SkillResult {
  if (!targetId) {
    return { success: false, newState: state, message: '대상을 지정해야 합니다.', events: [] }
  }

  const target = state.players.find(p => p.id === targetId)
  if (!target) {
    return { success: false, newState: state, message: '플레이어만 던질 수 있습니다.', events: [] }
  }

  if (getDistance(player.position, target.position) !== 1) {
    return { success: false, newState: state, message: '인접한 대상만 던질 수 있습니다.', events: [] }
  }

  if (!position) {
    return { success: false, newState: state, message: '던질 위치를 지정해야 합니다.', events: [] }
  }

  if (getDistance(player.position, position) > 2) {
    return { success: false, newState: state, message: '최대 2칸까지만 던질 수 있습니다.', events: [] }
  }

  const board = deserializeBoard(state.board)
  const targetTile = getTile(board, position)

  if (!targetTile) {
    return { success: false, newState: state, message: '존재하지 않는 타일입니다.', events: [] }
  }

  let newState = applySkillUsage(state, player.id, 'warrior-throw')
  const events: GameEvent[] = []
  let extraDamage = 0

  // 산에 던지면 힘 피해
  if (targetTile.type === 'mountain') {
    extraDamage = getStatTotal(player.stats.strength)
    const newHealth = Math.max(0, target.health - extraDamage)
    const isDead = newHealth <= 0

    newState = {
      ...newState,
      players: newState.players.map(p =>
        p.id === targetId
          ? { ...p, health: newHealth, isDead, deathTurnsRemaining: isDead ? 3 : p.deathTurnsRemaining }
          : p
      ),
    }

    if (extraDamage > 0) {
      events.push({ type: 'PLAYER_ATTACKED', attackerId: player.id, targetId, damage: extraDamage })
    }
    if (isDead) events.push({ type: 'PLAYER_DIED', playerId: targetId })
  } else {
    // 정상적인 던지기 (위치 이동)
    newState = {
      ...newState,
      players: newState.players.map(p =>
        p.id === targetId ? { ...p, position } : p
      ),
    }
    events.push({ type: 'PLAYER_MOVED', playerId: targetId, from: target.position, to: position })
  }

  return {
    success: true,
    newState,
    message: extraDamage > 0
      ? `${target.name}을(를) 산에 던져 ${extraDamage}의 피해를 입혔습니다!`
      : `${target.name}을(를) (${position.q}, ${position.r})로 던졌습니다!`,
    events,
  }
}

/**
 * 무적 태세 (warrior-iron-stance): 다음 턴 시작까지 모든 피해를 자신의 힘 수치만큼 감소시킨다.
 */
function handleWarriorIronStance(state: GameState, player: Player): SkillResult {
  let newState = applySkillUsage(state, player.id, 'warrior-iron-stance')

  newState = {
    ...newState,
    players: newState.players.map(p =>
      p.id === player.id ? { ...p, ironStanceActive: true } : p
    ),
  }

  return {
    success: true,
    newState,
    message: `무적 태세! 다음 턴 시작까지 받는 피해가 힘 수치(${getStatTotal(player.stats.strength)})만큼 감소합니다.`,
    events: [],
  }
}

/**
 * 검기 발사 (warrior-sword-wave): 자신의 앞 3칸에 힘 피해를 준다.
 */
function handleWarriorSwordWave(state: GameState, player: Player, position?: HexCoord): SkillResult {
  if (!position) {
    return { success: false, newState: state, message: '방향을 지정해야 합니다.', events: [] }
  }

  // 방향 계산 (position은 방향을 나타내는 인접 타일)
  const direction = getDirection(player.position, position)
  if (direction === null) {
    return { success: false, newState: state, message: '인접한 방향을 지정해야 합니다.', events: [] }
  }

  const damage = getStatTotal(player.stats.strength)
  const events: GameEvent[] = []
  let newState = applySkillUsage(state, player.id, 'warrior-sword-wave')

  // 앞 3칸 계산
  let currentPos = player.position
  const targetPositions: HexCoord[] = []

  for (let i = 0; i < 3; i++) {
    currentPos = moveInDirection(currentPos, direction)
    targetPositions.push(currentPos)
  }

  // 각 위치의 대상에게 피해
  for (const pos of targetPositions) {
    // 플레이어 확인
    for (const target of state.players) {
      if (target.id === player.id || target.isDead) continue
      if (coordEquals(target.position, pos)) {
        const newHealth = Math.max(0, target.health - damage)
        const isDead = newHealth <= 0

        newState = {
          ...newState,
          players: newState.players.map(p =>
            p.id === target.id
              ? { ...p, health: newHealth, isDead, deathTurnsRemaining: isDead ? 3 : p.deathTurnsRemaining }
              : p
          ),
        }

        events.push({ type: 'PLAYER_ATTACKED', attackerId: player.id, targetId: target.id, damage })
        if (isDead) events.push({ type: 'PLAYER_DIED', playerId: target.id })
      }
    }

    // 몬스터 확인
    for (const monster of state.monsters) {
      if (monster.isDead) continue
      if (coordEquals(monster.position, pos)) {
        const actualDamage = Math.min(damage, monster.health)
        const newHealth = Math.max(0, monster.health - damage)
        const isDead = newHealth <= 0

        newState = {
          ...newState,
          monsters: newState.monsters.map(m =>
            m.id === monster.id ? { ...m, health: newHealth, isDead } : m
          ),
          players: newState.players.map(p =>
            p.id === player.id ? { ...p, monsterEssence: p.monsterEssence + actualDamage } : p
          ),
        }

        events.push({ type: 'PLAYER_ATTACKED', attackerId: player.id, targetId: monster.id, damage })
        if (isDead) events.push({ type: 'MONSTER_DIED', monsterId: monster.id })
      }
    }
  }

  return {
    success: true,
    newState,
    message: `검기 발사! 앞 3칸에 ${damage}의 피해를 입혔습니다.`,
    events,
  }
}

// ===== 도적 스킬 =====

/**
 * 독 바르기 (rogue-poison): 다음 기본 공격에 민첩 수치 추가 피해 (사용 후 소모).
 */
function handleRoguePoison(state: GameState, player: Player): SkillResult {
  let newState = applySkillUsage(state, player.id, 'rogue-poison')

  newState = {
    ...newState,
    players: newState.players.map(p =>
      p.id === player.id ? { ...p, poisonActive: true } : p
    ),
  }

  return {
    success: true,
    newState,
    message: `독 바르기! 다음 기본 공격 피해에 민첩 수치(${getStatTotal(player.stats.dexterity)})가 추가됩니다.`,
    events: [],
  }
}

/**
 * 그림자 함정 (rogue-shadow-trap): 현재 위치에 함정 설치 (최대 3개, 초과 시 가장 오래된 것 제거)
 */
function handleRogueShadowTrap(state: GameState, player: Player): SkillResult {
  let newState = applySkillUsage(state, player.id, 'rogue-shadow-trap')

  const currentTraps = [...player.traps]
  currentTraps.push(player.position)
  // 최대 3개, 초과 시 가장 오래된 것 제거
  while (currentTraps.length > 3) {
    currentTraps.shift()
  }

  newState = {
    ...newState,
    players: newState.players.map(p =>
      p.id === player.id ? { ...p, traps: currentTraps } : p
    ),
  }

  return {
    success: true,
    newState,
    message: `그림자 함정! 현재 위치에 함정을 설치했습니다. (함정 ${currentTraps.length}/3)`,
    events: [],
  }
}

/**
 * 배후 일격 (rogue-backstab): 대상의 뒤로 이동하며 민첩 피해를 준다.
 */
function handleRogueBackstab(state: GameState, player: Player, targetId?: string): SkillResult {
  if (!targetId) {
    return { success: false, newState: state, message: '대상을 지정해야 합니다.', events: [] }
  }

  const target = state.players.find(p => p.id === targetId) ?? state.monsters.find(m => m.id === targetId)
  if (!target) {
    return { success: false, newState: state, message: '대상을 찾을 수 없습니다.', events: [] }
  }

  const targetPosition = target.position

  // 대상 뒤편 위치 계산 (플레이어 -> 대상 방향의 반대편)
  const dq = targetPosition.q - player.position.q
  const dr = targetPosition.r - player.position.r
  const behindPosition: HexCoord = { q: targetPosition.q + dq, r: targetPosition.r + dr }

  const board = deserializeBoard(state.board)
  const behindTile = getTile(board, behindPosition)

  // 뒤편 타일이 없거나 이동 불가면 스킬 사용 불가
  const canMoveBehind = behindTile && behindTile.type !== 'mountain' && behindTile.type !== 'lake' && behindTile.type !== 'monster'
  if (!canMoveBehind) {
    return { success: false, newState: state, message: '대상의 뒤로 이동할 수 없습니다.', events: [] }
  }

  // 다른 플레이어가 없는지 확인
  const occupied = state.players.some(p => !p.isDead && p.id !== player.id && coordEquals(p.position, behindPosition))
  if (occupied) {
    return { success: false, newState: state, message: '대상의 뒤에 다른 용사가 있습니다.', events: [] }
  }

  const damage = getStatTotal(player.stats.dexterity)
  const events: GameEvent[] = []
  let newState = applySkillUsage(state, player.id, 'rogue-backstab')

  // 이동 처리
  newState = {
    ...newState,
    players: newState.players.map(p =>
      p.id === player.id ? { ...p, position: behindPosition } : p
    ),
  }
  events.push({ type: 'PLAYER_MOVED', playerId: player.id, from: player.position, to: behindPosition })

  // 피해 처리
  if ('heroClass' in target) {
    const newHealth = Math.max(0, target.health - damage)
    const isDead = newHealth <= 0

    newState = {
      ...newState,
      players: newState.players.map(p =>
        p.id === targetId
          ? { ...p, health: newHealth, isDead, deathTurnsRemaining: isDead ? 3 : p.deathTurnsRemaining }
          : p
      ),
    }

    events.push({ type: 'PLAYER_ATTACKED', attackerId: player.id, targetId, damage })
    if (isDead) events.push({ type: 'PLAYER_DIED', playerId: targetId })
  } else {
    const actualDamage = Math.min(damage, target.health)
    const newHealth = Math.max(0, target.health - damage)
    const isDead = newHealth <= 0

    newState = {
      ...newState,
      monsters: newState.monsters.map(m =>
        m.id === targetId ? { ...m, health: newHealth, isDead } : m
      ),
      players: newState.players.map(p =>
        p.id === player.id ? { ...p, monsterEssence: p.monsterEssence + actualDamage } : p
      ),
    }

    events.push({ type: 'PLAYER_ATTACKED', attackerId: player.id, targetId, damage })
    if (isDead) events.push({ type: 'MONSTER_DIED', monsterId: targetId })
  }

  return {
    success: true,
    newState,
    message: `배후 일격! 대상 뒤로 이동하며 ${damage}의 피해를 입혔습니다.`,
    events,
  }
}

/**
 * 은신 (rogue-stealth): 모든 피해 면역 (몬스터 공격 포함). 본인이 공격하면 해제.
 */
function handleRogueStealth(state: GameState, player: Player): SkillResult {
  let newState = applySkillUsage(state, player.id, 'rogue-stealth')

  newState = {
    ...newState,
    players: newState.players.map(p =>
      p.id === player.id ? { ...p, isStealthed: true } : p
    ),
  }

  return {
    success: true,
    newState,
    message: '은신! 모든 피해에 면역됩니다. 공격하면 해제됩니다.',
    events: [],
  }
}

/**
 * 무한의 표창 (rogue-shuriken): 일직선 상 만나는 첫 대상에게 민첩 피해. 2칸 이상이면 x2
 */
function handleRogueShuriken(state: GameState, player: Player, position?: HexCoord): SkillResult {
  if (!position) {
    return { success: false, newState: state, message: '방향을 지정해야 합니다.', events: [] }
  }

  // 방향 계산
  const direction = getDirection(player.position, position)
  if (direction === null) {
    return { success: false, newState: state, message: '인접한 방향을 지정해야 합니다.', events: [] }
  }

  const board = deserializeBoard(state.board)
  let newState = applySkillUsage(state, player.id, 'rogue-shuriken')
  const events: GameEvent[] = []

  // 일직선으로 첫 대상 찾기
  let currentPos = player.position
  let distance = 0
  let targetFound = false

  while (!targetFound) {
    currentPos = moveInDirection(currentPos, direction)
    distance++

    const tile = getTile(board, currentPos)
    if (!tile) break

    // 산에 가로막히면 중단
    if (tile.type === 'mountain') break

    // 플레이어 확인
    for (const target of state.players) {
      if (target.id === player.id || target.isDead) continue
      if (coordEquals(target.position, currentPos)) {
        const baseDamage = getStatTotal(player.stats.dexterity)
        const damage = distance >= 2 ? baseDamage * 2 : baseDamage
        const newHealth = Math.max(0, target.health - damage)
        const isDead = newHealth <= 0

        newState = {
          ...newState,
          players: newState.players.map(p =>
            p.id === target.id
              ? { ...p, health: newHealth, isDead, deathTurnsRemaining: isDead ? 3 : p.deathTurnsRemaining }
              : p
          ),
        }

        events.push({ type: 'PLAYER_ATTACKED', attackerId: player.id, targetId: target.id, damage })
        if (isDead) events.push({ type: 'PLAYER_DIED', playerId: target.id })
        targetFound = true

        return {
          success: true,
          newState,
          message: `무한의 표창! ${distance}칸 떨어진 ${target.name}에게 ${damage}의 피해를 입혔습니다.`,
          events,
        }
      }
    }

    // 몬스터 확인
    for (const monster of state.monsters) {
      if (monster.isDead) continue
      if (coordEquals(monster.position, currentPos)) {
        const baseDamage = getStatTotal(player.stats.dexterity)
        const damage = distance >= 2 ? baseDamage * 2 : baseDamage
        const actualDamage = Math.min(damage, monster.health)
        const newHealth = Math.max(0, monster.health - damage)
        const isDead = newHealth <= 0

        newState = {
          ...newState,
          monsters: newState.monsters.map(m =>
            m.id === monster.id ? { ...m, health: newHealth, isDead } : m
          ),
          players: newState.players.map(p =>
            p.id === player.id ? { ...p, monsterEssence: p.monsterEssence + actualDamage } : p
          ),
        }

        events.push({ type: 'PLAYER_ATTACKED', attackerId: player.id, targetId: monster.id, damage })
        if (isDead) events.push({ type: 'MONSTER_DIED', monsterId: monster.id })
        targetFound = true

        return {
          success: true,
          newState,
          message: `무한의 표창! ${distance}칸 떨어진 ${monster.name}에게 ${damage}의 피해를 입혔습니다.`,
          events,
        }
      }
    }

    // 너무 멀리 가면 중단 (보드 범위 밖)
    if (distance > 20) break
  }

  return {
    success: true,
    newState,
    message: '무한의 표창! 대상을 찾지 못했습니다.',
    events: [],
  }
}

// ===== 법사 스킬 =====

/**
 * 스킬 강화 (mage-enhance): 다음 1회 스킬만 강화 (사용 후 소모).
 */
function handleMageEnhance(state: GameState, player: Player): SkillResult {
  let newState = applySkillUsage(state, player.id, 'mage-enhance')

  newState = {
    ...newState,
    players: newState.players.map(p =>
      p.id === player.id ? { ...p, isEnhanced: true } : p
    ),
  }

  return {
    success: true,
    newState,
    message: '스킬 강화! 다음 1회 스킬이 강화됩니다.',
    events: [],
  }
}

/**
 * 마법 화살 (mage-magic-arrow): 지능 피해 (용사 대상 사거리 2)
 */
function handleMageMagicArrow(state: GameState, player: Player, targetId?: string): SkillResult {
  if (!targetId) {
    return { success: false, newState: state, message: '대상을 지정해야 합니다.', events: [] }
  }

  const targetPlayer = state.players.find(p => p.id === targetId)
  const targetMonster = state.monsters.find(m => m.id === targetId)

  if (!targetPlayer && !targetMonster) {
    return { success: false, newState: state, message: '대상을 찾을 수 없습니다.', events: [] }
  }

  const targetPosition = targetPlayer?.position ?? targetMonster!.position
  const distance = getDistance(player.position, targetPosition)

  // 용사 대상은 사거리 2, 몬스터는 인접만
  const maxRange = targetPlayer ? 2 : 1
  if (distance > maxRange) {
    return {
      success: false,
      newState: state,
      message: targetPlayer
        ? '용사는 2칸 이내에 있어야 합니다.'
        : '몬스터는 인접해야 합니다.',
      events: [],
    }
  }

  const damage = getStatTotal(player.stats.intelligence)
  const events: GameEvent[] = []
  let newState = applySkillUsage(state, player.id, 'mage-magic-arrow')

  if (targetPlayer) {
    const newHealth = Math.max(0, targetPlayer.health - damage)
    const isDead = newHealth <= 0

    newState = {
      ...newState,
      players: newState.players.map(p =>
        p.id === targetId
          ? { ...p, health: newHealth, isDead, deathTurnsRemaining: isDead ? 3 : p.deathTurnsRemaining }
          : p
      ),
    }

    events.push({ type: 'PLAYER_ATTACKED', attackerId: player.id, targetId, damage })
    if (isDead) events.push({ type: 'PLAYER_DIED', playerId: targetId })
  } else {
    const monster = targetMonster!
    const actualDamage = Math.min(damage, monster.health)
    const newHealth = Math.max(0, monster.health - damage)
    const isDead = newHealth <= 0

    newState = {
      ...newState,
      monsters: newState.monsters.map(m =>
        m.id === targetId ? { ...m, health: newHealth, isDead } : m
      ),
      players: newState.players.map(p =>
        p.id === player.id ? { ...p, monsterEssence: p.monsterEssence + actualDamage } : p
      ),
    }

    events.push({ type: 'PLAYER_ATTACKED', attackerId: player.id, targetId, damage })
    if (isDead) events.push({ type: 'MONSTER_DIED', monsterId: targetId })
  }

  return {
    success: true,
    newState,
    message: `마법 화살! ${damage}의 피해를 입혔습니다.`,
    events,
  }
}

/**
 * 분신 (mage-clone): 현재 위치에 분신 생성 (플레이어당 1개).
 * 강화: 분신 위치로 순간이동 (위치 교환).
 */
function handleMageClone(state: GameState, player: Player): SkillResult {
  let newState = applySkillUsage(state, player.id, 'mage-clone')

  const isEnhanced = player.isEnhanced

  // 강화: 기존 분신이 있으면 위치 교환
  const existingClone = state.clones.find(c => c.playerId === player.id)
  if (isEnhanced && existingClone) {
    const clonePosition = existingClone.position
    const playerPosition = player.position

    // 분신 위치로 순간이동 (위치 교환)
    newState = {
      ...newState,
      players: newState.players.map(p =>
        p.id === player.id ? { ...p, position: clonePosition, isEnhanced: false } : p
      ),
      clones: newState.clones.map(c =>
        c.playerId === player.id ? { ...c, position: playerPosition } : c
      ),
    }

    return {
      success: true,
      newState,
      message: `강화 분신! 분신과 위치를 교환했습니다.`,
      events: [
        { type: 'PLAYER_MOVED', playerId: player.id, from: playerPosition, to: clonePosition },
      ],
    }
  }

  // 기존 분신 제거 후 새 분신 생성
  const newClones = state.clones.filter(c => c.playerId !== player.id)
  newClones.push({ playerId: player.id, position: player.position })

  newState = {
    ...newState,
    clones: newClones,
    players: newState.players.map(p =>
      p.id === player.id && isEnhanced ? { ...p, isEnhanced: false } : p
    ),
  }

  return {
    success: true,
    newState,
    message: `분신! 현재 위치에 분신을 생성했습니다. (지능 ${getStatTotal(player.stats.intelligence)} 이상 피해 시 사라짐)`,
    events: [],
  }
}

/**
 * 마력 방출 (mage-burst): 자신의 주변 범위 1에 있는 모두에게 지능 피해
 */
function handleMageBurst(state: GameState, player: Player): SkillResult {
  const damage = getStatTotal(player.stats.intelligence)
  const events: GameEvent[] = []
  let newState = applySkillUsage(state, player.id, 'mage-burst')

  const neighbors = getNeighbors(player.position)

  // 인접한 모든 대상에게 피해
  for (const pos of neighbors) {
    // 플레이어 확인
    for (const target of state.players) {
      if (target.id === player.id || target.isDead) continue
      if (coordEquals(target.position, pos)) {
        const newHealth = Math.max(0, target.health - damage)
        const isDead = newHealth <= 0

        newState = {
          ...newState,
          players: newState.players.map(p =>
            p.id === target.id
              ? { ...p, health: newHealth, isDead, deathTurnsRemaining: isDead ? 3 : p.deathTurnsRemaining }
              : p
          ),
        }

        events.push({ type: 'PLAYER_ATTACKED', attackerId: player.id, targetId: target.id, damage })
        if (isDead) events.push({ type: 'PLAYER_DIED', playerId: target.id })
      }
    }

    // 몬스터 확인
    for (const monster of state.monsters) {
      if (monster.isDead) continue
      if (coordEquals(monster.position, pos)) {
        const actualDamage = Math.min(damage, monster.health)
        const newHealth = Math.max(0, monster.health - damage)
        const isDead = newHealth <= 0

        newState = {
          ...newState,
          monsters: newState.monsters.map(m =>
            m.id === monster.id ? { ...m, health: newHealth, isDead } : m
          ),
          players: newState.players.map(p =>
            p.id === player.id ? { ...p, monsterEssence: p.monsterEssence + actualDamage } : p
          ),
        }

        events.push({ type: 'PLAYER_ATTACKED', attackerId: player.id, targetId: monster.id, damage })
        if (isDead) events.push({ type: 'MONSTER_DIED', monsterId: monster.id })
      }
    }
  }

  return {
    success: true,
    newState,
    message: `마력 방출! 주변 1칸에 ${damage}의 피해를 입혔습니다.`,
    events,
  }
}

/**
 * 메테오 (mage-meteor): 원하는 타일에 지능 피해. 강화: 지능×2 피해
 */
function handleMageMeteor(state: GameState, player: Player, position?: HexCoord): SkillResult {
  if (!position) {
    return { success: false, newState: state, message: '위치를 지정해야 합니다.', events: [] }
  }

  const board = deserializeBoard(state.board)
  const tile = getTile(board, position)

  if (!tile) {
    return { success: false, newState: state, message: '존재하지 않는 타일입니다.', events: [] }
  }

  // 몬스터 메테오 면역 체크
  if (state.monsterRoundBuffs.meteorImmune) {
    // 몬스터에게는 피해를 주지 않음 (플레이어에게는 가능)
  }

  const isEnhanced = player.isEnhanced
  const baseDamage = getStatTotal(player.stats.intelligence)
  const damage = isEnhanced ? baseDamage * 2 : baseDamage
  const events: GameEvent[] = []
  let newState = applySkillUsage(state, player.id, 'mage-meteor')

  // 해당 위치의 모든 대상에게 피해
  // 플레이어
  for (const target of state.players) {
    if (target.isDead) continue
    if (coordEquals(target.position, position)) {
      const newHealth = Math.max(0, target.health - damage)
      const isDead = newHealth <= 0

      newState = {
        ...newState,
        players: newState.players.map(p =>
          p.id === target.id
            ? { ...p, health: newHealth, isDead, deathTurnsRemaining: isDead ? 3 : p.deathTurnsRemaining }
            : p
        ),
      }

      events.push({ type: 'PLAYER_ATTACKED', attackerId: player.id, targetId: target.id, damage })
      if (isDead) events.push({ type: 'PLAYER_DIED', playerId: target.id })
    }
  }

  // 몬스터 (메테오 면역이면 몬스터에게 피해 무시)
  if (!state.monsterRoundBuffs.meteorImmune) {
    for (const monster of state.monsters) {
      if (monster.isDead) continue
      if (coordEquals(monster.position, position)) {
        const actualDamage = Math.min(damage, monster.health)
        const newHealth = Math.max(0, monster.health - damage)
        const isDead = newHealth <= 0

        newState = {
          ...newState,
          monsters: newState.monsters.map(m =>
            m.id === monster.id ? { ...m, health: newHealth, isDead } : m
          ),
          players: newState.players.map(p =>
            p.id === player.id ? { ...p, monsterEssence: p.monsterEssence + actualDamage } : p
          ),
        }

        events.push({ type: 'PLAYER_ATTACKED', attackerId: player.id, targetId: monster.id, damage })
        if (isDead) events.push({ type: 'MONSTER_DIED', monsterId: monster.id })
      }
    }
  }

  // 강화 소모
  if (isEnhanced) {
    newState = {
      ...newState,
      players: newState.players.map(p =>
        p.id === player.id ? { ...p, isEnhanced: false } : p
      ),
    }
  }

  return {
    success: true,
    newState,
    message: `${isEnhanced ? '강화 ' : ''}메테오! (${position.q}, ${position.r})에 ${damage}의 피해를 입혔습니다.`,
    events,
  }
}
