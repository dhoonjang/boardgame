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
  DiceRoller,
} from '../types'
import { deserializeBoard, defaultDiceRoller } from '../types'
import { GAME_BOARD, STARTING_POSITIONS, MONSTERS, TERRAIN_MOVEMENT_COST, DEATH_RESPAWN_TURNS, SKILLS_BY_CLASS, getMaxHealthByLevel, TILE_EFFECTS } from '../constants'
import { getNeighbors, getDistance, getTile, coordEquals } from '../hex'
import { useSkill, canUseSkill } from './skills'
import { completeRevelation, createRevelationDeck, drawRevelation, checkAngel7Protection, processEventRevelations } from './revelations'
import { checkVictoryCondition } from './victory'
import { processMonsterPhase as processMonsterPhaseFromModule } from './monsters'

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
  diceRoller?: DiceRoller
}

export interface CreateGameOptions {
  players: Array<{
    id: string
    name: string
    heroClass: HeroClass
  }>
  demonSwordPosition?: HexCoord  // 테스트용: 마검 위치 지정
}

/**
 * GameEngine - 순수 게임 로직을 처리하는 엔진
 *
 * 이 클래스는 UI 의존성 없이 순수하게 게임 상태를 관리합니다.
 * 모든 게임 로직(이동, 전투, 스킬 등)은 이 클래스를 통해 처리됩니다.
 */
export class GameEngine {
  private config: GameEngineConfig
  private diceRoller: DiceRoller

  constructor(config: Partial<GameEngineConfig> = {}) {
    this.config = {
      maxPlayers: 4,
      ...config,
    }
    this.diceRoller = config.diceRoller ?? defaultDiceRoller
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

    // 마검 위치 초기화 (마왕성 근처 숨겨진 위치)
    const demonSwordPosition = options.demonSwordPosition ?? this.initializeDemonSwordPosition()

    return {
      id: generateId(),
      players,
      roundNumber: 1,
      roundTurnOrder: turnOrder,
      currentTurnIndex: 0,
      board: GAME_BOARD,  // 고정 보드 사용
      monsters,
      monsterDice: [1, 1, 1, 1, 1, 1],
      revelationDeck: createRevelationDeck(),
      demonSwordPosition,
      clones: [],
      monsterRoundBuffs: {
        golemBasicAttackImmune: false,
        meteorImmune: false,
        fireTileDisabled: false,
      },
    }
  }

