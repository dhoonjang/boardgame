import type { DiceRoller, GameState, HexCoord, Player, Stats } from '../types'
import type { GameEngine } from '../engine/game-engine'
import { getNeighbors, getDistance, coordEquals } from '../hex'
import { GAME_BOARD, TERRAIN_MOVEMENT_COST } from '../constants'

/**
 * MockDiceRoller - 테스트용 주사위 제어
 *
 * 주사위 굴림 결과를 미리 설정하여 결정론적 테스트를 가능하게 합니다.
 */
export class MockDiceRoller implements DiceRoller {
  private queue: number[] = []
  private defaultValue: number = 3  // 큐가 비었을 때 기본값

  /**
   * 다음 주사위 굴림 결과들을 설정합니다.
   * 순서대로 소비됩니다.
   */
  setNextRolls(rolls: number[]): void {
    this.queue.push(...rolls)
  }

  /**
   * 큐가 비었을 때 사용할 기본값을 설정합니다.
   */
  setDefaultValue(value: number): void {
    this.defaultValue = value
  }

  /**
   * 큐를 비웁니다.
   */
  clear(): void {
    this.queue = []
  }

  /**
   * 큐에 남은 롤 수를 반환합니다.
   */
  get remainingRolls(): number {
    return this.queue.length
  }

  roll1d6(): number {
    if (this.queue.length > 0) {
      return this.queue.shift()!
    }
    return this.defaultValue
  }

  roll2d6(): [number, number] {
    return [this.roll1d6(), this.roll1d6()]
  }
}

/**
 * 플레이어의 턴을 action 페이즈까지 진행합니다.
 * 이동 주사위를 굴리고 즉시 이동 페이즈를 종료합니다.
 */
export function skipToActionPhase(
  engine: GameEngine,
  state: GameState,
): GameState {
  let currentState = state
  const currentPlayer = engine.getCurrentPlayer(currentState)

  if (!currentPlayer) {
    throw new Error('몬스터 턴에는 skipToActionPhase를 사용할 수 없습니다.')
  }

  // 아직 주사위를 굴리지 않았으면 굴림
  if (currentPlayer.remainingMovement === null) {
    const rollResult = engine.executeAction(currentState, { type: 'ROLL_MOVE_DICE' })
    if (!rollResult.success) {
      throw new Error(`주사위 굴림 실패: ${rollResult.message}`)
    }
    currentState = rollResult.newState
  }

  // 이동 페이즈면 action으로 전환
  const updatedPlayer = currentState.players.find(p => p.id === currentPlayer.id)!
  if (updatedPlayer.turnPhase === 'move') {
    const endMoveResult = engine.executeAction(currentState, { type: 'END_MOVE_PHASE' })
    if (!endMoveResult.success) {
      throw new Error(`이동 페이즈 종료 실패: ${endMoveResult.message}`)
    }
    currentState = endMoveResult.newState
  }

  return currentState
}

/**
 * 현재 플레이어의 턴을 완료하고 다음 턴으로 넘깁니다.
 */
export function completeTurn(
  engine: GameEngine,
  state: GameState,
): GameState {
  let currentState = skipToActionPhase(engine, state)

  const endTurnResult = engine.executeAction(currentState, { type: 'END_TURN' })
  if (!endTurnResult.success) {
    throw new Error(`턴 종료 실패: ${endTurnResult.message}`)
  }

  return endTurnResult.newState
}

/**
 * 특정 플레이어의 턴이 될 때까지 다른 플레이어들의 턴을 스킵합니다.
 */
export function advanceToPlayerTurn(
  engine: GameEngine,
  state: GameState,
  targetPlayerId: string,
): GameState {
  let currentState = state
  let iterations = 0
  const maxIterations = 100 // 무한루프 방지

  while (iterations < maxIterations) {
    const currentEntry = engine.getCurrentTurnEntry(currentState)

    // 목표 플레이어의 턴이면 종료
    if (currentEntry === targetPlayerId) {
      return currentState
    }

    // 몬스터 턴이 아닌 경우에만 턴 완료
    if (currentEntry !== 'monster') {
      currentState = completeTurn(engine, currentState)
    } else {
      // 몬스터 턴은 handleEndTurn에서 자동 처리되므로 여기선 발생하지 않아야 함
      throw new Error('예상치 못한 몬스터 턴 도달')
    }

    iterations++
  }

  throw new Error(`${targetPlayerId}의 턴에 도달하지 못했습니다.`)
}

/**
 * 플레이어를 목표 위치로 이동시킵니다.
 * 여러 턴에 걸쳐 이동할 수 있습니다.
 *
 * 주의: MockDiceRoller에 충분한 이동력을 설정해야 합니다.
 */
