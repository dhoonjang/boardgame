import type {
  GameState,
  GameAction,
  ActionResult,
  ValidAction,
  Player,
  HeroClass,
  HexCoord,
  Monster,
  Stats,
  GameEvent,
  TurnEntry,
} from '../types.js'
import { deserializeBoard } from '../types.js'
import { GAME_BOARD, STARTING_POSITIONS, MONSTERS, TERRAIN_MOVEMENT_COST, DEATH_RESPAWN_TURNS, SKILLS_BY_CLASS } from '../constants.js'
import { getNeighbors, getDistance, getTile, coordEquals } from '../hex.js'
import { useSkill, canUseSkill } from './skills.js'
import { completeRevelation } from './revelations.js'
import { checkVictoryCondition } from './victory.js'

// Simple UUID generator for cross-platform compatibility
function generateId(): string {
  return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, (c) => {
    const r = (Math.random() * 16) | 0
    const v = c === 'x' ? r : (r & 0x3) | 0x8
    return v.toString(16)
  })
}

export interface GameEngineConfig {
  maxPlayers: number
}

export interface CreateGameOptions {
  players: Array<{
    id: string
    name: string
    heroClass: HeroClass
  }>
}

/**
 * GameEngine - 순수 게임 로직을 처리하는 엔진
 *
 * 이 클래스는 UI 의존성 없이 순수하게 게임 상태를 관리합니다.
 * 모든 게임 로직(이동, 전투, 스킬 등)은 이 클래스를 통해 처리됩니다.
 */
export class GameEngine {
  private config: GameEngineConfig

  constructor(config: Partial<GameEngineConfig> = {}) {
    this.config = {
      maxPlayers: 4,
      ...config,
    }
  }

  /**
   * 새 게임을 생성합니다.
   */
  createGame(options: CreateGameOptions): GameState {
    const players = this.initializePlayers(options.players)
    const monsters = this.initializeMonsters()

    // 첫 라운드 턴 순서 생성: 도적부터, 그 다음 나머지 플레이어들, 마지막에 몬스터
    const rogues = players.filter(p => p.heroClass === 'rogue')
    const firstPlayer = rogues.length > 0 ? rogues[0] : players[0]

    // 도적이 먼저, 나머지는 순서대로
    const turnOrder: TurnEntry[] = [
      firstPlayer.id,
      ...players.filter(p => p.id !== firstPlayer.id).map(p => p.id),
      'monster',
    ]

    return {
      id: generateId(),
      players,
      roundNumber: 1,
      roundTurnOrder: turnOrder,
      currentTurnIndex: 0,
      board: GAME_BOARD,  // 고정 보드 사용
      monsters,
      monsterDice: [1, 1, 1, 1, 1, 1],
      revelationDeck: [],
    }
  }

  /**
   * 액션을 실행하고 새로운 게임 상태를 반환합니다.
   */
  executeAction(state: GameState, action: GameAction): ActionResult {
    switch (action.type) {
      case 'ROLL_MOVE_DICE':
        return this.handleRollMoveDice(state)
      case 'MOVE':
        return this.handleMove(state, action.position)
      case 'BASIC_ATTACK':
        return this.handleBasicAttack(state, action.targetId)
      case 'USE_SKILL':
        return this.handleUseSkill(state, action.skillId, action.targetId, action.position)
      case 'ROLL_STAT_DICE':
        return this.handleRollStatDice(state, action.stat)
      case 'END_TURN':
        return this.handleEndTurn(state)
      case 'COMPLETE_REVELATION':
        return this.handleCompleteRevelation(state, action.revelationId)
      case 'APPLY_CORRUPT_DICE':
        return this.handleApplyCorruptDice(state, action.stat)
      case 'CHOOSE_HOLY':
        return this.handleChooseHoly(state)
      default:
        return {
          success: false,
          newState: state,
          message: '알 수 없는 액션입니다.',
          events: [],
        }
    }
  }

  /**
   * 현재 턴의 엔트리를 반환합니다.
   */
  getCurrentTurnEntry(state: GameState): TurnEntry {
    return state.roundTurnOrder[state.currentTurnIndex]
  }

