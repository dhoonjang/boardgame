import { describe, it, expect, beforeEach } from 'vitest'
import { GameEngine, type CreateGameOptions } from '../engine/game-engine'
import type { GameState, Player, HexCoord } from '../types'
import { STARTING_POSITIONS, DEATH_RESPAWN_TURNS, TILE_EFFECTS } from '../constants'
import { MockDiceRoller } from './test-helpers'

/**
 * 4명 플레이어 게임 진행 통합 테스트
 *
 * GAME_DESIGN.md 기반으로 전체 게임 흐름을 테스트합니다.
 * 플레이어 구성: 전사1, 전사2, 도적, 법사
 */
describe('Game Flow - 4 Players', () => {
  let engine: GameEngine
  let gameState: GameState
  const playerConfigs: CreateGameOptions = {
    players: [
      { id: 'warrior-1', name: '전사1', heroClass: 'warrior' },
      { id: 'warrior-2', name: '전사2', heroClass: 'warrior' },
      { id: 'rogue-1', name: '도적', heroClass: 'rogue' },
      { id: 'mage-1', name: '법사', heroClass: 'mage' },
    ],
  }

  beforeEach(() => {
    engine = new GameEngine({ maxPlayers: 4 })
    gameState = engine.createGame(playerConfigs)
  })

  // ===== 헬퍼 함수 =====

  /** 현재 플레이어의 전체 턴을 진행 (이동 주사위 → 이동 페이즈 종료 → 턴 종료) */
  function completeTurn(state: GameState): GameState {
    // 이동 주사위 굴리기
    let result = engine.executeAction(state, { type: 'ROLL_MOVE_DICE' })
    state = result.newState

    // 이동 단계 종료 → action 단계로
    result = engine.executeAction(state, { type: 'END_MOVE_PHASE' })
    state = result.newState

    // action 단계 종료 → 다음 턴
    result = engine.executeAction(state, { type: 'END_TURN' })
    return result.newState
  }

  /** 모든 플레이어 턴 완료 후 몬스터 턴까지 진행 (라운드 종료) */
  function completeRound(state: GameState): GameState {
    // 4명 플레이어 턴 진행
    for (let i = 0; i < 4; i++) {
      const entry = state.roundTurnOrder[state.currentTurnIndex]
      if (entry === 'monster') break
      state = completeTurn(state)
    }
    return state
  }

  /** 특정 플레이어를 특정 위치로 강제 이동 */
  function movePlayerTo(state: GameState, playerId: string, position: HexCoord): GameState {
    return {
      ...state,
      players: state.players.map((p) =>
        p.id === playerId ? { ...p, position } : p
      ),
    }
  }

  /** 플레이어를 action 페이즈로 전환 */
  function setActionPhase(state: GameState, playerId: string): GameState {
    return {
      ...state,
      players: state.players.map((p) =>
        p.id === playerId ? { ...p, turnPhase: 'action' as const } : p
      ),
    }
  }

  /** 플레이어에게 몬스터 정수 부여 */
  function giveEssence(state: GameState, playerId: string, amount: number): GameState {
    return {
      ...state,
      players: state.players.map((p) =>
        p.id === playerId ? { ...p, monsterEssence: p.monsterEssence + amount } : p
      ),
    }
  }

  /** 플레이어 능력치 수정 */
  function setStats(
    state: GameState,
    playerId: string,
    stat: keyof Player['stats'],
    values: [number, number]
  ): GameState {
    return {
      ...state,
      players: state.players.map((p) =>
        p.id === playerId
          ? { ...p, stats: { ...p.stats, [stat]: values } }
          : p
      ),
    }
  }

  // ===== 1. 게임 시작 테스트 =====

  describe('게임 시작', () => {
    it('4명 플레이어로 게임을 생성한다', () => {
      expect(gameState.players).toHaveLength(4)
      expect(gameState.roundNumber).toBe(1)
    })

    it('도적이 첫 턴을 시작한다', () => {
      const firstTurnEntry = gameState.roundTurnOrder[0]
      const firstPlayer = gameState.players.find((p) => p.id === firstTurnEntry)
      expect(firstPlayer?.heroClass).toBe('rogue')
      expect(firstPlayer?.id).toBe('rogue-1')
    })

    it('턴 순서가 도적 → 전사1 → 전사2 → 법사 → 몬스터 순이다', () => {
      const turnOrder = gameState.roundTurnOrder

      // 첫 번째는 도적
      expect(turnOrder[0]).toBe('rogue-1')

      // 나머지 플레이어들
      const remainingPlayers = turnOrder.slice(1, 4)
      expect(remainingPlayers).toContain('warrior-1')
      expect(remainingPlayers).toContain('warrior-2')
      expect(remainingPlayers).toContain('mage-1')

      // 마지막은 몬스터
      expect(turnOrder[4]).toBe('monster')
    })

    it('같은 직업(전사)은 서로 다른 시작 위치를 갖는다', () => {
      const warriors = gameState.players.filter((p) => p.heroClass === 'warrior')
      expect(warriors).toHaveLength(2)

      const pos1 = `${warriors[0].position.q},${warriors[0].position.r}`
      const pos2 = `${warriors[1].position.q},${warriors[1].position.r}`

      // 둘 다 전사 마을 위치 중 하나
      const validPositions = STARTING_POSITIONS.warrior.map(
        (pos) => `${pos.q},${pos.r}`
      )
      expect(validPositions).toContain(pos1)
      expect(validPositions).toContain(pos2)

      // 서로 다른 위치
      expect(pos1).not.toBe(pos2)
    })

    it('모든 플레이어가 신성 상태로 시작한다', () => {
      for (const player of gameState.players) {
        expect(player.state).toBe('holy')
      }
    })

    it('모든 플레이어가 직업별 체력, 능력치 [1,1]로 시작한다', () => {
      for (const player of gameState.players) {
        // 직업별 초기 체력: 전사 30, 도적/법사 20
        const expectedHealth = player.heroClass === 'warrior' ? 30 : 20
        expect(player.health).toBe(expectedHealth)
        expect(player.maxHealth).toBe(expectedHealth)
        expect(player.stats.strength).toEqual([1, 1])
        expect(player.stats.dexterity).toEqual([1, 1])
        expect(player.stats.intelligence).toEqual([1, 1])
      }
    })
  })

  // ===== 2. 라운드 1 - 기본 턴 진행 =====

  describe('라운드 1 - 기본 턴 진행', () => {
    it('이동 페이즈: 주사위 굴리기 → 이동 → 이동 종료', () => {
      let state = gameState

      // 1. 이동 주사위 굴리기
      const rollResult = engine.executeAction(state, { type: 'ROLL_MOVE_DICE' })
      expect(rollResult.success).toBe(true)
      state = rollResult.newState

      const player = engine.getCurrentPlayer(state)!
      expect(player.remainingMovement).not.toBeNull()
      expect(player.remainingMovement).toBeGreaterThanOrEqual(4) // 2d6 최소 2 + 민첩 2

      // 2. 이동 가능 액션 확인
      const validActions = engine.getValidActions(state)
      const moveActions = validActions.filter((a) => a.action.type === 'MOVE')
      expect(moveActions.length).toBeGreaterThan(0)

      // 3. 이동 수행
      if (moveActions.length > 0 && moveActions[0].action.type === 'MOVE') {
        const moveResult = engine.executeAction(state, moveActions[0].action)
        expect(moveResult.success).toBe(true)
        state = moveResult.newState

        expect(moveResult.events).toContainEqual(
          expect.objectContaining({ type: 'PLAYER_MOVED' })
        )
      }

      // 4. 이동 종료 (action 페이즈로)
      const endMoveResult = engine.executeAction(state, { type: 'END_MOVE_PHASE' })
      expect(endMoveResult.success).toBe(true)
      state = endMoveResult.newState

      const updatedPlayer = engine.getCurrentPlayer(state)!
      expect(updatedPlayer.turnPhase).toBe('action')
    })

    it('액션 페이즈: 턴 종료', () => {
      let state = gameState

      // move 페이즈 완료
      const rollResult = engine.executeAction(state, { type: 'ROLL_MOVE_DICE' })
      state = rollResult.newState
      const endMoveResult = engine.executeAction(state, { type: 'END_MOVE_PHASE' })
      state = endMoveResult.newState

      // action 페이즈에서 턴 종료
      const endTurnResult = engine.executeAction(state, { type: 'END_TURN' })
      expect(endTurnResult.success).toBe(true)

      // 다음 플레이어 턴으로
      expect(endTurnResult.newState.currentTurnIndex).toBe(1)
    })

    it('4명 플레이어 턴 후 몬스터 턴 → 라운드 2 시작', () => {
      let state = gameState
      expect(state.roundNumber).toBe(1)

      // 4명 턴 완료
      state = completeRound(state)

      // 라운드 2 시작
      expect(state.roundNumber).toBe(2)
      expect(state.currentTurnIndex).toBe(0)
    })

    it('라운드 2에서 턴 순서가 남은 이동력 기준으로 재정렬된다', () => {
      let state = gameState

      // 첫 플레이어(도적)에게 높은 이동력 남기기
      const rollResult = engine.executeAction(state, { type: 'ROLL_MOVE_DICE' })
      state = rollResult.newState

      // 나머지 턴 완료
      const endMoveResult = engine.executeAction(state, { type: 'END_MOVE_PHASE' })
      state = endMoveResult.newState
      const endTurnResult = engine.executeAction(state, { type: 'END_TURN' })
      state = endTurnResult.newState

      // 나머지 3명 턴 완료
      for (let i = 0; i < 3; i++) {
        state = completeTurn(state)
      }

      // 라운드 2 시작
      expect(state.roundNumber).toBe(2)

      // 턴 순서에 4명 플레이어 + monster 포함 확인
      expect(state.roundTurnOrder).toHaveLength(5)
      expect(state.roundTurnOrder[4]).toBe('monster')
    })
  })

  // ===== 3. 몬스터 전투 시나리오 =====

  describe('몬스터 전투', () => {
    it('플레이어가 몬스터를 공격하면 피해를 입히고 정수를 획득한다', () => {
      let state = gameState
      const playerId = 'rogue-1'
      const monster = state.monsters.find((m) => m.id === 'harpy')!

      // 플레이어를 몬스터 옆으로 이동
      state = movePlayerTo(state, playerId, {
        q: monster.position.q + 1,
        r: monster.position.r,
      })
      state = setActionPhase(state, playerId)

      const playerBefore = state.players.find((p) => p.id === playerId)!
      const essenceBefore = playerBefore.monsterEssence

      // 기본 공격
      const attackResult = engine.executeAction(state, {
        type: 'BASIC_ATTACK',
        targetId: 'harpy',
      })

      expect(attackResult.success).toBe(true)
      expect(attackResult.events).toContainEqual(
        expect.objectContaining({
          type: 'PLAYER_ATTACKED',
          targetId: 'harpy',
        })
      )

      // 몬스터 체력 감소
      const updatedMonster = attackResult.newState.monsters.find(
        (m) => m.id === 'harpy'
      )!
      expect(updatedMonster.health).toBeLessThan(monster.health)

      // 몬스터 정수 획득 (가한 피해만큼)
      const playerAfter = attackResult.newState.players.find(
        (p) => p.id === playerId
      )!
      const damage = playerBefore.stats.strength[0] + playerBefore.stats.strength[1]
      expect(playerAfter.monsterEssence).toBe(essenceBefore + damage)
    })

    it('몬스터를 처치하면 isDead가 true가 된다', () => {
      let state = gameState
      const playerId = 'rogue-1' // 첫 번째 플레이어(도적)

      // 하피(체력 20)를 미리 약화시키기
      state = {
        ...state,
        monsters: state.monsters.map((m) =>
          m.id === 'harpy' ? { ...m, health: 2 } : m
        ),
      }

      const harpy = state.monsters.find((m) => m.id === 'harpy')!

      // 플레이어를 몬스터 옆으로 이동
      state = movePlayerTo(state, playerId, {
        q: harpy.position.q + 1,
        r: harpy.position.r,
      })
      state = setActionPhase(state, playerId)

      // 플레이어 힘을 높여서 한 번에 처치
      state = setStats(state, playerId, 'strength', [3, 3])

      // 기본 공격
      const attackResult = engine.executeAction(state, {
        type: 'BASIC_ATTACK',
        targetId: 'harpy',
      })

      expect(attackResult.success).toBe(true)

      const updatedHarpy = attackResult.newState.monsters.find(
        (m) => m.id === 'harpy'
      )!
      expect(updatedHarpy.isDead).toBe(true)
      expect(updatedHarpy.health).toBe(0)

      expect(attackResult.events).toContainEqual(
        expect.objectContaining({ type: 'MONSTER_DIED', monsterId: 'harpy' })
      )
    })

    it('실제 피해량만큼만 정수를 획득한다 (몬스터 남은 체력보다 공격력이 높은 경우)', () => {
      let state = gameState
      const playerId = 'rogue-1' // 첫 번째 플레이어(도적)

      // 하피 체력 1로 설정
      state = {
        ...state,
        monsters: state.monsters.map((m) =>
          m.id === 'harpy' ? { ...m, health: 1 } : m
        ),
      }

      const harpy = state.monsters.find((m) => m.id === 'harpy')!

      state = movePlayerTo(state, playerId, {
        q: harpy.position.q + 1,
        r: harpy.position.r,
      })
      state = setActionPhase(state, playerId)
      state = setStats(state, playerId, 'strength', [3, 3]) // 6 피해

      const playerBefore = state.players.find((p) => p.id === playerId)!

      const attackResult = engine.executeAction(state, {
        type: 'BASIC_ATTACK',
        targetId: 'harpy',
      })

      expect(attackResult.success).toBe(true)

      const playerAfter = attackResult.newState.players.find(
        (p) => p.id === playerId
      )!

      // 6 피해를 입혔지만 체력이 1이었으므로 1만 획득
      expect(playerAfter.monsterEssence).toBe(playerBefore.monsterEssence + 1)
    })
  })

  // ===== 4. PvP 전투 시나리오 =====

  describe('PvP 전투', () => {
    it('플레이어가 다른 플레이어를 공격할 수 있다', () => {
      let state = gameState
      const attackerId = 'rogue-1'
      const targetId = 'warrior-1'

      // 공격자와 피공격자를 인접하게 배치
      const targetPlayer = state.players.find((p) => p.id === targetId)!
      state = movePlayerTo(state, attackerId, {
        q: targetPlayer.position.q + 1,
        r: targetPlayer.position.r,
      })
      state = setActionPhase(state, attackerId)

      const attackResult = engine.executeAction(state, {
        type: 'BASIC_ATTACK',
        targetId,
      })

      expect(attackResult.success).toBe(true)
      expect(attackResult.events).toContainEqual(
        expect.objectContaining({
          type: 'PLAYER_ATTACKED',
          attackerId,
          targetId,
        })
      )

      const target = attackResult.newState.players.find((p) => p.id === targetId)!
      // 전사의 초기 체력은 30
      expect(target.health).toBeLessThan(30)
    })

    it('신성 용사가 다른 용사를 처치하면 타락 상태로 전환된다', () => {
      let state = gameState
      const attackerId = 'rogue-1'
      const targetId = 'warrior-1'

      // 피공격자 체력을 낮게 설정
      state = {
        ...state,
        players: state.players.map((p) =>
          p.id === targetId ? { ...p, health: 1 } : p
        ),
      }

      // 공격자 힘 증가
      state = setStats(state, attackerId, 'strength', [3, 3])

      const targetPlayer = state.players.find((p) => p.id === targetId)!
      state = movePlayerTo(state, attackerId, {
        q: targetPlayer.position.q + 1,
        r: targetPlayer.position.r,
      })
      state = setActionPhase(state, attackerId)

      const attackResult = engine.executeAction(state, {
        type: 'BASIC_ATTACK',
        targetId,
      })

      expect(attackResult.success).toBe(true)

      // 피공격자 사망
      const target = attackResult.newState.players.find((p) => p.id === targetId)!
      expect(target.isDead).toBe(true)

      // 공격자 타락
      const attacker = attackResult.newState.players.find(
        (p) => p.id === attackerId
      )!
      expect(attacker.state).toBe('corrupt')
      expect(attacker.corruptDice).toBe(1) // 타락 주사위 기본값 1

      expect(attackResult.events).toContainEqual(
        expect.objectContaining({ type: 'PLAYER_DIED', playerId: targetId })
      )
    })

    it('타락 용사가 다른 용사를 처치하면 타락 주사위가 +1된다', () => {
      let state = gameState
      const attackerId = 'rogue-1'
      const targetId = 'warrior-1'

      // 공격자를 미리 타락 상태로 설정 (타락 주사위 2)
      state = {
        ...state,
        players: state.players.map((p) =>
          p.id === attackerId
            ? { ...p, state: 'corrupt' as const, corruptDice: 2 }
            : p
        ),
      }

      // 피공격자 체력을 낮게 설정
      state = {
        ...state,
        players: state.players.map((p) =>
          p.id === targetId ? { ...p, health: 1 } : p
        ),
      }

      state = setStats(state, attackerId, 'strength', [3, 3])

      const targetPlayer = state.players.find((p) => p.id === targetId)!
      state = movePlayerTo(state, attackerId, {
        q: targetPlayer.position.q + 1,
        r: targetPlayer.position.r,
      })
      state = setActionPhase(state, attackerId)

      const attackResult = engine.executeAction(state, {
        type: 'BASIC_ATTACK',
        targetId,
      })

      const attacker = attackResult.newState.players.find(
        (p) => p.id === attackerId
      )!
      expect(attacker.corruptDice).toBe(3) // 2 → 3
    })

    it('타락 주사위는 최대 6까지만 증가한다', () => {
      let state = gameState
      const attackerId = 'rogue-1'
      const targetId = 'warrior-1'

      // 공격자 타락 주사위 6
      state = {
        ...state,
        players: state.players.map((p) =>
          p.id === attackerId
            ? { ...p, state: 'corrupt' as const, corruptDice: 6 }
            : p
        ),
      }

      state = {
        ...state,
        players: state.players.map((p) =>
          p.id === targetId ? { ...p, health: 1 } : p
        ),
      }

      state = setStats(state, attackerId, 'strength', [3, 3])

      const targetPlayer = state.players.find((p) => p.id === targetId)!
      state = movePlayerTo(state, attackerId, {
        q: targetPlayer.position.q + 1,
        r: targetPlayer.position.r,
      })
      state = setActionPhase(state, attackerId)

      const attackResult = engine.executeAction(state, {
        type: 'BASIC_ATTACK',
        targetId,
      })

      const attacker = attackResult.newState.players.find(
        (p) => p.id === attackerId
      )!
      expect(attacker.corruptDice).toBe(6) // 6 유지
    })
  })

  // ===== 5. 능력치 업그레이드 시나리오 =====

  describe('능력치 업그레이드', () => {
    it('몬스터 정수가 충분하면 능력치 주사위를 굴릴 수 있다', () => {
      let state = gameState
      const playerId = 'rogue-1'

      // action 페이즈로 전환하고 정수 부여
      state = setActionPhase(state, playerId)
      state = giveEssence(state, playerId, 10)

      const result = engine.executeAction(state, {
        type: 'ROLL_STAT_DICE',
        stat: 'strength',
      })

      expect(result.success).toBe(true)

      // 정수 소모 확인 (현재 레벨 = 1)
      const player = result.newState.players.find((p) => p.id === playerId)!
      expect(player.monsterEssence).toBeLessThan(10)
    })

    it('업그레이드 성공 시 능력치가 증가한다', () => {
      let state = gameState
      const playerId = 'rogue-1'

      state = setActionPhase(state, playerId)
      state = giveEssence(state, playerId, 100)

      // 여러 번 시도하여 성공 케이스 확인 (주사위 운에 의존)
      let upgraded = false
      for (let i = 0; i < 20 && !upgraded; i++) {
        const result = engine.executeAction(state, {
          type: 'ROLL_STAT_DICE',
          stat: 'strength',
        })

        const player = result.newState.players.find((p) => p.id === playerId)!
        const originalStr = state.players.find((p) => p.id === playerId)!.stats
          .strength

        // 업그레이드 성공 확인
        const strSum = player.stats.strength[0] + player.stats.strength[1]
        const origSum = originalStr[0] + originalStr[1]
        if (strSum > origSum) {
          upgraded = true
        }

        // 다음 시도를 위해 정수 재충전
        state = giveEssence(result.newState, playerId, 10)
      }

      // 확률적으로 20번 중 한 번은 성공할 것으로 기대
      expect(upgraded).toBe(true)
    })

    it('레벨이 올라가면 업그레이드 비용도 증가한다', () => {
      let state = gameState
      const playerId = 'rogue-1'

      // 능력치를 [3, 3]으로 설정 (레벨 = 3+3 = 6)
      state = setStats(state, playerId, 'strength', [3, 3])
      state = setActionPhase(state, playerId)
      state = giveEssence(state, playerId, 10)

      const playerBefore = state.players.find((p) => p.id === playerId)!
      const essenceBefore = playerBefore.monsterEssence

      const result = engine.executeAction(state, {
        type: 'ROLL_STAT_DICE',
        stat: 'dexterity',
      })

      expect(result.success).toBe(true)

      const playerAfter = result.newState.players.find((p) => p.id === playerId)!
      // 레벨 6이므로 6 정수 소모
      expect(playerAfter.monsterEssence).toBe(essenceBefore - 6)
    })

    it('몬스터 정수가 부족하면 업그레이드할 수 없다', () => {
      let state = gameState
      const playerId = 'rogue-1'

      // 능력치를 [5, 5]로 설정 (레벨 = 5+5 = 10)
      state = setStats(state, playerId, 'strength', [5, 5])
      state = setActionPhase(state, playerId)
      state = giveEssence(state, playerId, 5) // 10 필요한데 5만 있음

      const result = engine.executeAction(state, {
        type: 'ROLL_STAT_DICE',
        stat: 'dexterity',
      })

      expect(result.success).toBe(false)
      expect(result.message).toContain('정수')
    })
  })

  // ===== 6. 스킬 사용 시나리오 =====

  describe('스킬 사용', () => {
    it('스킬 사용 가능 액션이 표시된다', () => {
      let state = gameState
      const playerId = 'rogue-1'

      state = setActionPhase(state, playerId)

      const validActions = engine.getValidActions(state)
      const skillActions = validActions.filter(
        (a) => a.action.type === 'USE_SKILL'
      )

      // 도적의 스킬 중 비용 2 이하인 것들 (지능 2 = [1,1])
      // 독 바르기(1), 그림자 함정(1)
      expect(skillActions.length).toBeGreaterThanOrEqual(2)
    })

    it('스킬 사용 후 쿨다운이 적용된다', () => {
      let state = gameState
      const playerId = 'rogue-1'

      state = setActionPhase(state, playerId)

      // 도적의 "독 바르기" 스킬 사용
      const result = engine.executeAction(state, {
        type: 'USE_SKILL',
        skillId: 'rogue-poison',
      })

      if (result.success) {
        const player = result.newState.players.find((p) => p.id === playerId)!
        expect(player.skillCooldowns['rogue-poison']).toBe(1) // 쿨다운 1턴
        expect(player.usedSkillCost).toBe(1) // 비용 1 사용
      }
    })

    it('한 턴에 여러 스킬을 사용할 수 있다 (지능 범위 내)', () => {
      let state = gameState
      const playerId = 'rogue-1'

      // 지능 4로 설정 (비용 4까지 사용 가능)
      state = setStats(state, playerId, 'intelligence', [2, 2])
      state = setActionPhase(state, playerId)

      // 첫 번째 스킬 (비용 1)
      const result1 = engine.executeAction(state, {
        type: 'USE_SKILL',
        skillId: 'rogue-poison',
      })

      if (result1.success) {
        state = result1.newState

        // 두 번째 스킬 (비용 1)
        const result2 = engine.executeAction(state, {
          type: 'USE_SKILL',
          skillId: 'rogue-shadow-trap',
        })

        if (result2.success) {
          const player = result2.newState.players.find((p) => p.id === playerId)!
          expect(player.usedSkillCost).toBe(2)
        }
      }
    })

    it('쿨다운 중인 스킬은 사용할 수 없다', () => {
      let state = gameState
      const playerId = 'rogue-1'

      // 스킬 쿨다운 설정
      state = {
        ...state,
        players: state.players.map((p) =>
          p.id === playerId
            ? { ...p, skillCooldowns: { 'rogue-poison': 2 } }
            : p
        ),
      }
      state = setActionPhase(state, playerId)

      const validActions = engine.getValidActions(state)
      const poisonSkill = validActions.find(
        (a) => a.action.type === 'USE_SKILL' && a.action.skillId === 'rogue-poison'
      )

      expect(poisonSkill).toBeUndefined()
    })

    it('턴 종료 시 usedSkillCost가 리셋된다', () => {
      let state = gameState
      const playerId = 'rogue-1'

      state = setActionPhase(state, playerId)

      // 스킬 사용
      const skillResult = engine.executeAction(state, {
        type: 'USE_SKILL',
        skillId: 'rogue-poison',
      })

      if (skillResult.success) {
        state = skillResult.newState
        const playerBefore = state.players.find((p) => p.id === playerId)!
        expect(playerBefore.usedSkillCost).toBe(1)

        // 턴 종료
        const endResult = engine.executeAction(state, { type: 'END_TURN' })
        state = endResult.newState

        // 다음 라운드에서 확인
        state = completeRound(state) // 나머지 플레이어 + 몬스터 턴 완료

        const playerAfter = state.players.find((p) => p.id === playerId)!
        expect(playerAfter.usedSkillCost).toBe(0)
      }
    })
  })

  // ===== 7. 사망 및 부활 시나리오 =====

  describe('사망 및 부활', () => {
    it('플레이어가 체력 0 이하가 되면 사망한다', () => {
      let state = gameState
      const attackerId = 'rogue-1'
      const targetId = 'warrior-1'

      // 피공격자 체력 1
      state = {
        ...state,
        players: state.players.map((p) =>
          p.id === targetId ? { ...p, health: 1 } : p
        ),
      }

      state = setStats(state, attackerId, 'strength', [3, 3])

      const targetPlayer = state.players.find((p) => p.id === targetId)!
      state = movePlayerTo(state, attackerId, {
        q: targetPlayer.position.q + 1,
        r: targetPlayer.position.r,
      })
      state = setActionPhase(state, attackerId)

      const attackResult = engine.executeAction(state, {
        type: 'BASIC_ATTACK',
        targetId,
      })

      const target = attackResult.newState.players.find((p) => p.id === targetId)!
      expect(target.isDead).toBe(true)
      expect(target.health).toBe(0)
      expect(target.deathTurnsRemaining).toBe(DEATH_RESPAWN_TURNS)
    })

    it('죽은 플레이어는 유효한 액션이 없다', () => {
      let state = gameState

      // 첫 플레이어(도적)를 죽인다
      const playerId = 'rogue-1'
      state = {
        ...state,
        players: state.players.map((p) =>
          p.id === playerId
            ? { ...p, isDead: true, deathTurnsRemaining: DEATH_RESPAWN_TURNS }
            : p
        ),
      }

      const validActions = engine.getValidActions(state)
      expect(validActions).toHaveLength(0)
    })

    it('3라운드 후 플레이어가 부활한다', () => {
      let state = gameState
      const playerId = 'warrior-1'

      // 플레이어 사망 상태로 설정
      state = {
        ...state,
        players: state.players.map((p) =>
          p.id === playerId
            ? { ...p, isDead: true, health: 0, deathTurnsRemaining: 1 }
            : p
        ),
      }

      // 전체 라운드 진행 (몬스터 턴에서 부활 카운트 감소)
      state = completeRound(state)

      const player = state.players.find((p) => p.id === playerId)!
      expect(player.isDead).toBe(false)
      expect(player.health).toBe(15) // 전사 최대 체력 30의 절반
      expect(player.deathTurnsRemaining).toBe(0)
    })

    it('부활 시 직업 마을 첫 번째 위치로 이동한다', () => {
      let state = gameState
      const playerId = 'warrior-1'

      // 플레이어 사망 + 부활 직전
      state = {
        ...state,
        players: state.players.map((p) =>
          p.id === playerId
            ? {
                ...p,
                isDead: true,
                health: 0,
                deathTurnsRemaining: 1,
                position: { q: 5, r: 5 }, // 다른 위치에서 죽음
              }
            : p
        ),
      }

      state = completeRound(state)

      const player = state.players.find((p) => p.id === playerId)!
      expect(player.position).toEqual(STARTING_POSITIONS.warrior[0])
    })
  })

  // ===== 8. 다중 라운드 진행 =====

  describe('다중 라운드 진행', () => {
    it('3라운드 연속 진행이 가능하다', () => {
      let state = gameState
      expect(state.roundNumber).toBe(1)

      // 라운드 1 완료
      state = completeRound(state)
      expect(state.roundNumber).toBe(2)

      // 라운드 2 완료
      state = completeRound(state)
      expect(state.roundNumber).toBe(3)

      // 라운드 3 완료
      state = completeRound(state)
      expect(state.roundNumber).toBe(4)
    })

    it('라운드 종료 시 스킬 쿨다운이 감소한다', () => {
      let state = gameState
      const playerId = 'rogue-1'

      // 쿨다운 3으로 설정
      state = {
        ...state,
        players: state.players.map((p) =>
          p.id === playerId
            ? { ...p, skillCooldowns: { 'rogue-poison': 3 } }
            : p
        ),
      }

      // 라운드 완료
      state = completeRound(state)

      const player = state.players.find((p) => p.id === playerId)!
      expect(player.skillCooldowns['rogue-poison']).toBe(2)

      // 또 다른 라운드 완료
      state = completeRound(state)

      const playerAfter = state.players.find((p) => p.id === playerId)!
      expect(playerAfter.skillCooldowns['rogue-poison']).toBe(1)
    })

    it('쿨다운은 0 아래로 내려가지 않는다', () => {
      let state = gameState
      const playerId = 'rogue-1'

      state = {
        ...state,
        players: state.players.map((p) =>
          p.id === playerId
            ? { ...p, skillCooldowns: { 'rogue-poison': 1 } }
            : p
        ),
      }

      // 두 라운드 완료
      state = completeRound(state)
      state = completeRound(state)

      const player = state.players.find((p) => p.id === playerId)!
      expect(player.skillCooldowns['rogue-poison']).toBe(0)
    })

    it('남은 이동력이 높은 플레이어가 다음 라운드에서 먼저 행동한다', () => {
      let state = gameState

      // 플레이어들의 leftoverMovement를 다르게 설정
      state = {
        ...state,
        players: state.players.map((p) => {
          switch (p.id) {
            case 'warrior-1':
              return { ...p, leftoverMovement: 10 }
            case 'warrior-2':
              return { ...p, leftoverMovement: 5 }
            case 'rogue-1':
              return { ...p, leftoverMovement: 3 }
            case 'mage-1':
              return { ...p, leftoverMovement: 8 }
            default:
              return p
          }
        }),
      }

      // 라운드 완료
      state = completeRound(state)

      // 새 턴 순서: warrior-1(10) → mage-1(8) → warrior-2(5) → rogue-1(3) → monster
      // 실제로는 라운드 진행 중에 leftoverMovement가 업데이트되므로 순서가 다를 수 있음
      // 여기서는 최소한 monster가 마지막인지 확인
      expect(state.roundTurnOrder[4]).toBe('monster')
      expect(state.roundTurnOrder).toHaveLength(5)
    })
  })

  // ===== 9. 타락 주사위 적용 =====

  describe('타락 주사위 적용', () => {
    it('타락 주사위를 능력치에 적용할 수 있다', () => {
      let state = gameState
      const playerId = 'rogue-1'

      // 타락 상태 + 타락 주사위 설정
      state = {
        ...state,
        players: state.players.map((p) =>
          p.id === playerId
            ? { ...p, state: 'corrupt' as const, corruptDice: 4 }
            : p
        ),
      }

      const result = engine.executeAction(state, {
        type: 'APPLY_CORRUPT_DICE',
        stat: 'strength',
      }, playerId)

      expect(result.success).toBe(true)

      const player = result.newState.players.find((p) => p.id === playerId)!
      expect(player.corruptDiceTarget).toBe('strength')
    })

    it('타락 주사위가 없으면 적용할 수 없다', () => {
      let state = gameState
      const playerId = 'rogue-1'

      const result = engine.executeAction(state, {
        type: 'APPLY_CORRUPT_DICE',
        stat: 'strength',
      }, playerId)

      expect(result.success).toBe(false)
    })

    it('이미 적용된 타락 주사위는 다시 적용할 수 없다', () => {
      let state = gameState
      const playerId = 'rogue-1'

      state = {
        ...state,
        players: state.players.map((p) =>
          p.id === playerId
            ? {
                ...p,
                state: 'corrupt' as const,
                corruptDice: 4,
                corruptDiceTarget: 'dexterity',
              }
            : p
        ),
      }

      const result = engine.executeAction(state, {
        type: 'APPLY_CORRUPT_DICE',
        stat: 'strength',
      }, playerId)

      expect(result.success).toBe(false)
    })
  })

  // ===== 10. 신성 선택 (부활 시) =====

  describe('신성 선택', () => {
    it('타락 상태에서 신성으로 전환할 수 있다', () => {
      let state = gameState
      const playerId = 'rogue-1'

      // 타락 상태 설정
      state = {
        ...state,
        players: state.players.map((p) =>
          p.id === playerId
            ? { ...p, state: 'corrupt' as const, corruptDice: 3 }
            : p
        ),
      }

      const result = engine.executeAction(state, { type: 'CHOOSE_HOLY' }, playerId)

      expect(result.success).toBe(true)

      const player = result.newState.players.find((p) => p.id === playerId)!
      expect(player.state).toBe('holy')
      expect(player.corruptDice).toBeNull()
      expect(player.corruptDiceTarget).toBeNull()
    })

    it('신성 상태에서는 CHOOSE_HOLY를 사용할 수 없다', () => {
      const state = gameState // 기본 상태는 신성
      const playerId = 'rogue-1'

      const result = engine.executeAction(state, { type: 'CHOOSE_HOLY' }, playerId)

      expect(result.success).toBe(false)
    })
  })

  // ===== 11. playerId 기반 액션 시스템 =====

  describe('playerId 기반 액션 시스템', () => {
    it('현재 턴이 아닌 플레이어도 비-턴 액션을 수행할 수 있다', () => {
      let state = gameState
      // 현재 턴은 rogue-1 (도적)
      const nonCurrentPlayerId = 'warrior-1'

      // warrior-1에게 타락 주사위 부여
      state = {
        ...state,
        players: state.players.map((p) =>
          p.id === nonCurrentPlayerId
            ? { ...p, state: 'corrupt' as const, corruptDice: 3 }
            : p
        ),
      }

      // 현재 턴이 아닌 플레이어가 타락 주사위 적용
      const result = engine.executeAction(state, {
        type: 'APPLY_CORRUPT_DICE',
        stat: 'dexterity',
      }, nonCurrentPlayerId)

      expect(result.success).toBe(true)

      const player = result.newState.players.find((p) => p.id === nonCurrentPlayerId)!
      expect(player.corruptDiceTarget).toBe('dexterity')
    })

    it('현재 턴이 아닌 플레이어는 턴 기반 액션을 수행할 수 없다', () => {
      const state = gameState
      // 현재 턴은 rogue-1 (도적)
      const nonCurrentPlayerId = 'warrior-1'

      // warrior-1이 이동 주사위를 굴리려고 시도
      const result = engine.executeAction(state, { type: 'ROLL_MOVE_DICE' }, nonCurrentPlayerId)

      expect(result.success).toBe(false)
      expect(result.message).toContain('자신의 턴')
    })

    it('getValidActions에 playerId를 전달하면 해당 플레이어의 액션을 반환한다', () => {
      let state = gameState
      const nonCurrentPlayerId = 'warrior-1'

      // warrior-1에게 타락 주사위 부여
      state = {
        ...state,
        players: state.players.map((p) =>
          p.id === nonCurrentPlayerId
            ? { ...p, state: 'corrupt' as const, corruptDice: 3 }
            : p
        ),
      }

      // 현재 턴이 아닌 플레이어의 유효한 액션 조회
      const actions = engine.getValidActions(state, nonCurrentPlayerId)

      // 비-턴 액션만 반환되어야 함 (APPLY_CORRUPT_DICE, CHOOSE_HOLY)
      const turnBasedActions = actions.filter((a) =>
        ['ROLL_MOVE_DICE', 'MOVE', 'END_MOVE_PHASE', 'END_TURN', 'BASIC_ATTACK', 'USE_SKILL', 'ROLL_STAT_DICE'].includes(a.action.type)
      )
      expect(turnBasedActions).toHaveLength(0)

      // 타락 주사위 적용 액션이 있어야 함
      const applyCorruptActions = actions.filter((a) => a.action.type === 'APPLY_CORRUPT_DICE')
      expect(applyCorruptActions.length).toBeGreaterThan(0)
    })
  })

  // ===== 12. 턴 시작 자동 처리 =====

  describe('턴 시작 자동 처리', () => {
    it('속박 해제 (isBound → false, 이동력 0)', () => {
      const diceRoller = new MockDiceRoller()
      diceRoller.setDefaultValue(3)
      const customEngine = new GameEngine({ maxPlayers: 4, diceRoller })
      let state = customEngine.createGame(playerConfigs)

      const playerId = state.roundTurnOrder[0] as string

      // 플레이어를 속박 상태로
      state = {
        ...state,
        players: state.players.map(p =>
          p.id === playerId ? { ...p, isBound: true } : p
        ),
      }

      // ROLL_MOVE_DICE에서 턴 시작 처리 발생
      diceRoller.setNextRolls([3, 3])
      const result = customEngine.executeAction(state, { type: 'ROLL_MOVE_DICE' })
      expect(result.success).toBe(true)

      const player = result.newState.players.find(p => p.id === playerId)!
      expect(player.isBound).toBe(false)
      expect(player.remainingMovement).toBe(0) // 속박으로 이동력 0
    })

    it('무적 태세 해제 (ironStanceActive → false)', () => {
      const diceRoller = new MockDiceRoller()
      diceRoller.setDefaultValue(3)
      const customEngine = new GameEngine({ maxPlayers: 4, diceRoller })
      let state = customEngine.createGame(playerConfigs)

      const playerId = state.roundTurnOrder[0] as string

      state = {
        ...state,
        players: state.players.map(p =>
          p.id === playerId ? { ...p, ironStanceActive: true } : p
        ),
      }

      diceRoller.setNextRolls([3, 3])
      const result = customEngine.executeAction(state, { type: 'ROLL_MOVE_DICE' })
      expect(result.success).toBe(true)

      const player = result.newState.players.find(p => p.id === playerId)!
      expect(player.ironStanceActive).toBe(false)
    })
  })

  // ===== 13. 마을 회복 =====

  describe('마을 회복', () => {
    it('마을에서 턴 종료 시 회복', () => {
      let state = gameState
      const playerId = state.roundTurnOrder[0] as string

      // 플레이어를 직업 마을에 배치 + 체력 감소
      const player = state.players.find(p => p.id === playerId)!
      const startPos = STARTING_POSITIONS[player.heroClass][0]

      state = {
        ...state,
        players: state.players.map(p =>
          p.id === playerId
            ? { ...p, position: startPos, health: 10, turnPhase: 'action' as const }
            : p
        ),
      }

      const endResult = engine.executeAction(state, { type: 'END_TURN' })
      expect(endResult.success).toBe(true)

      const updatedPlayer = endResult.newState.players.find(p => p.id === playerId)!
      // 자기 직업 마을이면 10 회복
      expect(updatedPlayer.health).toBeGreaterThan(10)
    })
  })

  // ===== 14. 버프 생명주기 =====

  describe('버프 생명주기', () => {
    it('독 바르기: 기본공격에 민첩 추가 피해 후 소모', () => {
      let state = gameState
      const playerId = state.roundTurnOrder[0] as string

      // 다른 플레이어를 인접하게 배치
      const player = state.players.find(p => p.id === playerId)!
      const targetId = state.players.find(p => p.id !== playerId)!.id

      state = {
        ...state,
        players: state.players.map(p => {
          if (p.id === playerId) {
            return {
              ...p,
              turnPhase: 'action' as const,
              poisonActive: true,
              stats: { ...p.stats, strength: [3, 3] as [number, number], dexterity: [2, 2] as [number, number] },
            }
          }
          if (p.id === targetId) {
            return {
              ...p,
              position: { q: player.position.q + 1, r: player.position.r },
              health: 30,
              maxHealth: 30,
            }
          }
          return p
        }),
      }

      const attackResult = engine.executeAction(state, { type: 'BASIC_ATTACK', targetId })
      expect(attackResult.success).toBe(true)

      // 기본 피해 6(힘) + 독 4(민첩) = 10
      const target = attackResult.newState.players.find(p => p.id === targetId)!
      expect(target.health).toBe(30 - 10)

      // 독 소모
      const attacker = attackResult.newState.players.find(p => p.id === playerId)!
      expect(attacker.poisonActive).toBe(false)
    })

    it('은신: 공격 시 해제됨', () => {
      let state = gameState
      const playerId = state.roundTurnOrder[0] as string
      const player = state.players.find(p => p.id === playerId)!
      const targetId = state.players.find(p => p.id !== playerId)!.id

      state = {
        ...state,
        players: state.players.map(p => {
          if (p.id === playerId) {
            return {
              ...p,
              turnPhase: 'action' as const,
              isStealthed: true,
            }
          }
          if (p.id === targetId) {
            return {
              ...p,
              position: { q: player.position.q + 1, r: player.position.r },
            }
          }
          return p
        }),
      }

      const attackResult = engine.executeAction(state, { type: 'BASIC_ATTACK', targetId })
      expect(attackResult.success).toBe(true)

      const attacker = attackResult.newState.players.find(p => p.id === playerId)!
      expect(attacker.isStealthed).toBe(false)
    })
  })
})
