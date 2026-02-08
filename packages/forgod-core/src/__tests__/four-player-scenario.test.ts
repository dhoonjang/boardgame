import { describe, expect, it, beforeEach } from 'vitest'
import { GAME_BOARD, TERRAIN_MOVEMENT_COST } from '../constants'
import { GameEngine } from '../engine/game-engine'
import { checkVictoryCondition } from '../engine/victory'
import { getNeighbors, getDistance, coordEquals } from '../hex'
import type { GameState, HexCoord } from '../types'
import {
  MockDiceRoller,
  skipToActionPhase,
  completeTurn,
  advanceToPlayerTurn,
  movePlayerToPosition,
  findPath,
} from './test-helpers'

/**
 * 4인 플레이어 경쟁 시나리오
 *
 * 4명의 플레이어가 각자의 승리 경로를 추구하는 통합 테스트
 *
 * 플레이어 구성:
 * - P1 (전사1): 마왕 승리 경로 - 타락 → 마왕성 → 마검 → 신전
 * - P2 (도적1): 점수 축적 경로 - 마왕 계시로 점수 모으기
 * - P3 (법사1): 천사 승리 경로 - 신앙 5점 → 마왕성 진입
 * - P4 (전사2): 계시 승리 경로 - 발록 처단 계시 완료
 */

// 마왕성(castle) 위치
const castleTile = GAME_BOARD.find(t => t.type === 'castle')!

// 신전 위치
const templeTile = GAME_BOARD.find(t => t.type === 'temple')!

// 이동 가능한 타일 목록
const movableTiles = GAME_BOARD.filter(tile => {
  const moveCost = TERRAIN_MOVEMENT_COST[tile.type]
  return moveCost !== 'blocked'
})