  /**
   * 현재 턴의 플레이어를 반환합니다 (몬스터 턴이면 null).
   */
  getCurrentPlayer(state: GameState): Player | null {
    const turnEntry = this.getCurrentTurnEntry(state)
    if (turnEntry === 'monster') return null
    return state.players.find(p => p.id === turnEntry) ?? null
  }

  /**
   * 현재 상태에서 가능한 모든 액션을 반환합니다.
   */
  getValidActions(state: GameState): ValidAction[] {
    const validActions: ValidAction[] = []
    const currentPlayer = this.getCurrentPlayer(state)

    // 몬스터 턴이면 액션 없음
    if (!currentPlayer) {
      return []
    }

    if (currentPlayer.isDead) {
      return []
    }

    // 이동 단계
    if (currentPlayer.turnPhase === 'move') {
      // 아직 주사위를 굴리지 않았으면
      if (currentPlayer.remainingMovement === null) {
        validActions.push({
          action: { type: 'ROLL_MOVE_DICE' },
          description: '이동 주사위를 굴립니다.',
        })
      } else if (currentPlayer.remainingMovement > 0) {
        // 이동 가능한 인접 타일 추가
        const board = deserializeBoard(state.board)
        const neighbors = getNeighbors(currentPlayer.position)

        for (const neighbor of neighbors) {
          const tile = getTile(board, neighbor)
          if (!tile) continue

          const moveCost = TERRAIN_MOVEMENT_COST[tile.type]
          if (moveCost === 'blocked') continue

          // 타락 용사의 신전 진입 불가
          if (tile.type === 'temple' && currentPlayer.state === 'corrupt') {
            continue
          }

          const actualCost = moveCost === 'all' ? currentPlayer.remainingMovement : moveCost
          if (currentPlayer.remainingMovement >= actualCost) {
            validActions.push({
              action: { type: 'MOVE', position: neighbor },
              description: `(${neighbor.q}, ${neighbor.r})로 이동 (이동력 -${actualCost})`,
            })
          }
        }

        // 이동 종료 (행동 단계로 전환)
        validActions.push({
          action: { type: 'END_TURN' },
          description: '이동을 종료하고 행동 단계로 넘어갑니다.',
        })
      } else {
        // 이동력이 0이면 행동 단계로
        validActions.push({
          action: { type: 'END_TURN' },
          description: '행동 단계로 넘어갑니다.',
        })
      }
    }

    // 행동 단계
    if (currentPlayer.turnPhase === 'action') {
      // 인접한 대상에 대한 기본 공격
      const neighbors = getNeighbors(currentPlayer.position)

      // 인접 플레이어 공격
      for (const player of state.players) {
        if (player.id === currentPlayer.id || player.isDead) continue
        if (neighbors.some(n => coordEquals(n, player.position))) {
          validActions.push({
            action: { type: 'BASIC_ATTACK', targetId: player.id },
            description: `${player.name}을(를) 공격합니다.`,
          })
        }
      }

      // 인접 몬스터 공격
      for (const monster of state.monsters) {
        if (monster.isDead) continue
        if (neighbors.some(n => coordEquals(n, monster.position))) {
          validActions.push({
            action: { type: 'BASIC_ATTACK', targetId: monster.id },
            description: `${monster.name}을(를) 공격합니다.`,
          })
        }
      }

      // 사용 가능한 스킬 추가 (이번 턴에 사용한 비용 + 스킬 비용 <= 지능)
      const playerSkills = SKILLS_BY_CLASS[currentPlayer.heroClass]
      const intelligence = this.getStatTotal(currentPlayer.stats.intelligence)
      const remainingSkillCost = intelligence - currentPlayer.usedSkillCost
      for (const skill of playerSkills) {
        const cooldown = currentPlayer.skillCooldowns[skill.id] ?? 0
        if (cooldown === 0 && skill.cost <= remainingSkillCost) {
          validActions.push({
            action: { type: 'USE_SKILL', skillId: skill.id },
            description: `${skill.name} 사용 (비용: ${skill.cost}, 남은 비용: ${remainingSkillCost})`,
          })
        }
      }

      // 능력치 주사위 굴리기 (몬스터 정수가 충분할 때)
      const currentLevel = Math.max(
        Math.max(...currentPlayer.stats.strength),
        Math.max(...currentPlayer.stats.dexterity),
        Math.max(...currentPlayer.stats.intelligence)
      )
      if (currentPlayer.monsterEssence >= currentLevel) {
        validActions.push({
          action: { type: 'ROLL_STAT_DICE', stat: 'strength' },
          description: `힘 주사위 굴리기 (정수 ${currentLevel} 소모)`,
        })
        validActions.push({
          action: { type: 'ROLL_STAT_DICE', stat: 'dexterity' },
          description: `민첩 주사위 굴리기 (정수 ${currentLevel} 소모)`,
        })
        validActions.push({
          action: { type: 'ROLL_STAT_DICE', stat: 'intelligence' },
          description: `지능 주사위 굴리기 (정수 ${currentLevel} 소모)`,
        })
      }

      validActions.push({
        action: { type: 'END_TURN' },
        description: '턴을 종료합니다.',
      })
    }

    return validActions
  }

