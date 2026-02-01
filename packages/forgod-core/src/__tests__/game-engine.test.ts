import { describe, it, expect, beforeEach } from 'vitest'
import { GameEngine, type CreateGameOptions } from '../engine/game-engine'
import type { GameState, Player } from '../types'

describe('GameEngine', () => {
  let engine: GameEngine
  let defaultOptions: CreateGameOptions

  beforeEach(() => {
    engine = new GameEngine()
    defaultOptions = {
      players: [
        { id: 'player-1', name: 'Player 1', heroClass: 'warrior' },
        { id: 'player-2', name: 'Player 2', heroClass: 'rogue' },
        { id: 'player-3', name: 'Player 3', heroClass: 'mage' },
      ],
    }
  })

  describe('createGame', () => {
    it('새 게임을 생성한다', () => {
      const state = engine.createGame(defaultOptions)

      expect(state.id).toBeTruthy()
      expect(state.players).toHaveLength(3)
      expect(state.roundNumber).toBe(1)
      expect(state.currentTurnIndex).toBe(0)
    })

    it('플레이어를 올바르게 초기화한다', () => {
      const state = engine.createGame(defaultOptions)

      for (const player of state.players) {
        expect(player.state).toBe('holy')
        // 직업별 초기 체력: 전사 30, 도적/법사 20
        const expectedHealth = player.heroClass === 'warrior' ? 30 : 20
        expect(player.health).toBe(expectedHealth)
        expect(player.maxHealth).toBe(expectedHealth)
        expect(player.isDead).toBe(false)
        expect(player.turnPhase).toBe('move')
        expect(player.remainingMovement).toBeNull()
        expect(player.stats.strength).toEqual([1, 1])
        expect(player.stats.dexterity).toEqual([1, 1])
        expect(player.stats.intelligence).toEqual([1, 1])
      }
    })

    it('도적이 먼저 턴을 시작한다', () => {
      const state = engine.createGame(defaultOptions)

      // 첫 턴은 도적
      const firstTurnEntry = state.roundTurnOrder[0]
      const firstPlayer = state.players.find(p => p.id === firstTurnEntry)
      expect(firstPlayer?.heroClass).toBe('rogue')
    })

    it('턴 순서 마지막은 몬스터다', () => {
      const state = engine.createGame(defaultOptions)

      const lastEntry = state.roundTurnOrder[state.roundTurnOrder.length - 1]
      expect(lastEntry).toBe('monster')
    })

    it('몬스터를 올바르게 초기화한다', () => {
      const state = engine.createGame(defaultOptions)

      expect(state.monsters.length).toBe(7)
      for (const monster of state.monsters) {
        expect(monster.health).toBe(monster.maxHealth)
        expect(monster.isDead).toBe(false)
      }
    })

    it('직업별 시작 위치가 다르다', () => {
      const state = engine.createGame(defaultOptions)

      const positions = state.players.map(p => `${p.position.q},${p.position.r}`)
      const uniquePositions = new Set(positions)

      expect(uniquePositions.size).toBe(3)
    })
  })

  describe('getCurrentTurnEntry', () => {
    it('현재 턴 엔트리를 반환한다', () => {
      const state = engine.createGame(defaultOptions)

      const entry = engine.getCurrentTurnEntry(state)
      expect(entry).toBe(state.roundTurnOrder[0])
    })
  })

  describe('getCurrentPlayer', () => {
    it('현재 턴의 플레이어를 반환한다', () => {
      const state = engine.createGame(defaultOptions)

      const player = engine.getCurrentPlayer(state)
      expect(player).not.toBeNull()
      expect(player?.id).toBe(state.roundTurnOrder[0])
    })

    it('몬스터 턴에는 null을 반환한다', () => {
      const state = engine.createGame(defaultOptions)
      const monsterTurnState = {
        ...state,
        currentTurnIndex: state.roundTurnOrder.length - 1,
      }

      const player = engine.getCurrentPlayer(monsterTurnState)
      expect(player).toBeNull()
    })
  })

  describe('getValidActions', () => {
    it('move 페이즈에서 ROLL_MOVE_DICE 액션을 반환한다', () => {
      const state = engine.createGame(defaultOptions)

      const actions = engine.getValidActions(state)
      const rollAction = actions.find(a => a.action.type === 'ROLL_MOVE_DICE')

      expect(rollAction).toBeDefined()
    })

    it('이동 주사위를 굴린 후 MOVE와 END_MOVE_PHASE 액션을 반환한다', () => {
      let state = engine.createGame(defaultOptions)
      const result = engine.executeAction(state, { type: 'ROLL_MOVE_DICE' })
      state = result.newState

      const actions = engine.getValidActions(state)
      const moveActions = actions.filter(a => a.action.type === 'MOVE')
      const endMovePhaseAction = actions.find(a => a.action.type === 'END_MOVE_PHASE')

      expect(moveActions.length).toBeGreaterThan(0)
      expect(endMovePhaseAction).toBeDefined()
    })

    it('action 페이즈에서 END_TURN 액션을 반환한다', () => {
      let state = engine.createGame(defaultOptions)

      // move 페이즈를 종료
      const result = engine.executeAction(state, { type: 'ROLL_MOVE_DICE' })
      state = result.newState
      const endMoveResult = engine.executeAction(state, { type: 'END_MOVE_PHASE' })
      state = endMoveResult.newState

      const actions = engine.getValidActions(state)
      const endTurnAction = actions.find(a => a.action.type === 'END_TURN')

      expect(endTurnAction).toBeDefined()
    })

    it('죽은 플레이어는 액션이 없다', () => {
      let state = engine.createGame(defaultOptions)
      const currentPlayer = engine.getCurrentPlayer(state)!

      // 플레이어를 죽인다
      state = {
        ...state,
        players: state.players.map(p =>
          p.id === currentPlayer.id ? { ...p, isDead: true } : p
        ),
      }

      const actions = engine.getValidActions(state)
      expect(actions).toHaveLength(0)
    })

    it('몬스터 턴에는 액션이 없다', () => {
      const state = engine.createGame(defaultOptions)
      const monsterTurnState = {
        ...state,
        currentTurnIndex: state.roundTurnOrder.length - 1,
      }

      const actions = engine.getValidActions(monsterTurnState)
      expect(actions).toHaveLength(0)
    })
  })

  describe('executeAction - ROLL_MOVE_DICE', () => {
    it('이동 주사위를 굴린다', () => {
      const state = engine.createGame(defaultOptions)
      const result = engine.executeAction(state, { type: 'ROLL_MOVE_DICE' })

      expect(result.success).toBe(true)

      const player = engine.getCurrentPlayer(result.newState)
      expect(player?.remainingMovement).not.toBeNull()
      expect(player?.remainingMovement).toBeGreaterThanOrEqual(4) // 최소 2 + 2(민첩)
    })

    it('이미 굴렸으면 실패한다', () => {
      let state = engine.createGame(defaultOptions)
      const result1 = engine.executeAction(state, { type: 'ROLL_MOVE_DICE' })
      state = result1.newState

      const result2 = engine.executeAction(state, { type: 'ROLL_MOVE_DICE' })
      expect(result2.success).toBe(false)
    })

    it('몬스터 턴에는 실패한다', () => {
      const state = engine.createGame(defaultOptions)
      const monsterTurnState = {
        ...state,
        currentTurnIndex: state.roundTurnOrder.length - 1,
      }

      const result = engine.executeAction(monsterTurnState, { type: 'ROLL_MOVE_DICE' })
      expect(result.success).toBe(false)
    })
  })

  describe('executeAction - MOVE', () => {
    it('인접 타일로 이동한다', () => {
      let state = engine.createGame(defaultOptions)
      const rollResult = engine.executeAction(state, { type: 'ROLL_MOVE_DICE' })
      state = rollResult.newState

      const actions = engine.getValidActions(state)
      const moveAction = actions.find(a => a.action.type === 'MOVE')

      if (moveAction && moveAction.action.type === 'MOVE') {
        const moveResult = engine.executeAction(state, moveAction.action)
        expect(moveResult.success).toBe(true)

        const player = engine.getCurrentPlayer(moveResult.newState)
        expect(player?.position).toEqual(moveAction.action.position)
        expect(moveResult.events).toContainEqual(
          expect.objectContaining({ type: 'PLAYER_MOVED' })
        )
      }
    })

    it('이동력이 부족하면 실패한다', () => {
      let state = engine.createGame(defaultOptions)
      const player = engine.getCurrentPlayer(state)!

      // 이동력을 0으로 설정
      state = {
        ...state,
        players: state.players.map(p =>
          p.id === player.id ? { ...p, remainingMovement: 1 } : p
        ),
      }

      // 평지 이동 비용은 3
      const result = engine.executeAction(state, {
        type: 'MOVE',
        position: { q: player.position.q + 1, r: player.position.r },
      })
      expect(result.success).toBe(false)
    })

    it('주사위를 굴리지 않았으면 실패한다', () => {
      const state = engine.createGame(defaultOptions)

      const result = engine.executeAction(state, {
        type: 'MOVE',
        position: { q: 1, r: 0 },
      })
      expect(result.success).toBe(false)
    })
  })

  describe('executeAction - END_MOVE_PHASE', () => {
    it('move 페이즈에서 action 페이즈로 전환한다', () => {
      let state = engine.createGame(defaultOptions)
      const rollResult = engine.executeAction(state, { type: 'ROLL_MOVE_DICE' })
      state = rollResult.newState

      const endResult = engine.executeAction(state, { type: 'END_MOVE_PHASE' })
      expect(endResult.success).toBe(true)

      const player = engine.getCurrentPlayer(endResult.newState)
      expect(player?.turnPhase).toBe('action')
    })

    it('action 페이즈에서 END_MOVE_PHASE는 실패한다', () => {
      let state = engine.createGame(defaultOptions)
      const currentPlayer = engine.getCurrentPlayer(state)!

      // 현재 턴 플레이어를 action 페이즈로 전환
      state = {
        ...state,
        players: state.players.map(p =>
          p.id === currentPlayer.id ? { ...p, turnPhase: 'action' as const } : p
        ),
      }

      const result = engine.executeAction(state, { type: 'END_MOVE_PHASE' })
      expect(result.success).toBe(false)
    })
  })

  describe('executeAction - END_TURN', () => {
    it('action 페이즈에서 다음 플레이어 턴으로 전환한다', () => {
      let state = engine.createGame(defaultOptions)

      // move 페이즈 완료
      const rollResult = engine.executeAction(state, { type: 'ROLL_MOVE_DICE' })
      state = rollResult.newState
      const endMoveResult = engine.executeAction(state, { type: 'END_MOVE_PHASE' })
      state = endMoveResult.newState

      // action 페이즈 완료
      const endActionResult = engine.executeAction(state, { type: 'END_TURN' })
      expect(endActionResult.success).toBe(true)

      // 다음 플레이어로 전환
      expect(endActionResult.newState.currentTurnIndex).toBe(1)
    })

    it('move 페이즈에서 END_TURN은 실패한다', () => {
      let state = engine.createGame(defaultOptions)
      const rollResult = engine.executeAction(state, { type: 'ROLL_MOVE_DICE' })
      state = rollResult.newState

      const result = engine.executeAction(state, { type: 'END_TURN' })
      expect(result.success).toBe(false)
    })
  })

  describe('executeAction - BASIC_ATTACK', () => {
    it('인접한 몬스터를 공격할 수 있다', () => {
      let state = engine.createGame(defaultOptions)
      const player = engine.getCurrentPlayer(state)!

      // action 페이즈로 전환
      state = {
        ...state,
        players: state.players.map(p =>
          p.id === player.id ? { ...p, turnPhase: 'action' as const } : p
        ),
      }

      // 플레이어를 몬스터 옆으로 이동
      const monster = state.monsters[0]
      state = {
        ...state,
        players: state.players.map(p =>
          p.id === player.id
            ? { ...p, position: { q: monster.position.q + 1, r: monster.position.r } }
            : p
        ),
      }

      const result = engine.executeAction(state, {
        type: 'BASIC_ATTACK',
        targetId: monster.id,
      })

      expect(result.success).toBe(true)
      expect(result.events).toContainEqual(
        expect.objectContaining({ type: 'PLAYER_ATTACKED', targetId: monster.id })
      )

      const updatedMonster = result.newState.monsters.find(m => m.id === monster.id)
      expect(updatedMonster?.health).toBeLessThan(monster.health)
    })

    it('인접하지 않은 대상은 공격할 수 없다', () => {
      let state = engine.createGame(defaultOptions)
      const player = engine.getCurrentPlayer(state)!

      state = {
        ...state,
        players: state.players.map(p =>
          p.id === player.id ? { ...p, turnPhase: 'action' as const } : p
        ),
      }

      // 멀리 있는 몬스터 공격 시도
      const result = engine.executeAction(state, {
        type: 'BASIC_ATTACK',
        targetId: 'balrog',
      })

      expect(result.success).toBe(false)
    })
  })

  describe('executeAction - ROLL_STAT_DICE', () => {
    it('몬스터 정수가 충분하면 능력치 주사위를 굴린다', () => {
      let state = engine.createGame(defaultOptions)
      const player = engine.getCurrentPlayer(state)!

      // action 페이즈로 전환하고 몬스터 정수 부여
      state = {
        ...state,
        players: state.players.map(p =>
          p.id === player.id
            ? { ...p, turnPhase: 'action' as const, monsterEssence: 10 }
            : p
        ),
      }

      const result = engine.executeAction(state, {
        type: 'ROLL_STAT_DICE',
        stat: 'strength',
      })

      expect(result.success).toBe(true)

      // 몬스터 정수가 소모됨 (현재 레벨 = 1)
      const updatedPlayer = result.newState.players.find(p => p.id === player.id)
      expect(updatedPlayer?.monsterEssence).toBeLessThan(10)
    })

    it('몬스터 정수가 부족하면 실패한다', () => {
      let state = engine.createGame(defaultOptions)
      const player = engine.getCurrentPlayer(state)!

      state = {
        ...state,
        players: state.players.map(p =>
          p.id === player.id
            ? { ...p, turnPhase: 'action' as const, monsterEssence: 0 }
            : p
        ),
      }

      const result = engine.executeAction(state, {
        type: 'ROLL_STAT_DICE',
        stat: 'strength',
      })

      expect(result.success).toBe(false)
    })
  })

  describe('validateAction', () => {
    it('몬스터 턴에는 유효하지 않다', () => {
      const state = engine.createGame(defaultOptions)
      const monsterTurnState = {
        ...state,
        currentTurnIndex: state.roundTurnOrder.length - 1,
      }

      const validation = engine.validateAction(monsterTurnState, { type: 'ROLL_MOVE_DICE' })
      expect(validation.valid).toBe(false)
    })

    it('죽은 플레이어는 유효하지 않다', () => {
      let state = engine.createGame(defaultOptions)
      const player = engine.getCurrentPlayer(state)!

      state = {
        ...state,
        players: state.players.map(p =>
          p.id === player.id ? { ...p, isDead: true } : p
        ),
      }

      const validation = engine.validateAction(state, { type: 'ROLL_MOVE_DICE' })
      expect(validation.valid).toBe(false)
    })

    it('살아있는 플레이어 턴에는 유효하다', () => {
      const state = engine.createGame(defaultOptions)

      const validation = engine.validateAction(state, { type: 'ROLL_MOVE_DICE' })
      expect(validation.valid).toBe(true)
    })
  })
})