export function movePlayerToPosition(
  engine: GameEngine,
  state: GameState,
  playerId: string,
  targetPosition: HexCoord,
): GameState {
  let currentState = state
  let iterations = 0
  const maxIterations = 100

  while (iterations < maxIterations) {
    // 플레이어의 턴으로 이동
    currentState = advanceToPlayerTurn(engine, currentState, playerId)

    const player = currentState.players.find(p => p.id === playerId)!

    // 이미 목표 위치에 있으면 종료
    if (coordEquals(player.position, targetPosition)) {
      return currentState
    }

    // 이동 주사위 굴리기
    if (player.remainingMovement === null) {
      const rollResult = engine.executeAction(currentState, { type: 'ROLL_MOVE_DICE' })
      if (!rollResult.success) {
        throw new Error(`주사위 굴림 실패: ${rollResult.message}`)
      }
      currentState = rollResult.newState
    }

    // 목표 위치까지 경로 찾아서 이동
    const updatedPlayer = currentState.players.find(p => p.id === playerId)!
    const path = findPath(updatedPlayer.position, targetPosition)

    if (path.length === 0) {
      throw new Error(`${JSON.stringify(updatedPlayer.position)}에서 ${JSON.stringify(targetPosition)}로 가는 경로가 없습니다.`)
    }

    // 이동력 내에서 최대한 이동
    let moveResult = { success: true, newState: currentState, message: '', events: [] as any[] }
    for (const nextPos of path) {
      const playerNow = moveResult.newState.players.find(p => p.id === playerId)!
      if (playerNow.remainingMovement === null || playerNow.remainingMovement <= 0) {
        break
      }
      if (coordEquals(playerNow.position, targetPosition)) {
        break
      }

      moveResult = engine.executeAction(moveResult.newState, { type: 'MOVE', position: nextPos })
      if (!moveResult.success) {
        // 이동 실패 시 (이동력 부족 등) 이동 중단
        break
      }
    }

    currentState = moveResult.newState

    // 목표 도달 확인
    const finalPlayer = currentState.players.find(p => p.id === playerId)!
    if (coordEquals(finalPlayer.position, targetPosition)) {
      return currentState
    }

    // 턴 종료하고 다음 라운드로
    currentState = completeTurn(engine, currentState)
    iterations++
  }

  throw new Error(`${maxIterations}턴 내에 목표 위치에 도달하지 못했습니다.`)
}

/**
 * 두 좌표 사이의 경로를 찾습니다 (BFS).
 * 시작 좌표는 포함하지 않습니다.
 */
export function findPath(from: HexCoord, to: HexCoord): HexCoord[] {
  if (coordEquals(from, to)) {
    return []
  }

  // BFS를 사용한 경로 탐색
  const visited = new Set<string>()
  const queue: { coord: HexCoord; path: HexCoord[] }[] = [{ coord: from, path: [] }]
  visited.add(`${from.q},${from.r}`)

  while (queue.length > 0) {
    const { coord, path } = queue.shift()!

    for (const neighbor of getNeighbors(coord)) {
      const key = `${neighbor.q},${neighbor.r}`
      if (visited.has(key)) continue

      // 이동 가능한 타일인지 확인
      const tile = GAME_BOARD.find(t => t.coord.q === neighbor.q && t.coord.r === neighbor.r)
      if (!tile) continue

      const moveCost = TERRAIN_MOVEMENT_COST[tile.type]
      if (moveCost === 'blocked') continue

      const newPath = [...path, neighbor]

      if (coordEquals(neighbor, to)) {
        return newPath
      }

      visited.add(key)
      queue.push({ coord: neighbor, path: newPath })
    }
  }

  return [] // 경로 없음
}

/**
 * 공격자가 대상을 반복 공격하여 처치합니다.
 * 여러 턴에 걸쳐 공격할 수 있습니다.
 *
 * @returns 대상이 사망한 후의 상태
 */