  /**
   * 액션이 유효한지 검증합니다.
   */
  validateAction(state: GameState, _action: GameAction): { valid: boolean; reason?: string } {
    const currentPlayer = this.getCurrentPlayer(state)

    if (!currentPlayer) {
      return { valid: false, reason: '몬스터 턴에는 행동할 수 없습니다.' }
    }

    if (currentPlayer.isDead) {
      return { valid: false, reason: '죽은 플레이어는 행동할 수 없습니다.' }
    }

    return { valid: true }
  }

  // ===== Private Methods =====

  /**
   * 능력치의 주사위 2개 합 계산
   */
  private getStatTotal(stat: [number, number]): number {
    return stat[0] + stat[1]
  }

  /**
   * 주사위 굴리기 (1d6)
   */
  private rollDice(): number {
    return Math.floor(Math.random() * 6) + 1
  }

  /**
   * 2d6 굴리기
   */
  private roll2d6(): [number, number] {
    return [this.rollDice(), this.rollDice()]
  }

  private initializePlayers(
    playerConfigs: CreateGameOptions['players']
  ): Player[] {
    // 직업별 사용된 시작 위치 인덱스 추적
    const usedPositionIndex: Record<HeroClass, number> = {
      warrior: 0,
      mage: 0,
      rogue: 0,
    }

    return playerConfigs.map((config, index) => {
      // 해당 직업의 시작 가능 위치 배열
      const positions = STARTING_POSITIONS[config.heroClass]
      // 사용할 위치 인덱스 (같은 직업이 여러 명이면 다음 위치 사용)
      const positionIndex = usedPositionIndex[config.heroClass]
      // 위치 배열 범위를 넘으면 마지막 위치 사용 (3명 이상 같은 직업일 경우 대비)
      const position = positions[Math.min(positionIndex, positions.length - 1)]
      // 다음 같은 직업 플레이어를 위해 인덱스 증가
      usedPositionIndex[config.heroClass]++

      return {
        id: config.id,
        name: config.name,
        heroClass: config.heroClass,
        state: 'holy' as const,
        stats: {
          strength: [1, 1] as [number, number],
          dexterity: [1, 1] as [number, number],
          intelligence: [1, 1] as [number, number],
        },
        corruptDice: null,
        corruptDiceTarget: null,
        health: 20,
        maxHealth: 20,
        position,
        revelations: [],
        completedRevelations: [],
        monsterEssence: 0,
        devilScore: 0,
        faithScore: 0,
        isDead: false,
        deathTurnsRemaining: 0,
        skillCooldowns: {},
        usedSkillCost: 0,
        // 턴 관련 필드
        turnPhase: 'move' as const,
        remainingMovement: index === 0 ? null : null, // 첫 플레이어부터 시작
        leftoverMovement: 0,
        turnCompleted: false,
      }
    })
  }

  private initializeMonsters(): Monster[] {
    return MONSTERS.map((def: typeof MONSTERS[number]) => ({
      id: def.id,
      name: def.nameKo,
      position: def.position,
      health: def.maxHealth,
      maxHealth: def.maxHealth,
      diceIndices: def.diceIndices,
      isDead: false,
    }))
  }