  /**
   * 액션을 실행하고 새로운 게임 상태를 반환합니다.
   * @param state 현재 게임 상태
   * @param action 실행할 액션
   * @param playerId 액션을 수행하는 플레이어 ID (없으면 현재 턴 플레이어)
   */
  executeAction(state: GameState, action: GameAction, playerId?: string): ActionResult {
    // playerId가 없으면 현재 턴 플레이어 사용 (하위 호환성)
    const actingPlayerId = playerId ?? this.getCurrentPlayer(state)?.id

    // 턴 기반 액션은 현재 턴 플레이어만 수행 가능
    const turnBasedActions = ['ROLL_MOVE_DICE', 'MOVE', 'END_MOVE_PHASE', 'BASIC_ATTACK', 'USE_SKILL', 'ROLL_STAT_DICE', 'END_TURN']
    if (turnBasedActions.includes(action.type)) {
      const currentPlayer = this.getCurrentPlayer(state)
      if (!currentPlayer) {
        return {
          success: false,
          newState: state,
          message: '몬스터 턴에는 행동할 수 없습니다.',
          events: [],
        }
      }
      if (actingPlayerId !== currentPlayer.id) {
        return {
          success: false,
          newState: state,
          message: '자신의 턴에만 이 액션을 수행할 수 있습니다.',
          events: [],
        }
      }
    }

    // 비-턴 액션은 해당 플레이어가 수행
    const nonTurnActions = ['COMPLETE_REVELATION', 'APPLY_CORRUPT_DICE', 'CHOOSE_HOLY', 'DRAW_DEMON_SWORD', 'CHOOSE_CORRUPTION', 'CHOOSE_ESCAPE_TILE']
    if (nonTurnActions.includes(action.type) && !actingPlayerId) {
      return {
        success: false,
        newState: state,
        message: '플레이어 ID가 필요합니다.',
        events: [],
      }
    }

    switch (action.type) {
      case 'ROLL_MOVE_DICE':
        return this.handleRollMoveDice(state)
      case 'MOVE':
        return this.handleMove(state, action.position)
      case 'END_MOVE_PHASE':
        return this.handleEndMovePhase(state)
      case 'BASIC_ATTACK':
        return this.handleBasicAttack(state, action.targetId)
      case 'USE_SKILL':
        return this.handleUseSkill(state, action.skillId, action.targetId, action.position)
      case 'ROLL_STAT_DICE':
        return this.handleRollStatDice(state, action.stat)
      case 'END_TURN':
        return this.handleEndTurn(state)
      case 'COMPLETE_REVELATION':
        return this.handleCompleteRevelation(state, action.revelationId, actingPlayerId!)
      case 'APPLY_CORRUPT_DICE':
        return this.handleApplyCorruptDice(state, action.stat, actingPlayerId!)
      case 'CHOOSE_HOLY':
        return this.handleChooseHoly(state, actingPlayerId!)
      case 'DRAW_DEMON_SWORD':
        return this.handleDrawDemonSword(state, actingPlayerId!)
      case 'CHOOSE_CORRUPTION':
        return this.handleChooseCorruption(state, action.accept, actingPlayerId!)
      case 'CHOOSE_ESCAPE_TILE':
        return this.handleChooseEscapeTile(state, action.position, actingPlayerId!)
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
   * @param state 현재 게임 상태
   * @param playerId 액션을 조회할 플레이어 ID (없으면 현재 턴 플레이어)
   */
  getValidActions(state: GameState, playerId?: string): ValidAction[] {
    const validActions: ValidAction[] = []
    const currentPlayer = this.getCurrentPlayer(state)

    // playerId가 지정된 경우 해당 플레이어 조회
    const targetPlayer = playerId
      ? state.players.find(p => p.id === playerId)
      : currentPlayer

    if (!targetPlayer) {
      return []
    }

    // 현재 턴 플레이어인지 확인
    const isCurrentTurn = currentPlayer?.id === targetPlayer.id

    // 현재 턴 플레이어가 아닌 경우: 비-턴 액션만 반환
    if (!isCurrentTurn) {
      return this.getNonTurnActions(state, targetPlayer)
    }

    // 현재 턴 플레이어인 경우: 턴 액션 + 비-턴 액션 반환
    if (targetPlayer.isDead) {
      return this.getNonTurnActions(state, targetPlayer)
    }

    // 이동 단계
    if (targetPlayer.turnPhase === 'move') {
      // 아직 주사위를 굴리지 않았으면
      if (targetPlayer.remainingMovement === null) {
        validActions.push({
          action: { type: 'ROLL_MOVE_DICE' },
          description: '이동 주사위를 굴립니다.',
        })
      } else if (targetPlayer.remainingMovement > 0) {
        // 이동 가능한 인접 타일 추가
        const board = deserializeBoard(state.board)
        const neighbors = getNeighbors(targetPlayer.position)

        for (const neighbor of neighbors) {
          const tile = getTile(board, neighbor)
          if (!tile) continue

          const moveCost = TERRAIN_MOVEMENT_COST[tile.type]
          if (moveCost === 'blocked') continue

          // 다른 살아있는 플레이어가 있는 타일 이동 불가
          if (state.players.some(p => p.id !== targetPlayer.id && !p.isDead && coordEquals(p.position, neighbor))) {
            continue
          }

          // 타락 용사의 신전 진입 불가 (마검 보유 시 가능)
          if (tile.type === 'temple' && targetPlayer.state === 'corrupt' && !targetPlayer.hasDemonSword) {
            continue
          }

          // 언덕(all)은 이동력 3 이상 필요
          if (moveCost === 'all' && targetPlayer.remainingMovement < 3) continue
          const actualCost = moveCost === 'all' ? targetPlayer.remainingMovement : moveCost
          if (targetPlayer.remainingMovement >= actualCost) {
            validActions.push({
              action: { type: 'MOVE', position: neighbor },
              description: `(${neighbor.q}, ${neighbor.r})로 이동 (이동력 -${actualCost})`,
            })
          }
        }

        // 이동 종료 (행동 단계로 전환)
        validActions.push({
          action: { type: 'END_MOVE_PHASE' },
          description: '이동을 종료하고 행동 단계로 넘어갑니다.',
        })
      } else {
        // 이동력이 0이면 행동 단계로
        validActions.push({
          action: { type: 'END_MOVE_PHASE' },
          description: '행동 단계로 넘어갑니다.',
        })
      }
    }

    // 행동 단계
    if (targetPlayer.turnPhase === 'action') {
      // 인접한 대상에 대한 기본 공격 (턴당 1회)
      if (!targetPlayer.hasUsedBasicAttack) {
        const neighbors = getNeighbors(targetPlayer.position)

        // 인접 플레이어 공격
        for (const player of state.players) {
          if (player.id === targetPlayer.id || player.isDead) continue
          if (player.isStealthed) continue  // 은신 중인 대상 공격 불가
          if (neighbors.some(n => coordEquals(n, player.position))) {
            validActions.push({
              action: { type: 'BASIC_ATTACK', targetId: player.id },
              description: `${player.name}을(를) 공격합니다.`,
            })
          }
        }

        // 인접 몬스터 공격 (마검 소유자는 몬스터 공격 불가)
        if (!targetPlayer.hasDemonSword) {
          for (const monster of state.monsters) {
            if (monster.isDead) continue
            if (neighbors.some(n => coordEquals(n, monster.position))) {
              validActions.push({
                action: { type: 'BASIC_ATTACK', targetId: monster.id },
                description: `${monster.name}을(를) 공격합니다.`,
              })
            }
          }
        }
      }

      // 사용 가능한 스킬 추가 (이번 턴에 사용한 비용 + 스킬 비용 <= 지능)
      const playerSkills = SKILLS_BY_CLASS[targetPlayer.heroClass]
      const intelligence = this.getStatTotal(targetPlayer.stats.intelligence)
      const remainingSkillCost = intelligence - targetPlayer.usedSkillCost
      for (const skill of playerSkills) {
        const cooldown = targetPlayer.skillCooldowns[skill.id] ?? 0
        if (cooldown === 0 && skill.cost <= remainingSkillCost) {
          validActions.push({
            action: { type: 'USE_SKILL', skillId: skill.id },
            description: `${skill.name} 사용 (비용: ${skill.cost}, 남은 비용: ${remainingSkillCost})`,
          })
        }
      }

      // 능력치 주사위 굴리기 (몬스터 정수가 충분할 때)
      // 레벨 = 가장 높은 능력치의 주사위 합
      const currentLevel = Math.max(
        targetPlayer.stats.strength[0] + targetPlayer.stats.strength[1],
        targetPlayer.stats.dexterity[0] + targetPlayer.stats.dexterity[1],
        targetPlayer.stats.intelligence[0] + targetPlayer.stats.intelligence[1]
      )
      if (targetPlayer.monsterEssence >= currentLevel) {
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

    // 비-턴 액션 추가
    validActions.push(...this.getNonTurnActions(state, targetPlayer))

    return validActions
  }

  /**
   * 턴과 무관한 액션 목록을 반환합니다 (계시 완료, 타락 주사위 적용 등)
   */
  private getNonTurnActions(state: GameState, player: Player): ValidAction[] {
    const validActions: ValidAction[] = []

    // 타락 주사위 적용 (타락 주사위가 있고 아직 적용 안 한 경우)
    if (player.corruptDice !== null && player.corruptDiceTarget === null) {
      validActions.push({
        action: { type: 'APPLY_CORRUPT_DICE', stat: 'strength' },
        description: '타락 주사위를 힘에 적용합니다.',
      })
      validActions.push({
        action: { type: 'APPLY_CORRUPT_DICE', stat: 'dexterity' },
        description: '타락 주사위를 민첩에 적용합니다.',
      })
      validActions.push({
        action: { type: 'APPLY_CORRUPT_DICE', stat: 'intelligence' },
        description: '타락 주사위를 지능에 적용합니다.',
      })
    }

    // 부활 시 신성 선택 (타락 상태에서 부활 직후)
    // 이 로직은 더 세밀한 조건이 필요할 수 있음
    // 현재는 타락 상태면 언제든 신성 선택 가능하도록 함
    if (player.state === 'corrupt') {
      validActions.push({
        action: { type: 'CHOOSE_HOLY' },
        description: '신성 상태로 전환합니다.',
      })
    }

    // 계시 완료는 특정 조건을 만족할 때만 가능 (revelations.ts에서 검증)
    // 여기서는 보유 중인 계시가 있으면 액션 추가
    for (const revelation of player.revelations) {
      validActions.push({
        action: { type: 'COMPLETE_REVELATION', revelationId: revelation.id },
        description: `계시 "${revelation.name}" 완료 시도`,
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
    return this.diceRoller.roll1d6()
  }

  /**
   * 2d6 굴리기
   */
  private roll2d6(): [number, number] {
    return this.diceRoller.roll2d6()
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

      // 초기 레벨 계산: [1,1] + [1,1] + [1,1] 중 최대 = 2
      const initialLevel = 2
      const initialMaxHealth = getMaxHealthByLevel(config.heroClass, initialLevel)

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
        health: initialMaxHealth,
        maxHealth: initialMaxHealth,
        position,
        revelations: [],
        completedRevelations: [],
        monsterEssence: 0,
        devilScore: 0,
        faithScore: 0,
        hasDemonSword: false,
        knowsDemonSwordPosition: false,
        isDead: false,
        deathTurnsRemaining: 0,
        skillCooldowns: {},
        usedSkillCost: 0,
        // 턴 관련 필드
        turnPhase: 'move' as const,
        remainingMovement: null,
        leftoverMovement: 0,
        turnCompleted: false,
        // 버프/상태 필드
        ironStanceActive: false,
        poisonActive: false,
        isStealthed: false,
        isEnhanced: false,
        isBound: false,
        traps: [],
        hasUsedBasicAttack: false,
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

  /**
   * 마검 초기 위치 설정
   * 이동 가능한 타일 중 랜덤한 위치에 마검 배치
   */
  private initializeDemonSwordPosition(): HexCoord {
    // 이동 가능한 타일 필터링 (blocked가 아닌 타일)
    const movableTiles = GAME_BOARD.filter(tile => {
      const moveCost = TERRAIN_MOVEMENT_COST[tile.type]
      return moveCost !== 'blocked'
    })

    // 랜덤하게 하나 선택
    const randomIndex = Math.floor(Math.random() * movableTiles.length)
    return movableTiles[randomIndex].coord
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

    const events: GameEvent[] = []
    let newState = { ...state }
    let message = ''

    // === 턴 시작 시 자동 처리 ===

    // 1. 산/호수 위치 체크 → 가장 가까운 이동 가능 타일로 자동 이동
    const board = deserializeBoard(state.board)
    const playerTile = getTile(board, currentPlayer.position)
    if (playerTile && (playerTile.type === 'mountain' || playerTile.type === 'lake')) {
      const neighbors = getNeighbors(currentPlayer.position)
      const escapeTiles = neighbors.filter(n => {
        const tile = getTile(board, n)
        if (!tile) return false
        const cost = TERRAIN_MOVEMENT_COST[tile.type]
        return cost !== 'blocked'
      })
      if (escapeTiles.length === 1) {
        const escapeTo = escapeTiles[0]
        newState = {
          ...newState,
          players: newState.players.map(p =>
            p.id === currentPlayer.id ? { ...p, position: escapeTo } : p
          ),
        }
        events.push({ type: 'PLAYER_MOVED', playerId: currentPlayer.id, from: currentPlayer.position, to: escapeTo })
        message += `산/호수에서 탈출! `
      } else if (escapeTiles.length > 1) {
        // 여러 개면 CHOOSE_ESCAPE_TILE로 선택해야 함 - 일단 첫 번째로 자동 이동
        const escapeTo = escapeTiles[0]
        newState = {
          ...newState,
          players: newState.players.map(p =>
            p.id === currentPlayer.id ? { ...p, position: escapeTo } : p
          ),
        }
        events.push({ type: 'PLAYER_MOVED', playerId: currentPlayer.id, from: currentPlayer.position, to: escapeTo })
        message += `산/호수에서 탈출! `
      }
    }

    // 2. 속박 해제 (이동력 0으로 설정)
    let boundOverride = false
    if (currentPlayer.isBound) {
      newState = {
        ...newState,
        players: newState.players.map(p =>
          p.id === currentPlayer.id ? { ...p, isBound: false } : p
        ),
      }
      boundOverride = true
      message += '속박이 해제되었습니다. 이번 턴은 이동할 수 없습니다. '
    }

    // 3. 무적 태세 해제
    if (currentPlayer.ironStanceActive) {
      newState = {
        ...newState,
        players: newState.players.map(p =>
          p.id === currentPlayer.id ? { ...p, ironStanceActive: false } : p
        ),
      }
    }

    // 4. 화염 타일 피해 (현재 위치가 화염이면)
    const updatedPlayer = newState.players.find(p => p.id === currentPlayer.id)!
    const updatedTile = getTile(board, updatedPlayer.position)
    if (updatedTile?.type === 'fire' && updatedPlayer.state !== 'corrupt' && !newState.monsterRoundBuffs.fireTileDisabled) {
      const fireDamage = TILE_EFFECTS.fire.baseDamage
      newState = {
        ...newState,
        players: newState.players.map(p => {
          if (p.id !== currentPlayer.id) return p
          const newHealth = Math.max(0, p.health - fireDamage)
          return {
            ...p,
            health: newHealth,
            isDead: newHealth <= 0,
            deathTurnsRemaining: newHealth <= 0 ? DEATH_RESPAWN_TURNS : p.deathTurnsRemaining,
          }
        }),
      }
      message += `화염 타일 피해 ${fireDamage}! `
      events.push({ type: 'PLAYER_ATTACKED', attackerId: 'fire', targetId: currentPlayer.id, damage: fireDamage })
    }

    // === 이동 주사위 굴리기 ===

    // 2d6 굴리기
    const [dice1, dice2] = this.roll2d6()
    const diceSum = dice1 + dice2

    // 이동력 = 2d6 + 민첩(주사위 2개 합)
    const dexBonus = this.getStatTotal(currentPlayer.stats.dexterity)
    let totalMovement = diceSum + dexBonus

    // 속박이었으면 이동력 0
    if (boundOverride) {
      totalMovement = 0
    }

    const newPlayers = newState.players.map(p =>
      p.id === currentPlayer.id
        ? { ...p, remainingMovement: totalMovement }
        : p
    )

    message += `이동 주사위: ${dice1} + ${dice2} = ${diceSum}, 민첩 보너스: +${dexBonus}. 총 이동력: ${boundOverride ? 0 : totalMovement}`
    events.push({ type: 'MOVE_DICE_ROLLED', playerId: currentPlayer.id, dice1, dice2, dexBonus, total: totalMovement })

    return {
      success: true,
      newState: {
        ...newState,
        players: newPlayers,
      },
      message,
      events,
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

    // 다른 살아있는 플레이어가 있는 타일 이동 불가
    if (state.players.some(p => p.id !== currentPlayer.id && !p.isDead && coordEquals(p.position, position))) {
      return {
        success: false,
        newState: state,
        message: '다른 플레이어가 있는 타일로 이동할 수 없습니다.',
        events: [],
      }
    }

    // 타락 용사의 신전 진입 불가 (마검 보유 시 가능)
    if (targetTile.type === 'temple' && currentPlayer.state === 'corrupt' && !currentPlayer.hasDemonSword) {
      return {
        success: false,
        newState: state,
        message: '타락한 용사는 신전에 진입할 수 없습니다. (마검 보유 시 가능)',
        events: [],
      }
    }

    // 언덕(all)은 이동력 3 이상 필요
    if (moveCost === 'all' && currentPlayer.remainingMovement < 3) {
      return {
        success: false,
        newState: state,
        message: '언덕 진입에는 이동력 3 이상이 필요합니다.',
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

    // 마왕성(castle) 진입 시 타락 상태면 마검 위치를 알게 됨
    const learnsDemonSwordPosition = targetTile.type === 'castle' && currentPlayer.state === 'corrupt'

    let newPlayers = state.players.map(p =>
      p.id === currentPlayer.id
        ? {
            ...p,
            position,
            remainingMovement: newRemainingMovement,
            turnPhase: newTurnPhase,
            knowsDemonSwordPosition: learnsDemonSwordPosition ? true : p.knowsDemonSwordPosition,
          }
        : p
    )

    const events: GameEvent[] = [{
      type: 'PLAYER_MOVED',
      playerId: currentPlayer.id,
      from,
      to: position,
    }]

    let message = `(${position.q}, ${position.r})로 이동했습니다. (이동력 -${actualCost}, 남은: ${newRemainingMovement})`
    if (learnsDemonSwordPosition && !currentPlayer.knowsDemonSwordPosition) {
      message += ' 마왕성에서 마검의 위치를 알게 되었습니다!'
    }

    // 화염 타일 경유 피해 (이동한 타일이 화염이면 피해)
    if (targetTile.type === 'fire' && currentPlayer.state !== 'corrupt' && !state.monsterRoundBuffs.fireTileDisabled) {
      const fireDamage = TILE_EFFECTS.fire.baseDamage
      newPlayers = newPlayers.map(p => {
        if (p.id !== currentPlayer.id) return p
        const newHealth = Math.max(0, p.health - fireDamage)
        const isDead = newHealth <= 0
        return {
          ...p,
          health: newHealth,
          isDead,
          deathTurnsRemaining: isDead ? DEATH_RESPAWN_TURNS : p.deathTurnsRemaining,
        }
      })
      message += ` 화염 타일 피해 ${fireDamage}!`
      events.push({ type: 'PLAYER_ATTACKED', attackerId: 'fire', targetId: currentPlayer.id, damage: fireDamage })
      const updatedPlayer = newPlayers.find(p => p.id === currentPlayer.id)
      if (updatedPlayer?.isDead) {
        events.push({ type: 'PLAYER_DIED', playerId: currentPlayer.id })
      }
    }

    // 함정 체크 (다른 플레이어의 함정을 밟았는지)
    for (const otherPlayer of state.players) {
      if (otherPlayer.id === currentPlayer.id || otherPlayer.isDead) continue
      const trapIndex = otherPlayer.traps.findIndex(t => t.q === position.q && t.r === position.r)
      if (trapIndex !== -1) {
        const trapDamage = otherPlayer.stats.dexterity[0] + otherPlayer.stats.dexterity[1]
        // 함정 제거 + 함정 주인 은신 활성
        newPlayers = newPlayers.map(p => {
          if (p.id === currentPlayer.id) {
            const newHealth = Math.max(0, p.health - trapDamage)
            return { ...p, health: newHealth, isDead: newHealth <= 0, deathTurnsRemaining: newHealth <= 0 ? DEATH_RESPAWN_TURNS : p.deathTurnsRemaining }
          }
          if (p.id === otherPlayer.id) {
            return { ...p, traps: p.traps.filter((_, i) => i !== trapIndex), isStealthed: true }
          }
          return p
        })
        events.push({ type: 'PLAYER_ATTACKED', attackerId: otherPlayer.id, targetId: currentPlayer.id, damage: trapDamage })
        message += ` 함정! ${otherPlayer.name}의 함정에 걸려 ${trapDamage} 피해!`
        const updatedPlayer2 = newPlayers.find(p => p.id === currentPlayer.id)
        if (updatedPlayer2?.isDead) {
          events.push({ type: 'PLAYER_DIED', playerId: currentPlayer.id })
        }
      }
    }

    return {
      success: true,
      newState: {
        ...state,
        players: newPlayers,
      },
      message,
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

    // 턴당 1회 제한
    if (currentPlayer.hasUsedBasicAttack) {
      return {
        success: false,
        newState: state,
        message: '이번 턴에 이미 기본 공격을 사용했습니다.',
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

    // 마검 소유자는 몬스터 공격 불가 (양방향 불가)
    if (targetMonster && currentPlayer.hasDemonSword) {
      return {
        success: false,
        newState: state,
        message: '마검 소유자는 몬스터를 공격할 수 없습니다.',
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

    // 은신 해제 (공격 시)
    let attackerStealthBroken = currentPlayer.isStealthed

    // 피해 계산: 힘(주사위 2개 합) + 독 바르기 보너스
    let damage = this.getStatTotal(currentPlayer.stats.strength)
    let poisonUsed = false
    if (currentPlayer.poisonActive) {
      damage += this.getStatTotal(currentPlayer.stats.dexterity)
      poisonUsed = true
    }

    let newState = { ...state }
    let targetName: string

    if (targetPlayer) {
      // 대상이 은신 상태면 공격 불가
      if (targetPlayer.isStealthed) {
        return {
          success: false,
          newState: state,
          message: '은신 중인 대상은 공격할 수 없습니다.',
          events: [],
        }
      }

      // 대상의 무적 태세로 피해 감소
      let actualDamage = damage
      if (targetPlayer.ironStanceActive) {
        const reduction = targetPlayer.stats.strength[0] + targetPlayer.stats.strength[1]
        actualDamage = Math.max(0, actualDamage - reduction)
      }

      // angel-7 (천사의 가호) 체크: 치명적 피해 시 보호
      const angel7Result = checkAngel7Protection(newState, targetId, currentPlayer.id, actualDamage)
      if (angel7Result.protected) {
        // 천사의 가호로 생존 - 공격자 상태 업데이트
        newState = {
          ...angel7Result.newState,
          players: angel7Result.newState.players.map(p =>
            p.id === currentPlayer.id
              ? {
                  ...p,
                  hasUsedBasicAttack: true,
                  poisonActive: poisonUsed ? false : p.poisonActive,
                  isStealthed: attackerStealthBroken ? false : p.isStealthed,
                }
              : p
          ),
        }
        events.push({
          type: 'PLAYER_ATTACKED',
          attackerId: currentPlayer.id,
          targetId,
          damage: actualDamage,
        })
        events.push(...angel7Result.events)

        // 이벤트 기반 계시 자동 완료 (공격자)
        const revResult = processEventRevelations(newState, {
          attackerId: currentPlayer.id,
          targetId,
          targetDied: false,
          targetIsMonster: false,
        })
        newState = revResult.newState
        events.push(...revResult.events)

        return {
          success: true,
          newState,
          message: `${targetPlayer.name}이(가) 천사의 가호로 생존했습니다! (체력 1)`,
          events,
        }
      }

      // 플레이어 공격
      targetName = targetPlayer.name
      const newHealth = Math.max(0, targetPlayer.health - actualDamage)
      const isDead = newHealth <= 0

      // 용사 처치 시 타락 로직
      let attackerCorruption = false
      let corruptDiceValue: number | null = null

      if (isDead && currentPlayer.state === 'holy' && targetPlayer.state === 'holy') {
        // 신성 용사가 비타락 용사를 처치하면 자동 타락
        attackerCorruption = true
        corruptDiceValue = 1
      } else if (isDead && currentPlayer.state === 'corrupt') {
        // 타락 용사가 처치하면 타락 주사위 +1
        const currentCorrupt = currentPlayer.corruptDice ?? 0
        corruptDiceValue = Math.min(6, currentCorrupt + 1)
      }
      // 타락 용사 처치 시 → CHOOSE_CORRUPTION 으로 선택 (isDead && targetPlayer.state === 'corrupt' && currentPlayer.state === 'holy')
      // 이 경우 자동 타락 하지 않고, 별도 CHOOSE_CORRUPTION 액션 대기
      // 여기서는 처치만 처리하고 타락 선택은 별도

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
            const updates: Partial<Player> = {
              hasUsedBasicAttack: true,
              poisonActive: poisonUsed ? false : p.poisonActive,
              isStealthed: attackerStealthBroken ? false : p.isStealthed,
            }
            if (attackerCorruption) {
              updates.state = 'corrupt' as const
              updates.corruptDice = corruptDiceValue
            } else if (corruptDiceValue !== null) {
              updates.corruptDice = corruptDiceValue
            }
            return { ...p, ...updates }
          }
          return p
        }),
      }

      events.push({
        type: 'PLAYER_ATTACKED',
        attackerId: currentPlayer.id,
        targetId,
        damage: actualDamage,
      })

      if (isDead) {
        events.push({
          type: 'PLAYER_DIED',
          playerId: targetId,
        })
      }

      // 이벤트 기반 계시 자동 완료 (공격자 - 플레이어 공격)
      const revResult = processEventRevelations(newState, {
        attackerId: currentPlayer.id,
        targetId,
        targetDied: isDead,
        targetIsMonster: false,
      })
      newState = revResult.newState
      events.push(...revResult.events)
    } else {
      // 몬스터 공격
      const monster = targetMonster!
      targetName = monster.name

      // 골렘 기본 공격 면역 체크
      if (monster.id === 'golem' && state.monsterRoundBuffs.golemBasicAttackImmune) {
        // 기본 공격 면역이지만 hasUsedBasicAttack은 소모
        newState = {
          ...newState,
          players: state.players.map(p =>
            p.id === currentPlayer.id
              ? { ...p, hasUsedBasicAttack: true, poisonActive: poisonUsed ? false : p.poisonActive, isStealthed: attackerStealthBroken ? false : p.isStealthed }
              : p
          ),
        }
        return {
          success: true,
          newState,
          message: `${targetName}이(가) 기본 공격을 무시했습니다!`,
          events: [],
        }
      }

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
        players: state.players.map(p =>
          p.id === currentPlayer.id
            ? {
                ...p,
                monsterEssence: p.monsterEssence + actualDamage,
                hasUsedBasicAttack: true,
                poisonActive: poisonUsed ? false : p.poisonActive,
                isStealthed: attackerStealthBroken ? false : p.isStealthed,
              }
            : p
        ),
      }

      // 발록 사망 시 화염 타일 비활성
      if (isDead && targetId === 'balrog') {
        newState = {
          ...newState,
          monsterRoundBuffs: { ...newState.monsterRoundBuffs, fireTileDisabled: true },
        }
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

      // 이벤트 기반 계시 자동 완료 (공격자 - 몬스터 공격)
      const revResult = processEventRevelations(newState, {
        attackerId: currentPlayer.id,
        targetId,
        targetDied: isDead,
        targetIsMonster: true,
        targetMonsterId: monster.id,
      })
      newState = revResult.newState
      events.push(...revResult.events)
    }

    return {
      success: true,
      newState,
      message: `${targetName}에게 ${damage}의 피해를 입혔습니다.${poisonUsed ? ' (독 추가 피해)' : ''}`,
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

    // 현재 레벨 계산 (가장 높은 능력치의 주사위 합)
    const currentLevel = Math.max(
      currentPlayer.stats.strength[0] + currentPlayer.stats.strength[1],
      currentPlayer.stats.dexterity[0] + currentPlayer.stats.dexterity[1],
      currentPlayer.stats.intelligence[0] + currentPlayer.stats.intelligence[1]
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

    // 능력치 주사위 값
    const statDice = currentPlayer.stats[stat]

    // 1d6 굴리기
    const roll = this.rollDice()

    // 굴린 값보다 낮은 주사위들 찾기
    const lowerDiceIndices: number[] = []
    if (statDice[0] < roll) lowerDiceIndices.push(0)
    if (statDice[1] < roll) lowerDiceIndices.push(1)

    // 굴린 값보다 낮은 주사위가 없으면 실패
    const success = lowerDiceIndices.length > 0

    // 이전 최대 체력 저장
    const oldMaxHealth = currentPlayer.maxHealth

    let newPlayers = state.players.map(p =>
      p.id === currentPlayer.id
        ? { ...p, monsterEssence: p.monsterEssence - requiredEssence }
        : p
    )

    const statNames: Record<keyof Stats, string> = {
      strength: '힘',
      dexterity: '민첩',
      intelligence: '지능',
    }

    if (success) {
      // 굴린 값보다 낮은 주사위들 중 가장 높은 값을 가진 주사위를 +1
      const targetIndex = lowerDiceIndices.reduce((maxIdx, idx) =>
        statDice[idx] > statDice[maxIdx] ? idx : maxIdx
      , lowerDiceIndices[0])

      const oldValue = statDice[targetIndex]
      const newStatDice: [number, number] = [...statDice] as [number, number]
      newStatDice[targetIndex] = oldValue + 1

      // 새 레벨 계산 (업그레이드된 능력치 반영)
      const updatedStats = {
        ...currentPlayer.stats,
        [stat]: newStatDice,
      }
      const newLevel = Math.max(
        updatedStats.strength[0] + updatedStats.strength[1],
        updatedStats.dexterity[0] + updatedStats.dexterity[1],
        updatedStats.intelligence[0] + updatedStats.intelligence[1]
      )

      // 새 레벨에 따른 최대 체력 계산
      const newMaxHealth = getMaxHealthByLevel(currentPlayer.heroClass, newLevel)
      const healthDiff = newMaxHealth - oldMaxHealth

      newPlayers = newPlayers.map(p =>
        p.id === currentPlayer.id
          ? {
              ...p,
              stats: updatedStats,
              maxHealth: newMaxHealth,
              // 최대 체력이 증가하면 현재 체력도 같은 양만큼 증가
              health: p.health + healthDiff,
            }
          : p
      )

      return {
        success: true,
        newState: { ...state, players: newPlayers },
        message: `${statNames[stat]} 주사위 굴림: ${roll}. 업그레이드 성공! [${statDice[0]}, ${statDice[1]}] → [${newStatDice[0]}, ${newStatDice[1]}]`,
        events: [],
      }
    }

    return {
      success: true,
      newState: { ...state, players: newPlayers },
      message: `${statNames[stat]} 주사위 굴림: ${roll}. 업그레이드 실패. (현재: [${statDice[0]}, ${statDice[1]}], 둘 다 ${roll} 이상)`,
      events: [],
    }
  }

  /**
   * 이동 페이즈 종료 처리 (move → action 페이즈 전환)
   */
  private handleEndMovePhase(state: GameState): ActionResult {
    const currentPlayer = this.getCurrentPlayer(state)

    if (!currentPlayer) {
      return {
        success: false,
        newState: state,
        message: '몬스터 턴에는 이동 페이즈를 종료할 수 없습니다.',
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

    // action 페이즈에서만 턴 종료 가능
    if (currentPlayer.turnPhase === 'move') {
      return {
        success: false,
        newState: state,
        message: '이동 단계에서는 턴을 종료할 수 없습니다. END_MOVE_PHASE를 사용하세요.',
        events: [],
      }
    }

    // 마을 회복 처리 (턴 종료 시)
    const board = deserializeBoard(state.board)
    const playerTile = getTile(board, currentPlayer.position)
    let villageHeal = 0
    if (playerTile?.type === 'village' && !currentPlayer.isDead) {
      const healAmount = playerTile.villageClass === currentPlayer.heroClass
        ? TILE_EFFECTS.village.selfClassHeal
        : TILE_EFFECTS.village.otherClassHeal
      villageHeal = Math.min(healAmount, currentPlayer.maxHealth - currentPlayer.health)
    }

    // 행동 단계에서 END_TURN: 턴 완료 및 다음 턴으로
    // leftoverMovement 저장, usedSkillCost 리셋, hasUsedBasicAttack 리셋
    let newPlayers = state.players.map(p =>
      p.id === currentPlayer.id
        ? {
            ...p,
            leftoverMovement: p.remainingMovement ?? 0,
            remainingMovement: null,
            turnPhase: 'move' as const, // 다음 라운드를 위해 리셋
            usedSkillCost: 0, // 스킬 비용 리셋
            hasUsedBasicAttack: false, // 기본 공격 사용 리셋
            health: p.health + villageHeal, // 마을 회복
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

      // 부활한 플레이어에게 계시 카드 1장 지급 (천사/마왕 중 랜덤)
      let revState = { ...newState, players: newPlayers }
      for (const evt of events) {
        if (evt.type === 'PLAYER_RESPAWNED') {
          const source = Math.random() < 0.5 ? 'angel' as const : 'demon' as const
          const revResult = drawRevelation(revState, evt.playerId, source)
          revState = revResult.newState
        }
      }
      newPlayers = revState.players
      newState = { ...newState, revelationDeck: revState.revelationDeck }

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
   * 몬스터 단계 처리 (monsters.ts 모듈에 위임)
   */
  private processMonsterPhase(state: GameState): { newState: GameState; events: GameEvent[] } {
    return processMonsterPhaseFromModule(state)
  }

  private handleCompleteRevelation(
    state: GameState,
    revelationId: string,
    playerId: string
  ): ActionResult {
    const player = state.players.find(p => p.id === playerId)

    if (!player) {
      return {
        success: false,
        newState: state,
        message: '플레이어를 찾을 수 없습니다.',
        events: [],
      }
    }

    const result = completeRevelation(state, playerId, revelationId)

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
    stat: keyof Stats,
    playerId: string
  ): ActionResult {
    const player = state.players.find(p => p.id === playerId)

    if (!player) {
      return {
        success: false,
        newState: state,
        message: '플레이어를 찾을 수 없습니다.',
        events: [],
      }
    }

    // 타락 주사위가 있어야 함
    if (player.corruptDice === null) {
      return {
        success: false,
        newState: state,
        message: '타락 주사위가 없습니다.',
        events: [],
      }
    }

    // 이미 적용된 능력치가 있으면 에러
    if (player.corruptDiceTarget !== null) {
      return {
        success: false,
        newState: state,
        message: '타락 주사위가 이미 적용되어 있습니다.',
        events: [],
      }
    }

    const newPlayers = state.players.map(p =>
      p.id === playerId
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
      message: `타락 주사위(${player.corruptDice})를 ${statNames[stat]}에 적용했습니다.`,
      events: [],
    }
  }

  /**
   * 부활 시 신성 선택 (타락에서 신성으로 전환)
   */
  private handleChooseHoly(state: GameState, playerId: string): ActionResult {
    const player = state.players.find(p => p.id === playerId)

    if (!player) {
      return {
        success: false,
        newState: state,
        message: '플레이어를 찾을 수 없습니다.',
        events: [],
      }
    }

    // 부활 직후여야 함 (타락 상태에서만 가능)
    if (player.state !== 'corrupt') {
      return {
        success: false,
        newState: state,
        message: '신성 상태에서는 선택할 수 없습니다.',
        events: [],
      }
    }

    const newPlayers = state.players.map(p =>
      p.id === playerId
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

  /**
   * 마검 뽑기
   * - 타락 상태여야 함
   * - 마검 위치를 알고 있어야 함 (마왕성 방문 경험)
   * - 마검 위치에 있어야 함
   * - 마검이 아직 뽑히지 않았어야 함
   */
  private handleDrawDemonSword(state: GameState, playerId: string): ActionResult {
    const player = state.players.find(p => p.id === playerId)

    if (!player) {
      return {
        success: false,
        newState: state,
        message: '플레이어를 찾을 수 없습니다.',
        events: [],
      }
    }

    // 타락 상태여야 함
    if (player.state !== 'corrupt') {
      return {
        success: false,
        newState: state,
        message: '타락 상태에서만 마검을 뽑을 수 있습니다.',
        events: [],
      }
    }

    // 마검 위치를 알고 있어야 함 (마왕성 방문 필요)
    if (!player.knowsDemonSwordPosition) {
      return {
        success: false,
        newState: state,
        message: '마검의 위치를 모릅니다. 먼저 마왕성을 방문해야 합니다.',
        events: [],
      }
    }

    // 마검이 이미 뽑혔는지 확인
    if (state.demonSwordPosition === null) {
      return {
        success: false,
        newState: state,
        message: '마검은 이미 누군가에게 있습니다.',
        events: [],
      }
    }

    // 마검 위치에 있는지 확인
    const swordPos = state.demonSwordPosition
    if (player.position.q !== swordPos.q || player.position.r !== swordPos.r) {
      return {
        success: false,
        newState: state,
        message: '마검이 있는 위치가 아닙니다.',
        events: [],
      }
    }

    // 마검 획득
    const newPlayers = state.players.map(p =>
      p.id === playerId
        ? { ...p, hasDemonSword: true }
        : p
    )

    return {
      success: true,
      newState: {
        ...state,
        players: newPlayers,
        demonSwordPosition: null,  // 마검 위치 제거
      },
      message: `${player.name}이(가) 마검을 뽑았습니다!`,
      events: [],
    }
  }

  /**
   * 타락 용사 처치 후 타락 여부 선택
   */
  private handleChooseCorruption(state: GameState, accept: boolean, playerId: string): ActionResult {
    const player = state.players.find(p => p.id === playerId)

    if (!player) {
      return {
        success: false,
        newState: state,
        message: '플레이어를 찾을 수 없습니다.',
        events: [],
      }
    }

    if (!accept) {
      return {
        success: true,
        newState: state,
        message: '타락을 거부하고 신성 상태를 유지합니다.',
        events: [],
      }
    }

    // 타락 전환 + 타락 주사위 획득
    const newPlayers = state.players.map(p =>
      p.id === playerId
        ? {
            ...p,
            state: 'corrupt' as const,
            corruptDice: (p.corruptDice ?? 0) + 1,
          }
        : p
    )

    return {
      success: true,
      newState: { ...state, players: newPlayers },
      message: '타락을 선택했습니다. 타락 주사위를 획득합니다.',
      events: [],
    }
  }

  /**
   * 산/호수 탈출 시 목적지 선택
   */
  private handleChooseEscapeTile(state: GameState, position: HexCoord, playerId: string): ActionResult {
    const player = state.players.find(p => p.id === playerId)

    if (!player) {
      return {
        success: false,
        newState: state,
        message: '플레이어를 찾을 수 없습니다.',
        events: [],
      }
    }

    const boardMap = deserializeBoard(state.board)
    const targetTile = getTile(boardMap, position)
    if (!targetTile) {
      return {
        success: false,
        newState: state,
        message: '존재하지 않는 타일입니다.',
        events: [],
      }
    }

    const cost = TERRAIN_MOVEMENT_COST[targetTile.type]
    if (cost === 'blocked') {
      return {
        success: false,
        newState: state,
        message: '이동할 수 없는 타일입니다.',
        events: [],
      }
    }

    const newPlayers = state.players.map(p =>
      p.id === playerId ? { ...p, position } : p
    )

    return {
      success: true,
      newState: { ...state, players: newPlayers },
      message: `(${position.q}, ${position.r})로 탈출했습니다.`,
      events: [{ type: 'PLAYER_MOVED' as const, playerId, from: player.position, to: position }],
    }
  }
}