export function executeLethalAttack(
  engine: GameEngine,
  state: GameState,
  attackerId: string,
  targetId: string,
): GameState {
  let currentState = state
  let iterations = 0
  const maxIterations = 100

  while (iterations < maxIterations) {
    // 공격자의 턴으로 이동
    currentState = advanceToPlayerTurn(engine, currentState, attackerId)

    const attacker = currentState.players.find(p => p.id === attackerId)!
    const target = currentState.players.find(p => p.id === targetId) ??
                  currentState.monsters.find(m => m.id === targetId)

    if (!target) {
      throw new Error(`대상 ${targetId}을(를) 찾을 수 없습니다.`)
    }

    // 대상이 이미 사망했으면 종료
    if ('isDead' in target && target.isDead) {
      return currentState
    }

    // action 페이즈로 이동
    currentState = skipToActionPhase(engine, currentState)

    // 인접한지 확인
    const targetPosition = target.position
    const distance = getDistance(attacker.position, targetPosition)

    if (distance !== 1) {
      // 인접하지 않으면 먼저 인접 위치로 이동 필요
      // 대상 주변의 이동 가능한 타일 찾기
      const adjacentTiles = getNeighbors(targetPosition).filter(pos => {
        const tile = GAME_BOARD.find(t => t.coord.q === pos.q && t.coord.r === pos.r)
        if (!tile) return false
        const cost = TERRAIN_MOVEMENT_COST[tile.type]
        return cost !== 'blocked'
      })

      if (adjacentTiles.length === 0) {
        throw new Error('대상에게 접근할 수 있는 타일이 없습니다.')
      }

      // 가장 가까운 인접 타일로 이동
      currentState = movePlayerToPosition(engine, currentState, attackerId, adjacentTiles[0])

      // 다시 공격자 턴으로 이동
      currentState = advanceToPlayerTurn(engine, currentState, attackerId)
      currentState = skipToActionPhase(engine, currentState)
    }

    // 공격 실행
    const attackResult = engine.executeAction(currentState, { type: 'BASIC_ATTACK', targetId })
    if (!attackResult.success) {
      throw new Error(`공격 실패: ${attackResult.message}`)
    }
    currentState = attackResult.newState

    // 대상 사망 확인
    const targetAfter = currentState.players.find(p => p.id === targetId) ??
                       currentState.monsters.find(m => m.id === targetId)

    if (targetAfter && 'isDead' in targetAfter && targetAfter.isDead) {
      return currentState
    }

    // 턴 종료
    currentState = engine.executeAction(currentState, { type: 'END_TURN' }).newState
    iterations++
  }

  throw new Error(`${maxIterations}턴 내에 대상을 처치하지 못했습니다.`)
}

/**
 * 몬스터를 반복 공격하여 정수를 획득합니다.
 *
 * @param targetEssence 목표 정수량
 * @returns 충분한 정수를 획득한 후의 상태
 */
export function gatherMonsterEssence(
  engine: GameEngine,
  state: GameState,
  playerId: string,
  targetEssence: number,
): GameState {
  let currentState = state
  let iterations = 0
  const maxIterations = 100

  while (iterations < maxIterations) {
    const player = currentState.players.find(p => p.id === playerId)!

    // 목표 정수량에 도달하면 종료
    if (player.monsterEssence >= targetEssence) {
      return currentState
    }

    // 플레이어 턴으로 이동
    currentState = advanceToPlayerTurn(engine, currentState, playerId)

    // 살아있는 몬스터 찾기
    const aliveMonsters = currentState.monsters.filter(m => !m.isDead)
    if (aliveMonsters.length === 0) {
      throw new Error('살아있는 몬스터가 없습니다.')
    }

    // 가장 가까운 몬스터 찾기
    const currentPlayer = currentState.players.find(p => p.id === playerId)!
    const nearestMonster = aliveMonsters.reduce((nearest, monster) => {
      const distToNearest = getDistance(currentPlayer.position, nearest.position)
      const distToMonster = getDistance(currentPlayer.position, monster.position)
      return distToMonster < distToNearest ? monster : nearest
    })

    // 몬스터 주변 인접 타일 찾기
    const adjacentTiles = getNeighbors(nearestMonster.position).filter(pos => {
      const tile = GAME_BOARD.find(t => t.coord.q === pos.q && t.coord.r === pos.r)
      if (!tile) return false
      const cost = TERRAIN_MOVEMENT_COST[tile.type]
      return cost !== 'blocked'
    })

    if (adjacentTiles.length === 0) {
      throw new Error(`몬스터 ${nearestMonster.name}에게 접근할 수 있는 타일이 없습니다.`)
    }

    // 이미 인접한지 확인
    const isAdjacent = getDistance(currentPlayer.position, nearestMonster.position) === 1

    if (!isAdjacent) {
      // 몬스터 인접 위치로 이동
      currentState = movePlayerToPosition(engine, currentState, playerId, adjacentTiles[0])
      currentState = advanceToPlayerTurn(engine, currentState, playerId)
    }

    // action 페이즈로 이동
    currentState = skipToActionPhase(engine, currentState)

    // 몬스터 공격
    const attackResult = engine.executeAction(currentState, { type: 'BASIC_ATTACK', targetId: nearestMonster.id })
    if (!attackResult.success) {
      // 공격 실패 시 턴 종료하고 다시 시도
      currentState = engine.executeAction(currentState, { type: 'END_TURN' }).newState
      iterations++
      continue
    }
    currentState = attackResult.newState

    // 턴 종료
    currentState = engine.executeAction(currentState, { type: 'END_TURN' }).newState
    iterations++
  }

  throw new Error(`${maxIterations}턴 내에 목표 정수량에 도달하지 못했습니다.`)
}