  private handleRollMoveDice(state: GameState): ActionResult {
    const currentPlayer = this.getCurrentPlayer(state)

    if (!currentPlayer) {
      return {
        success: false,
        newState: state,
        message: '몬스터 턴에는 주사위를 굴릴 수 없습니다.',
        events: [],
      }
    }

    if (currentPlayer.turnPhase !== 'move') {
      return {
        success: false,
        newState: state,
        message: '이동 단계가 아닙니다.',
        events: [],
      }
    }

    if (currentPlayer.remainingMovement !== null) {
      return {
        success: false,
        newState: state,
        message: '이미 이동 주사위를 굴렸습니다.',
        events: [],
      }
    }

    // 2d6 굴리기
    const [dice1, dice2] = this.roll2d6()
    const diceSum = dice1 + dice2

    // 이동력 = 2d6 + 민첩(주사위 2개 합)
    const dexBonus = this.getStatTotal(currentPlayer.stats.dexterity)
    const totalMovement = diceSum + dexBonus

    const newPlayers = state.players.map(p =>
      p.id === currentPlayer.id
        ? { ...p, remainingMovement: totalMovement }
        : p
    )

    return {
      success: true,
      newState: {
        ...state,
        players: newPlayers,
      },
      message: `이동 주사위: ${dice1} + ${dice2} = ${diceSum}, 민첩 보너스: +${dexBonus}. 총 이동력: ${totalMovement}`,
      events: [],
    }
  }

  private handleMove(
    state: GameState,
    position: HexCoord
  ): ActionResult {
    const currentPlayer = this.getCurrentPlayer(state)

    if (!currentPlayer) {
      return {
        success: false,
        newState: state,
        message: '몬스터 턴에는 이동할 수 없습니다.',
        events: [],
      }
    }

    const from = currentPlayer.position

    // 이동 주사위를 굴리지 않았으면 에러
    if (currentPlayer.remainingMovement === null) {
      return {
        success: false,
        newState: state,
        message: '먼저 이동 주사위를 굴려야 합니다.',
        events: [],
      }
    }

    // 인접 타일인지 확인
    const distance = getDistance(from, position)
    if (distance !== 1) {
      return {
        success: false,
        newState: state,
        message: '인접한 타일로만 이동할 수 있습니다.',
        events: [],
      }
    }

    // 보드에서 타일 가져오기
    const board = deserializeBoard(state.board)
    const targetTile = getTile(board, position)

    if (!targetTile) {
      return {
        success: false,
        newState: state,
        message: '존재하지 않는 타일입니다.',
        events: [],
      }
    }

    // 지형별 이동력 소모 계산
    const moveCost = TERRAIN_MOVEMENT_COST[targetTile.type]

    // 이동 불가 지형
    if (moveCost === 'blocked') {
      return {
        success: false,
        newState: state,
        message: `${targetTile.type === 'mountain' ? '산' : targetTile.type === 'lake' ? '호수' : '몬스터 서식지'}은(는) 지나갈 수 없습니다.`,
        events: [],
      }
    }

    // 타락 용사의 신전 진입 불가
    if (targetTile.type === 'temple' && currentPlayer.state === 'corrupt') {
      return {
        success: false,
        newState: state,
        message: '타락한 용사는 신전에 진입할 수 없습니다.',
        events: [],
      }
    }

    // 실제 소모량 계산
    const actualCost = moveCost === 'all' ? currentPlayer.remainingMovement : moveCost

    // 이동력 부족
    if (currentPlayer.remainingMovement < actualCost) {
      return {
        success: false,
        newState: state,
        message: `이동력이 부족합니다. 필요: ${actualCost}, 남은 이동력: ${currentPlayer.remainingMovement}`,
        events: [],
      }
    }

    const newRemainingMovement = currentPlayer.remainingMovement - actualCost

    // 언덕 진입 시 자동으로 행동 단계로 전환
    const newTurnPhase = moveCost === 'all' ? 'action' as const : currentPlayer.turnPhase

    const newPlayers = state.players.map(p =>
      p.id === currentPlayer.id
        ? { ...p, position, remainingMovement: newRemainingMovement, turnPhase: newTurnPhase }
        : p
    )

    const events: GameEvent[] = [{
      type: 'PLAYER_MOVED',
      playerId: currentPlayer.id,
      from,
      to: position,
    }]

    return {
      success: true,
      newState: {
        ...state,
        players: newPlayers,
      },
      message: `(${position.q}, ${position.r})로 이동했습니다. (이동력 -${actualCost}, 남은: ${newRemainingMovement})`,
      events,
    }
  }