describe('4인 플레이어 경쟁 시나리오', () => {
  let diceRoller: MockDiceRoller
  let engine: GameEngine

  beforeEach(() => {
    diceRoller = new MockDiceRoller()
    // 기본값을 높은 값으로 설정하여 이동력 확보
    diceRoller.setDefaultValue(6)
    engine = new GameEngine({ diceRoller })
  })

  /**
   * 4인 게임 생성 (마검 위치 고정)
   */
  function createFourPlayerGame(customSwordPosition?: HexCoord): GameState {
    // 테스트용 고정 마검 위치: 평지 타일
    const defaultSwordPosition = movableTiles.find(t => t.type === 'plain')!.coord

    return engine.createGame({
      players: [
        { id: 'warrior-1', name: '전사1', heroClass: 'warrior' },
        { id: 'rogue-1', name: '도적1', heroClass: 'rogue' },
        { id: 'mage-1', name: '법사1', heroClass: 'mage' },
        { id: 'warrior-2', name: '전사2', heroClass: 'warrior' },
      ],
      demonSwordPosition: customSwordPosition ?? defaultSwordPosition,
    })
  }

  describe('Phase 1: 초반 전개', () => {
    it('게임 시작 시 모든 플레이어가 마검 위치를 모른다', () => {
      const state = createFourPlayerGame()

      for (const player of state.players) {
        expect(player.knowsDemonSwordPosition).toBe(false)
      }
    })

    it('게임 시작 시 모든 플레이어는 신성 상태다', () => {
      const state = createFourPlayerGame()

      for (const player of state.players) {
        expect(player.state).toBe('holy')
        expect(player.hasDemonSword).toBe(false)
      }
    })

    it('P1이 P2를 공격하여 처치하면 타락한다', () => {
      let state = createFourPlayerGame()

      // P2를 P1 인접의 비-마을 타일로 이동
      const p1 = state.players.find(p => p.id === 'warrior-1')!

      // P1 인접의 비-마을 이동 가능 타일 찾기 (마을 회복 방지)
      const p1AdjacentNonVillage = getNeighbors(p1.position).filter(pos => {
        const tile = GAME_BOARD.find(t => t.coord.q === pos.q && t.coord.r === pos.r)
        if (!tile) return false
        const cost = TERRAIN_MOVEMENT_COST[tile.type]
        return cost !== 'blocked' && tile.type !== 'village'
      })

      // P2를 P1 인접 비-마을 위치로 직접 배치 (이동 대신 상태 직접 수정)
      const targetPos = p1AdjacentNonVillage.length > 0
        ? p1AdjacentNonVillage[0]
        : getNeighbors(p1.position).filter(pos => {
            const tile = GAME_BOARD.find(t => t.coord.q === pos.q && t.coord.r === pos.r)
            return tile && TERRAIN_MOVEMENT_COST[tile.type] !== 'blocked'
          })[0]

      state = {
        ...state,
        players: state.players.map(p =>
          p.id === 'rogue-1' ? { ...p, position: targetPos, health: 4 } : p  // 체력 낮게 설정 (2턴이면 처치)
        ),
      }

      // P1의 턴으로 이동하고 P2 공격
      state = advanceToPlayerTurn(engine, state, 'warrior-1')
      state = skipToActionPhase(engine, state)

      // 여러 번 공격하여 P2 처치
      let attackCount = 0
      const maxAttacks = 10

      while (attackCount < maxAttacks) {
        const p2Current = state.players.find(p => p.id === 'rogue-1')!
        if (p2Current.isDead) break

        // P1의 턴인지 확인하고 action 페이즈로 이동
        const currentEntry = engine.getCurrentTurnEntry(state)
        if (currentEntry !== 'warrior-1') {
          state = advanceToPlayerTurn(engine, state, 'warrior-1')
        }
        state = skipToActionPhase(engine, state)

        // 공격 실행
        const attackResult = engine.executeAction(state, { type: 'BASIC_ATTACK', targetId: 'rogue-1' })
        if (attackResult.success) {
          state = attackResult.newState
        }

        // 턴 종료
        const endResult = engine.executeAction(state, { type: 'END_TURN' })
        state = endResult.newState
        attackCount++
      }

      // 결과 확인
      const p1After = state.players.find(p => p.id === 'warrior-1')!
      const p2After = state.players.find(p => p.id === 'rogue-1')!

      expect(p2After.isDead).toBe(true)
      expect(p1After.state).toBe('corrupt')
      expect(p1After.corruptDice).toBe(1)
    })

    it('이미 타락한 플레이어가 다른 용사를 처치하면 타락 주사위가 증가한다', () => {
      let state = createFourPlayerGame()

      const p1 = state.players.find(p => p.id === 'warrior-1')!

      // P1 인접의 비-마을 이동 가능 타일 찾기
      const p1AdjacentNonVillage = getNeighbors(p1.position).filter(pos => {
        const tile = GAME_BOARD.find(t => t.coord.q === pos.q && t.coord.r === pos.r)
        if (!tile) return false
        const cost = TERRAIN_MOVEMENT_COST[tile.type]
        return cost !== 'blocked' && tile.type !== 'village'
      })

      const targetPos = p1AdjacentNonVillage.length > 0
        ? p1AdjacentNonVillage[0]
        : getNeighbors(p1.position).filter(pos => {
            const tile = GAME_BOARD.find(t => t.coord.q === pos.q && t.coord.r === pos.r)
            return tile && TERRAIN_MOVEMENT_COST[tile.type] !== 'blocked'
          })[0]

      // P3를 P1 인접 비-마을 위치에 체력 낮게 배치, P1은 이미 타락 상태
      state = {
        ...state,
        players: state.players.map(p => {
          if (p.id === 'warrior-1') return { ...p, state: 'corrupt' as const, corruptDice: 2 }
          if (p.id === 'mage-1') return { ...p, position: targetPos, health: 4 }
          return p
        }),
      }

      // P1의 턴으로 이동하고 P3 공격
      state = advanceToPlayerTurn(engine, state, 'warrior-1')

      // 여러 번 공격하여 P3 처치
      let attackCount = 0
      const maxAttacks = 10

      while (attackCount < maxAttacks) {
        const p3Current = state.players.find(p => p.id === 'mage-1')!
        if (p3Current.isDead) break

        const currentEntry = engine.getCurrentTurnEntry(state)
        if (currentEntry !== 'warrior-1') {
          state = advanceToPlayerTurn(engine, state, 'warrior-1')
        }
        state = skipToActionPhase(engine, state)

        const attackResult = engine.executeAction(state, { type: 'BASIC_ATTACK', targetId: 'mage-1' })
        if (attackResult.success) {
          state = attackResult.newState
        }

        const endResult = engine.executeAction(state, { type: 'END_TURN' })
        state = endResult.newState
        attackCount++
      }

      // 결과 확인
      const p1After = state.players.find(p => p.id === 'warrior-1')!
      const p3After = state.players.find(p => p.id === 'mage-1')!

      expect(p3After.isDead).toBe(true)
      expect(p1After.corruptDice).toBe(3) // 2 → 3
    })
  })

  describe('Phase 2: 마검 정보 획득', () => {
    it('타락 상태로 마왕성 진입 시 마검 위치를 알게 된다', () => {
      let state = createFourPlayerGame()

      // P1을 타락 상태로 설정
      state = {
        ...state,
        players: state.players.map(p =>
          p.id === 'warrior-1'
            ? { ...p, state: 'corrupt' as const, corruptDice: 1 }
            : p
        ),
      }

      const p1Before = state.players.find(p => p.id === 'warrior-1')!
      expect(p1Before.knowsDemonSwordPosition).toBe(false)

      // P1을 마왕성으로 이동
      state = movePlayerToPosition(engine, state, 'warrior-1', castleTile.coord)

      const p1After = state.players.find(p => p.id === 'warrior-1')!
      expect(p1After.knowsDemonSwordPosition).toBe(true)
    })

    it('신성 플레이어는 마왕성 진입해도 마검 위치를 모른다', () => {
      let state = createFourPlayerGame()

      // P3(법사)는 신성 상태
      const p3Before = state.players.find(p => p.id === 'mage-1')!
      expect(p3Before.state).toBe('holy')
      expect(p3Before.knowsDemonSwordPosition).toBe(false)

      // P3를 마왕성으로 이동
      state = movePlayerToPosition(engine, state, 'mage-1', castleTile.coord)

      const p3After = state.players.find(p => p.id === 'mage-1')!
      expect(p3After.knowsDemonSwordPosition).toBe(false)
    })

    it('마검 위치를 모르면 마검을 뽑을 수 없다', () => {
      let state = createFourPlayerGame()
      const swordPosition = state.demonSwordPosition!

      // P1을 타락 상태로 설정 (마왕성 미방문)
      state = {
        ...state,
        players: state.players.map(p =>
          p.id === 'warrior-1'
            ? {
                ...p,
                state: 'corrupt' as const,
                corruptDice: 1,
                knowsDemonSwordPosition: false,
              }
            : p
        ),
      }

      // P1을 마검 위치로 이동
      state = movePlayerToPosition(engine, state, 'warrior-1', swordPosition)

      // P1의 턴으로 이동하고 마검 뽑기 시도
      state = advanceToPlayerTurn(engine, state, 'warrior-1')
      state = skipToActionPhase(engine, state)

      const result = engine.executeAction(state, { type: 'DRAW_DEMON_SWORD' }, 'warrior-1')

      expect(result.success).toBe(false)
      expect(result.message).toContain('마왕성')
    })

    it('마검 위치를 알면 마검을 뽑을 수 있다', () => {
      let state = createFourPlayerGame()
      const swordPosition = state.demonSwordPosition!

      // P1을 타락 상태로 설정 + 마검 위치 앎
      state = {
        ...state,
        players: state.players.map(p =>
          p.id === 'warrior-1'
            ? {
                ...p,
                state: 'corrupt' as const,
                corruptDice: 1,
                knowsDemonSwordPosition: true,
              }
            : p
        ),
      }

      // P1을 마검 위치로 이동
      state = movePlayerToPosition(engine, state, 'warrior-1', swordPosition)

      // P1의 턴으로 이동하고 마검 뽑기
      state = advanceToPlayerTurn(engine, state, 'warrior-1')
      state = skipToActionPhase(engine, state)

      const result = engine.executeAction(state, { type: 'DRAW_DEMON_SWORD' }, 'warrior-1')

      expect(result.success).toBe(true)

      const p1After = result.newState.players.find(p => p.id === 'warrior-1')!
      expect(p1After.hasDemonSword).toBe(true)
      expect(result.newState.demonSwordPosition).toBeNull()
    })
  })

  describe('Phase 3: 승리 경쟁', () => {
    describe('시나리오 A: P4 발록 처단 → 계시 승리', () => {
      it('P4가 발록 처단 계시를 완료하면 즉시 승리한다', () => {
        let state = createFourPlayerGame()

        // P4가 발록 처단 계시를 보유하고 완료 조건 충족
        const balrogRevelation = {
          id: 'slay-balrog',
          name: '발록 처단',
          source: 'angel' as const,
          task: '신성 상태로 발록 처치',
          reward: { faithScore: 3 },
          isGameEnd: true,
        }

        state = {
          ...state,
          players: state.players.map(p =>
            p.id === 'warrior-2'
              ? {
                  ...p,
                  state: 'holy' as const,
                  completedRevelations: [balrogRevelation],
                }
              : p
          ),
        }

        const result = checkVictoryCondition(state)

        expect(result.hasWinner).toBe(true)
        expect(result.victoryType).toBe('revelation')
        expect(result.winnerId).toBe('warrior-2')
      })
    })

    describe('시나리오 B: P1 마검+신전 → 마왕 승리', () => {
      it('P1이 마검을 들고 신전에 있으면 마왕 승리가 트리거된다', () => {
        let state = createFourPlayerGame()

        // P1: 타락 + 마검 + 신전 위치
        // P2: 마왕 점수 최고
        state = {
          ...state,
          demonSwordPosition: null,
          players: state.players.map(p => {
            if (p.id === 'warrior-1') {
              return {
                ...p,
                state: 'corrupt' as const,
                hasDemonSword: true,
                knowsDemonSwordPosition: true,
                position: templeTile.coord,
                devilScore: 5,
                faithScore: 0,
              }
            }
            if (p.id === 'rogue-1') {
              return { ...p, devilScore: 10, faithScore: 2 } // 순 점수 8 (최고)
            }
            return p
          }),
        }

        const result = checkVictoryCondition(state)

        expect(result.hasWinner).toBe(true)
        expect(result.victoryType).toBe('demon_king')
        expect(result.triggerPlayerId).toBe('warrior-1')
        expect(result.winnerId).toBe('rogue-1') // 마왕 점수 최고자가 승리
      })
    })

    describe('시나리오 C: P3 신앙5+마왕성 → 천사 승리', () => {
      it('P3가 신앙 5점으로 마왕성에서 천사 승리 계시를 완료하면 천사 승리가 트리거된다', () => {
        let state = createFourPlayerGame()

        // 천사 승리 계시
        const angelVictoryRevelation = {
          id: 'defeat-demon-king',
          name: '마왕 처단',
          source: 'angel' as const,
          task: '신앙 5점 이상 달성 후 마왕성 진입',
          reward: { faithScore: 5 },
          isGameEnd: true,
        }

        // P3: 신앙 5점 + 마왕성 + 천사 승리 계시 완료
        state = {
          ...state,
          players: state.players.map(p => {
            if (p.id === 'mage-1') {
              return {
                ...p,
                state: 'holy' as const,
                faithScore: 5,
                position: castleTile.coord,
                completedRevelations: [angelVictoryRevelation],
              }
            }
            if (p.id === 'warrior-2') {
              return { ...p, faithScore: 8, devilScore: 1 } // 순 점수 7 (최고)
            }
            return p
          }),
        }

        const result = checkVictoryCondition(state)

        expect(result.hasWinner).toBe(true)
        expect(result.victoryType).toBe('angel')
        expect(result.triggerPlayerId).toBe('mage-1')
        expect(result.winnerId).toBe('warrior-2') // 신앙 점수 최고자가 승리
      })
    })
  })

  describe('전략적 분기점', () => {
    it('트리거 플레이어와 실제 승자가 다를 수 있다', () => {
      let state = createFourPlayerGame()

      // P1이 마왕 승리를 트리거하지만, P2가 마왕 점수 최고
      state = {
        ...state,
        demonSwordPosition: null,
        players: state.players.map(p => {
          if (p.id === 'warrior-1') {
            return {
              ...p,
              state: 'corrupt' as const,
              hasDemonSword: true,
              knowsDemonSwordPosition: true,
              position: templeTile.coord,
              devilScore: 3,
              faithScore: 0,
            }
          }
          if (p.id === 'rogue-1') {
            return { ...p, devilScore: 15, faithScore: 5 } // 순 점수 10 (최고)
          }
          if (p.id === 'mage-1') {
            return { ...p, devilScore: 8, faithScore: 2 } // 순 점수 6
          }
          if (p.id === 'warrior-2') {
            return { ...p, devilScore: 1, faithScore: 5 } // 순 점수 -4
          }
          return p
        }),
      }

      const result = checkVictoryCondition(state)

      expect(result.hasWinner).toBe(true)
      expect(result.victoryType).toBe('demon_king')
      expect(result.triggerPlayerId).toBe('warrior-1')
      expect(result.winnerId).toBe('rogue-1')
      expect(result.message).toContain('도적1')
    })

    it('마검 위치 정보를 먼저 얻는 것이 전략적 우위', () => {
      let state = createFourPlayerGame()
      const swordPosition = state.demonSwordPosition!

      // P1: 타락 + 마검 위치 앎 (마왕성 방문 완료)
      // P2: 타락 + 마검 위치 모름
      state = {
        ...state,
        players: state.players.map(p => {
          if (p.id === 'warrior-1') {
            return {
              ...p,
              state: 'corrupt' as const,
              position: swordPosition,
              knowsDemonSwordPosition: true,
            }
          }
          if (p.id === 'rogue-1') {
            return {
              ...p,
              state: 'corrupt' as const,
              position: swordPosition,
              knowsDemonSwordPosition: false,
            }
          }
          return p
        }),
      }

      // P1의 턴으로 이동하고 마검 뽑기 시도
      state = advanceToPlayerTurn(engine, state, 'warrior-1')
      state = skipToActionPhase(engine, state)

      // P1은 마검을 뽑을 수 있다
      const resultP1 = engine.executeAction(state, { type: 'DRAW_DEMON_SWORD' }, 'warrior-1')
      expect(resultP1.success).toBe(true)

      // P2는 마검을 뽑을 수 없다 (위치를 모름)
      const resultP2 = engine.executeAction(state, { type: 'DRAW_DEMON_SWORD' }, 'rogue-1')
      expect(resultP2.success).toBe(false)
    })

    it('승리 조건 동시 충족 시 플레이어 순서대로 체크된다', () => {
      let state = createFourPlayerGame()

      // 계시 승리 조건 (P4: 발록 처단)
      const balrogRevelation = {
        id: 'slay-balrog',
        name: '발록 처단',
        source: 'angel' as const,
        task: '신성 상태로 발록 처치',
        reward: { faithScore: 3 },
        isGameEnd: true,
      }

      // 마왕 승리 조건 (P1: 마검 + 신전)
      // P1(warrior-1)이 배열에서 먼저 체크되므로 마왕 승리가 먼저 트리거됨
      state = {
        ...state,
        demonSwordPosition: null,
        players: state.players.map(p => {
          if (p.id === 'warrior-1') {
            return {
              ...p,
              state: 'corrupt' as const,
              hasDemonSword: true,
              knowsDemonSwordPosition: true,
              position: templeTile.coord,
              devilScore: 10,
            }
          }
          if (p.id === 'warrior-2') {
            return {
              ...p,
              state: 'holy' as const,
              completedRevelations: [balrogRevelation],
              faithScore: 5,
            }
          }
          return p
        }),
      }

      const result = checkVictoryCondition(state)

      // 플레이어 순서대로 체크되므로 P1(warrior-1)의 마왕 승리가 먼저 트리거됨
      expect(result.hasWinner).toBe(true)
      expect(result.victoryType).toBe('demon_king')
      expect(result.triggerPlayerId).toBe('warrior-1')
      // 마왕 점수 최고자가 승자
      expect(result.winnerId).toBe('warrior-1')
    })
  })

  describe('전체 게임 흐름 시뮬레이션', () => {
    it('마왕 승리 전체 흐름: 타락 → 마왕성(마검 위치 획득) → 마검 획득 → 신전', () => {
      let state = createFourPlayerGame()

      // === STEP 1: 게임 시작 - 모든 플레이어 마검 위치 모름 ===
      expect(state.players.every(p => !p.knowsDemonSwordPosition)).toBe(true)
      expect(state.demonSwordPosition).not.toBeNull()

      const swordPosition = state.demonSwordPosition!

      // === STEP 2: P1을 타락 상태로 설정 (다른 용사 처치 가정) ===
      state = {
        ...state,
        players: state.players.map(p =>
          p.id === 'warrior-1'
            ? {
                ...p,
                state: 'corrupt' as const,
                corruptDice: 1,
                devilScore: 3,
              }
            : p
        ),
      }

      const p1AfterCorrupt = state.players.find(p => p.id === 'warrior-1')!
      expect(p1AfterCorrupt.state).toBe('corrupt')
      expect(p1AfterCorrupt.knowsDemonSwordPosition).toBe(false)

      // === STEP 3: P1이 마왕성 진입 → 마검 위치 획득 ===
      state = movePlayerToPosition(engine, state, 'warrior-1', castleTile.coord)

      const p1AfterCastle = state.players.find(p => p.id === 'warrior-1')!
      expect(p1AfterCastle.knowsDemonSwordPosition).toBe(true)

      // === STEP 4: P1이 마검 위치로 이동 후 마검 획득 ===
      state = movePlayerToPosition(engine, state, 'warrior-1', swordPosition)
      state = advanceToPlayerTurn(engine, state, 'warrior-1')
      state = skipToActionPhase(engine, state)

      const drawResult = engine.executeAction(state, { type: 'DRAW_DEMON_SWORD' }, 'warrior-1')
      expect(drawResult.success).toBe(true)
      state = drawResult.newState

      const p1WithSword = state.players.find(p => p.id === 'warrior-1')!
      expect(p1WithSword.hasDemonSword).toBe(true)
      expect(state.demonSwordPosition).toBeNull()

      // === STEP 5: P1이 신전으로 이동 ===
      // 타락 상태에서는 신전 진입 불가하지만, 마검 보유 시 가능
      state = movePlayerToPosition(engine, state, 'warrior-1', templeTile.coord)

      // === STEP 6: 마왕 승리 확인 ===
      const victoryResult = checkVictoryCondition(state)

      expect(victoryResult.hasWinner).toBe(true)
      expect(victoryResult.victoryType).toBe('demon_king')
      expect(victoryResult.triggerPlayerId).toBe('warrior-1')
      expect(victoryResult.winnerId).toBe('warrior-1') // 마왕 점수 3으로 최고
    })
  })
})