/**
 * 플레이어의 능력치를 업그레이드합니다.
 *
 * @param stat 업그레이드할 능력치
 * @param targetLevel 목표 레벨 (해당 능력치 주사위 합)
 */
export function upgradePlayerStat(
  engine: GameEngine,
  state: GameState,
  playerId: string,
  stat: keyof Stats,
  targetLevel: number,
  diceRoller: MockDiceRoller,
): GameState {
  let currentState = state
  let iterations = 0
  const maxIterations = 100

  while (iterations < maxIterations) {
    const player = currentState.players.find(p => p.id === playerId)!
    const currentStatSum = player.stats[stat][0] + player.stats[stat][1]

    // 목표 레벨에 도달하면 종료
    if (currentStatSum >= targetLevel) {
      return currentState
    }

    // 정수가 부족하면 획득
    const currentLevel = Math.max(
      player.stats.strength[0] + player.stats.strength[1],
      player.stats.dexterity[0] + player.stats.dexterity[1],
      player.stats.intelligence[0] + player.stats.intelligence[1]
    )

    if (player.monsterEssence < currentLevel) {
      currentState = gatherMonsterEssence(engine, currentState, playerId, currentLevel)
    }

    // 플레이어 턴으로 이동
    currentState = advanceToPlayerTurn(engine, currentState, playerId)
    currentState = skipToActionPhase(engine, currentState)

    // 능력치 업그레이드를 위한 주사위 설정 (높은 값으로 성공 보장)
    diceRoller.setNextRolls([6])

    // 능력치 주사위 굴리기
    const rollResult = engine.executeAction(currentState, { type: 'ROLL_STAT_DICE', stat })
    if (!rollResult.success) {
      throw new Error(`능력치 주사위 굴리기 실패: ${rollResult.message}`)
    }
    currentState = rollResult.newState

    // 턴 종료
    currentState = engine.executeAction(currentState, { type: 'END_TURN' }).newState
    iterations++
  }

  throw new Error(`${maxIterations}턴 내에 목표 레벨에 도달하지 못했습니다.`)
}

/**
 * 플레이어를 타락시킵니다 (다른 용사 처치).
 *
 * 주의: 공격자와 대상이 인접해야 하며, 공격자의 힘이 충분히 높아야 합니다.
 * MockDiceRoller로 충분한 이동력을 설정하세요.
 */
export function corruptPlayer(
  engine: GameEngine,
  state: GameState,
  attackerId: string,
  targetId: string,
): GameState {
  const attacker = state.players.find(p => p.id === attackerId)!

  // 이미 타락 상태면 그냥 반환
  if (attacker.state === 'corrupt') {
    return state
  }

  // 대상을 처치하여 타락
  return executeLethalAttack(engine, state, attackerId, targetId)
}

/**
 * 마왕성을 방문하여 마검 위치를 획득합니다.
 */
export function visitCastleForSwordLocation(
  engine: GameEngine,
  state: GameState,
  playerId: string,
): GameState {
  const castleTile = GAME_BOARD.find(t => t.type === 'castle')!

  // 플레이어가 타락 상태인지 확인
  const player = state.players.find(p => p.id === playerId)!
  if (player.state !== 'corrupt') {
    throw new Error('신성 상태에서는 마왕성 방문으로 마검 위치를 알 수 없습니다.')
  }

  // 마왕성으로 이동
  return movePlayerToPosition(engine, state, playerId, castleTile.coord)
}

/**
 * 마검을 획득합니다.
 * - 타락 상태여야 함
 * - 마검 위치를 알아야 함 (마왕성 방문)
 * - 마검 위치로 이동 후 획득
 */
export function acquireDemonSword(
  engine: GameEngine,
  state: GameState,
  playerId: string,
): GameState {
  let currentState = state
  const player = currentState.players.find(p => p.id === playerId)!

  // 타락 상태 확인
  if (player.state !== 'corrupt') {
    throw new Error('타락 상태에서만 마검을 획득할 수 있습니다.')
  }

  // 마검 위치를 모르면 마왕성 방문
  if (!player.knowsDemonSwordPosition) {
    currentState = visitCastleForSwordLocation(engine, currentState, playerId)
  }

  // 마검 위치로 이동
  if (!currentState.demonSwordPosition) {
    throw new Error('마검이 이미 획득되었습니다.')
  }

  currentState = movePlayerToPosition(engine, currentState, playerId, currentState.demonSwordPosition)

  // 마검 뽑기
  currentState = advanceToPlayerTurn(engine, currentState, playerId)
  currentState = skipToActionPhase(engine, currentState)

  const drawResult = engine.executeAction(currentState, { type: 'DRAW_DEMON_SWORD' }, playerId)
  if (!drawResult.success) {
    throw new Error(`마검 뽑기 실패: ${drawResult.message}`)
  }

  return drawResult.newState
}