  private handleBasicAttack(state: GameState, targetId: string): ActionResult {
    const currentPlayer = this.getCurrentPlayer(state)
    const events: GameEvent[] = []

    if (!currentPlayer) {
      return {
        success: false,
        newState: state,
        message: '몬스터 턴에는 공격할 수 없습니다.',
        events: [],
      }
    }

    // 대상 찾기 (플레이어 또는 몬스터)
    const targetPlayer = state.players.find(p => p.id === targetId)
    const targetMonster = state.monsters.find(m => m.id === targetId)

    if (!targetPlayer && !targetMonster) {
      return {
        success: false,
        newState: state,
        message: '대상을 찾을 수 없습니다.',
        events: [],
      }
    }

    // 대상 위치 가져오기
    const targetPosition = targetPlayer?.position ?? targetMonster!.position

    // 인접한지 확인
    const distance = getDistance(currentPlayer.position, targetPosition)
    if (distance !== 1) {
      return {
        success: false,
        newState: state,
        message: '인접한 대상만 공격할 수 있습니다.',
        events: [],
      }
    }

    // 피해 계산: 힘(주사위 2개 합)
    const damage = this.getStatTotal(currentPlayer.stats.strength)

    let newState = { ...state }
    let targetName: string

    if (targetPlayer) {
      // 플레이어 공격
      targetName = targetPlayer.name
      const newHealth = Math.max(0, targetPlayer.health - damage)
      const isDead = newHealth <= 0

      // 용사 처치 시 타락 로직
      let attackerCorruption = false
      let corruptDiceValue: number | null = null

      if (isDead && currentPlayer.state === 'holy') {
        // 신성 용사가 다른 용사를 처치하면 타락
        attackerCorruption = true
        // 타락 주사위 기본값 1
        corruptDiceValue = 1
      } else if (isDead && currentPlayer.state === 'corrupt') {
        // 타락 용사가 처치하면 타락 주사위 +1
        const currentCorrupt = currentPlayer.corruptDice ?? 0
        corruptDiceValue = Math.min(6, currentCorrupt + 1)
      }

      newState = {
        ...newState,
        players: state.players.map(p => {
          if (p.id === targetId) {
            return {
              ...p,
              health: newHealth,
              isDead,
              deathTurnsRemaining: isDead ? DEATH_RESPAWN_TURNS : p.deathTurnsRemaining,
            }
          }
          if (p.id === currentPlayer.id) {
            if (attackerCorruption) {
              return {
                ...p,
                state: 'corrupt' as const,
                corruptDice: corruptDiceValue,
              }
            } else if (corruptDiceValue !== null) {
              return {
                ...p,
                corruptDice: corruptDiceValue,
              }
            }
          }
          return p
        }),
      }

      events.push({
        type: 'PLAYER_ATTACKED',
        attackerId: currentPlayer.id,
        targetId,
        damage,
      })

      if (isDead) {
        events.push({
          type: 'PLAYER_DIED',
          playerId: targetId,
        })
      }
    } else {
      // 몬스터 공격
      const monster = targetMonster!
      targetName = monster.name
      // 실제 피해량 (남은 체력보다 많으면 남은 체력만큼만)
      const actualDamage = Math.min(damage, monster.health)
      const newHealth = Math.max(0, monster.health - damage)
      const isDead = newHealth <= 0

      newState = {
        ...newState,
        monsters: state.monsters.map(m =>
          m.id === targetId
            ? { ...m, health: newHealth, isDead }
            : m
        ),
        // 실제 피해만큼 몬스터 정수 획득
        players: state.players.map(p =>
          p.id === currentPlayer.id
            ? { ...p, monsterEssence: p.monsterEssence + actualDamage }
            : p
        ),
      }

      events.push({
        type: 'PLAYER_ATTACKED',
        attackerId: currentPlayer.id,
        targetId,
        damage,
      })

      if (isDead) {
        events.push({
          type: 'MONSTER_DIED',
          monsterId: targetId,
        })
      }
    }

    return {
      success: true,
      newState,
      message: `${targetName}에게 ${damage}의 피해를 입혔습니다.`,
      events,
    }
  }

  private handleUseSkill(
    state: GameState,
    skillId: string,
    targetId?: string,
    position?: HexCoord
  ): ActionResult {
    const result = useSkill(state, skillId, targetId, position)
    return {
      success: result.success,
      newState: result.newState,
      message: result.message,
      events: result.events,
    }
  }

  private handleRollStatDice(
    state: GameState,
    stat: keyof Player['stats']
  ): ActionResult {
    const currentPlayer = this.getCurrentPlayer(state)

    if (!currentPlayer) {
      return {
        success: false,
        newState: state,
        message: '몬스터 턴에는 주사위를 굴릴 수 없습니다.',
        events: [],
      }
    }

    // 현재 레벨 계산 (가장 높은 능력치 = 레벨)
    const currentLevel = Math.max(
      Math.max(...currentPlayer.stats.strength),
      Math.max(...currentPlayer.stats.dexterity),
      Math.max(...currentPlayer.stats.intelligence)
    )

    // 필요한 몬스터 정수: 레벨만큼
    const requiredEssence = currentLevel
    if (currentPlayer.monsterEssence < requiredEssence) {
      return {
        success: false,
        newState: state,
        message: `몬스터 정수가 부족합니다. (필요: ${requiredEssence}, 보유: ${currentPlayer.monsterEssence})`,
        events: [],
      }
    }

    // 능력치 주사위 값 (2개 중 낮은 값)
    const statDice = currentPlayer.stats[stat]
    const lowerDice = Math.min(statDice[0], statDice[1])
    const lowerDiceIndex = statDice[0] <= statDice[1] ? 0 : 1

    // 1d6 굴리기
    const roll = this.rollDice()

    // 굴린 값이 낮은 주사위보다 높으면 업그레이드
    const success = roll > lowerDice

    let newPlayers = state.players.map(p =>
      p.id === currentPlayer.id
        ? { ...p, monsterEssence: p.monsterEssence - requiredEssence }
        : p
    )

    if (success) {
      const newStatDice: [number, number] = [...statDice] as [number, number]
      newStatDice[lowerDiceIndex] = roll

      newPlayers = newPlayers.map(p =>
        p.id === currentPlayer.id
          ? {
              ...p,
              stats: {
                ...p.stats,
                [stat]: newStatDice,
              },
            }
          : p
      )
    }

    const statNames: Record<keyof Stats, string> = {
      strength: '힘',
      dexterity: '민첩',
      intelligence: '지능',
    }

    return {
      success: true,
      newState: { ...state, players: newPlayers },
      message: success
        ? `${statNames[stat]} 주사위 굴림: ${roll}. 업그레이드 성공! (${lowerDice} → ${roll})`
        : `${statNames[stat]} 주사위 굴림: ${roll}. 업그레이드 실패. (현재 최소: ${lowerDice})`,
      events: [],
    }
  }

  private handleEndTurn(state: GameState): ActionResult {
    const events: GameEvent[] = []
    const currentPlayer = this.getCurrentPlayer(state)

    if (!currentPlayer) {
      return {
        success: false,
        newState: state,
        message: '몬스터 턴에는 END_TURN을 사용할 수 없습니다.',
        events: [],
      }
    }

    // 이동 단계에서 END_TURN: 행동 단계로 전환
    if (currentPlayer.turnPhase === 'move') {
      const newPlayers = state.players.map(p =>
        p.id === currentPlayer.id
          ? { ...p, turnPhase: 'action' as const }
          : p
      )

      return {
        success: true,
        newState: { ...state, players: newPlayers },
        message: '행동 단계로 넘어갑니다.',
        events: [],
      }
    }

    // 행동 단계에서 END_TURN: 턴 완료 및 다음 턴으로
    // leftoverMovement 저장, usedSkillCost 리셋
    let newPlayers = state.players.map(p =>
      p.id === currentPlayer.id
        ? {
            ...p,
            leftoverMovement: p.remainingMovement ?? 0,
            remainingMovement: null,
            turnPhase: 'move' as const, // 다음 라운드를 위해 리셋
            usedSkillCost: 0, // 스킬 비용 리셋
          }
        : p
    )

    // 다음 턴으로 이동
    const nextTurnIndex = state.currentTurnIndex + 1
    const nextTurnEntry = state.roundTurnOrder[nextTurnIndex]

    // 다음이 몬스터 턴인 경우
    if (nextTurnEntry === 'monster') {
      // 몬스터 페이즈 실행
      let newState: GameState = {
        ...state,
        players: newPlayers,
        currentTurnIndex: nextTurnIndex,
      }

      const monsterResult = this.processMonsterPhase(newState)
      newState = monsterResult.newState
      events.push(...monsterResult.events)

      // 새 라운드 준비
      // 부활 카운트 감소 및 부활 처리
      newPlayers = newState.players.map(p => {
        if (p.isDead && p.deathTurnsRemaining > 0) {
          const newDeathTurns = p.deathTurnsRemaining - 1
          if (newDeathTurns === 0) {
            // 부활: 자기 직업 마을에서 체력 절반으로
            events.push({
              type: 'PLAYER_RESPAWNED',
              playerId: p.id,
            })
            return {
              ...p,
              isDead: false,
              deathTurnsRemaining: 0,
              health: Math.floor(p.maxHealth / 2),
              position: STARTING_POSITIONS[p.heroClass][0], // 부활 시 첫 번째 마을 위치로
              turnPhase: 'move' as const,
            }
          }
          return { ...p, deathTurnsRemaining: newDeathTurns }
        }
        return p
      })

      // 스킬 쿨다운 감소
      newPlayers = newPlayers.map(p => ({
        ...p,
        skillCooldowns: Object.fromEntries(
          Object.entries(p.skillCooldowns).map(([key, value]) => [key, Math.max(0, value - 1)])
        ),
      }))

      // 새 라운드 턴 순서 결정: leftoverMovement가 높은 플레이어부터
      const sortedPlayers = [...newPlayers]
        .filter(p => !p.isDead)
        .sort((a, b) => b.leftoverMovement - a.leftoverMovement)

      const newTurnOrder: TurnEntry[] = [
        ...sortedPlayers.map(p => p.id),
        'monster',
      ]

      return {
        success: true,
        newState: {
          ...newState,
          players: newPlayers,
          roundNumber: state.roundNumber + 1,
          roundTurnOrder: newTurnOrder,
          currentTurnIndex: 0,
        },
        message: `라운드 ${state.roundNumber + 1} 시작! ${newPlayers.find(p => p.id === newTurnOrder[0])?.name}의 턴입니다.`,
        events,
      }
    }

    // 다음이 플레이어 턴인 경우
    // 죽은 플레이어는 스킵
    let actualNextIndex = nextTurnIndex
    while (actualNextIndex < state.roundTurnOrder.length - 1) {
      const entry = state.roundTurnOrder[actualNextIndex]
      if (entry === 'monster') break
      const player = state.players.find(p => p.id === entry)
      if (player && !player.isDead) break
      actualNextIndex++
    }

    // 스킵해서 몬스터까지 갔으면 몬스터 처리
    if (state.roundTurnOrder[actualNextIndex] === 'monster') {
      return this.handleEndTurn({
        ...state,
        players: newPlayers,
        currentTurnIndex: actualNextIndex - 1, // 몬스터 직전으로 설정하고 다시 호출
      })
    }

    const nextPlayer = state.players.find(p => p.id === state.roundTurnOrder[actualNextIndex])

    return {
      success: true,
      newState: {
        ...state,
        players: newPlayers,
        currentTurnIndex: actualNextIndex,
      },
      message: `${nextPlayer?.name}의 턴입니다.`,
      events,
    }
  }

  /**
   * 몬스터 단계 처리
   */
  private processMonsterPhase(state: GameState): { newState: GameState; events: GameEvent[] } {
    const events: GameEvent[] = []

    // 6개 몬스터 주사위 굴리기
    const monsterDice = Array.from({ length: 6 }, () => this.rollDice())

    let newState = { ...state, monsterDice }
    let newPlayers = [...state.players]

    // 각 몬스터 처리
    for (const monster of state.monsters) {
      if (monster.isDead) continue

      // 몬스터의 주사위 합 계산: 작은 순으로 정렬 후 diceIndices가 가리키는 주사위들을 더함
      const sortedDice = [...monsterDice].sort((a, b) => a - b)
      const diceSum = monster.diceIndices.reduce((sum, idx) => sum + sortedDice[idx], 0)

      // 인접한 용사 찾기
      const adjacentPlayers = newPlayers.filter(p =>
        !p.isDead && getDistance(monster.position, p.position) === 1
      )

      if (adjacentPlayers.length === 0) continue

      // 공격 대상 결정: 주사위합 % 인접타일수
      const targetIndex = diceSum % adjacentPlayers.length
      const targetPlayer = adjacentPlayers[targetIndex]

      // 몬스터별 고유 효과 및 피해 (기본: 주사위 합만큼)
      const damage = diceSum

      // 피해 적용
      const newHealth = Math.max(0, targetPlayer.health - damage)
      const isDead = newHealth <= 0

      newPlayers = newPlayers.map(p =>
        p.id === targetPlayer.id
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
        attackerId: monster.id,
        targetId: targetPlayer.id,
        damage,
      })

      if (isDead) {
        events.push({
          type: 'PLAYER_DIED',
          playerId: targetPlayer.id,
        })
      }
    }

    return {
      newState: { ...newState, players: newPlayers },
      events,
    }
  }

  private handleCompleteRevelation(
    state: GameState,
    revelationId: string
  ): ActionResult {
    const currentPlayer = this.getCurrentPlayer(state)

    if (!currentPlayer) {
      return {
        success: false,
        newState: state,
        message: '몬스터 턴에는 계시를 완료할 수 없습니다.',
        events: [],
      }
    }

    const result = completeRevelation(state, currentPlayer.id, revelationId)

    // 승리 조건 체크
    if (result.success) {
      const victoryCheck = checkVictoryCondition(result.newState)
      if (victoryCheck.hasWinner) {
        return {
          ...result,
          events: [...result.events, { type: 'GAME_OVER', winnerId: victoryCheck.winnerId! }],
          message: victoryCheck.message,
        }
      }
    }

    return result
  }

  /**
   * 타락 주사위를 특정 능력치에 적용
   */
  private handleApplyCorruptDice(
    state: GameState,
    stat: keyof Stats
  ): ActionResult {
    const currentPlayer = this.getCurrentPlayer(state)

    if (!currentPlayer) {
      return {
        success: false,
        newState: state,
        message: '몬스터 턴에는 타락 주사위를 적용할 수 없습니다.',
        events: [],
      }
    }

    // 타락 주사위가 있어야 함
    if (currentPlayer.corruptDice === null) {
      return {
        success: false,
        newState: state,
        message: '타락 주사위가 없습니다.',
        events: [],
      }
    }

    // 이미 적용된 능력치가 있으면 에러
    if (currentPlayer.corruptDiceTarget !== null) {
      return {
        success: false,
        newState: state,
        message: '타락 주사위가 이미 적용되어 있습니다.',
        events: [],
      }
    }

    const newPlayers = state.players.map(p =>
      p.id === currentPlayer.id
        ? { ...p, corruptDiceTarget: stat }
        : p
    )

    const statNames: Record<keyof Stats, string> = {
      strength: '힘',
      dexterity: '민첩',
      intelligence: '지능',
    }

    return {
      success: true,
      newState: { ...state, players: newPlayers },
      message: `타락 주사위(${currentPlayer.corruptDice})를 ${statNames[stat]}에 적용했습니다.`,
      events: [],
    }
  }

  /**
   * 부활 시 신성 선택 (타락에서 신성으로 전환)
   */
  private handleChooseHoly(state: GameState): ActionResult {
    const currentPlayer = this.getCurrentPlayer(state)

    if (!currentPlayer) {
      return {
        success: false,
        newState: state,
        message: '몬스터 턴에는 신성 선택을 할 수 없습니다.',
        events: [],
      }
    }

    // 부활 직후여야 함 (타락 상태에서만 가능)
    if (currentPlayer.state !== 'corrupt') {
      return {
        success: false,
        newState: state,
        message: '신성 상태에서는 선택할 수 없습니다.',
        events: [],
      }
    }

    const newPlayers = state.players.map(p =>
      p.id === currentPlayer.id
        ? {
            ...p,
            state: 'holy' as const,
            corruptDice: null,
            corruptDiceTarget: null,
          }
        : p
    )

    return {
      success: true,
      newState: { ...state, players: newPlayers },
      message: '신성 상태로 전환했습니다. 타락 주사위가 사라집니다.',
      events: [],
    }
  }
}
