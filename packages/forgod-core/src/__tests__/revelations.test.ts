import { describe, it, expect } from 'vitest'
import {
  drawRevelation,
  checkRevelationCondition,
  completeRevelation,
  createRevelationDeck,
  checkAngel7Protection,
  processEventRevelations,
} from '../engine/revelations'
import { GameEngine } from '../engine/game-engine'
import type { GameState, Revelation } from '../types'
import { REVELATIONS } from '../constants'
import { MockDiceRoller } from './test-helpers'

function createTestState(): GameState {
  const diceRoller = new MockDiceRoller()
  diceRoller.setDefaultValue(3)
  const engine = new GameEngine({ diceRoller })

  return engine.createGame({
    players: [
      { id: 'player-1', name: 'Player1', heroClass: 'warrior' },
      { id: 'player-2', name: 'Player2', heroClass: 'rogue' },
      { id: 'player-3', name: 'Player3', heroClass: 'mage' },
    ],
  })
}

describe('계시 시스템', () => {
  describe('createRevelationDeck', () => {
    it('계시 덱을 생성한다', () => {
      const deck = createRevelationDeck()
      expect(deck.length).toBe(REVELATIONS.length)
      expect(deck.length).toBeGreaterThan(0)
    })

    it('천사와 마왕 계시를 모두 포함한다', () => {
      const deck = createRevelationDeck()
      const angelCards = deck.filter(r => r.source === 'angel')
      const demonCards = deck.filter(r => r.source === 'demon')
      expect(angelCards.length).toBeGreaterThan(0)
      expect(demonCards.length).toBeGreaterThan(0)
    })
  })

  describe('drawRevelation', () => {
    it('덱에서 카드를 뽑아 플레이어에게 추가', () => {
      const state = createTestState()
      const { newState, revelation } = drawRevelation(state, 'player-1', 'angel')

      expect(revelation).not.toBeNull()
      expect(revelation!.source).toBe('angel')

      const player = newState.players.find(p => p.id === 'player-1')!
      expect(player.revelations).toHaveLength(1)
      expect(player.revelations[0].id).toBe(revelation!.id)

      // 덱에서 제거됨
      expect(newState.revelationDeck.length).toBe(state.revelationDeck.length - 1)
      expect(newState.revelationDeck.find(r => r.id === revelation!.id)).toBeUndefined()
    })

    it('천사/마왕 소스 지정 가능', () => {
      const state = createTestState()

      const angelResult = drawRevelation(state, 'player-1', 'angel')
      expect(angelResult.revelation?.source).toBe('angel')

      const demonResult = drawRevelation(state, 'player-1', 'demon')
      expect(demonResult.revelation?.source).toBe('demon')
    })

    it('해당 소스의 카드가 없으면 null 반환', () => {
      let state = createTestState()
      // 모든 천사 카드 제거
      state = {
        ...state,
        revelationDeck: state.revelationDeck.filter(r => r.source !== 'angel'),
      }

      const { revelation } = drawRevelation(state, 'player-1', 'angel')
      expect(revelation).toBeNull()
    })
  })

  describe('checkRevelationCondition', () => {
    it('angel-9 (마왕 처단): 신앙 5점 이상 + 마왕성 진입', () => {
      let state = createTestState()
      const angel9 = REVELATIONS.find(r => r.id === 'angel-9')!

      // 조건 미충족: 신앙 부족
      const player = state.players.find(p => p.id === 'player-1')!
      expect(checkRevelationCondition(state, player, angel9)).toBe(false)

      // 조건 충족: 신앙 5점 + castle 위치
      // castle 타일 찾기 (constants.ts: setTile(0, -8, 'castle'))
      const castleTile = { q: 0, r: -8 } // 마왕성 위치
      state = {
        ...state,
        players: state.players.map(p =>
          p.id === 'player-1'
            ? { ...p, faithScore: 5, position: castleTile }
            : p
        ),
      }
      const updatedPlayer = state.players.find(p => p.id === 'player-1')!
      const result = checkRevelationCondition(state, updatedPlayer, angel9)
      expect(result).toBe(true)
    })

    it('demon-5 (성장): 최고 레벨 달성', () => {
      let state = createTestState()
      const demon5 = REVELATIONS.find(r => r.id === 'demon-5')!

      // 모든 플레이어 레벨 2 (기본값), player-1도 레벨 2 → 조건 충족
      const player = state.players.find(p => p.id === 'player-1')!
      expect(checkRevelationCondition(state, player, demon5)).toBe(true)

      // player-2 레벨을 높이면 player-1은 최고가 아님
      state = {
        ...state,
        players: state.players.map(p =>
          p.id === 'player-2'
            ? { ...p, stats: { ...p.stats, strength: [5, 5] as [number, number] } }
            : p
        ),
      }
      const playerAgain = state.players.find(p => p.id === 'player-1')!
      expect(checkRevelationCondition(state, playerAgain, demon5)).toBe(false)
    })

    it('demon-9 (타락함 증명): 타락 주사위 3 이상', () => {
      let state = createTestState()
      const demon9 = REVELATIONS.find(r => r.id === 'demon-9')!

      // 타락 주사위 2 → 미충족
      state = {
        ...state,
        players: state.players.map(p =>
          p.id === 'player-1'
            ? { ...p, state: 'corrupt' as const, corruptDice: 2 }
            : p
        ),
      }
      let player = state.players.find(p => p.id === 'player-1')!
      expect(checkRevelationCondition(state, player, demon9)).toBe(false)

      // 타락 주사위 3 → 충족
      state = {
        ...state,
        players: state.players.map(p =>
          p.id === 'player-1'
            ? { ...p, corruptDice: 3 }
            : p
        ),
      }
      player = state.players.find(p => p.id === 'player-1')!
      expect(checkRevelationCondition(state, player, demon9)).toBe(true)
    })

    it('demon-10 (마검 뽑기): 마검 획득', () => {
      let state = createTestState()
      const demon10 = REVELATIONS.find(r => r.id === 'demon-10')!

      const player = state.players.find(p => p.id === 'player-1')!
      expect(checkRevelationCondition(state, player, demon10)).toBe(false)

      state = {
        ...state,
        players: state.players.map(p =>
          p.id === 'player-1' ? { ...p, hasDemonSword: true } : p
        ),
      }
      const updatedPlayer = state.players.find(p => p.id === 'player-1')!
      expect(checkRevelationCondition(state, updatedPlayer, demon10)).toBe(true)
    })
  })

  describe('completeRevelation', () => {
    it('계시 완료 시 보상 적용 (faithScore)', () => {
      let state = createTestState()

      // angel-9를 플레이어에게 부여
      const angel9 = REVELATIONS.find(r => r.id === 'angel-9')!
      state = {
        ...state,
        players: state.players.map(p =>
          p.id === 'player-1'
            ? {
                ...p,
                revelations: [angel9],
                faithScore: 5,
                position: { q: 0, r: -8 }, // castle
              }
            : p
        ),
      }

      const result = completeRevelation(state, 'player-1', 'angel-9')
      expect(result.success).toBe(true)

      const player = result.newState.players.find(p => p.id === 'player-1')!
      // angel-9 보상: faithScore + 5
      expect(player.faithScore).toBe(5 + (angel9.reward.faithScore ?? 0))
    })

    it('완료된 계시는 completedRevelations로 이동', () => {
      let state = createTestState()
      const demon5 = REVELATIONS.find(r => r.id === 'demon-5')!

      state = {
        ...state,
        players: state.players.map(p =>
          p.id === 'player-1'
            ? { ...p, revelations: [demon5] }
            : p
        ),
      }

      const result = completeRevelation(state, 'player-1', 'demon-5')
      expect(result.success).toBe(true)

      const player = result.newState.players.find(p => p.id === 'player-1')!
      expect(player.revelations.find(r => r.id === 'demon-5')).toBeUndefined()
      expect(player.completedRevelations.find(r => r.id === 'demon-5')).toBeDefined()
    })

    it('보유하지 않은 계시는 완료 불가', () => {
      const state = createTestState()
      const result = completeRevelation(state, 'player-1', 'angel-9')
      expect(result.success).toBe(false)
      expect(result.message).toContain('보유')
    })

    it('조건 미충족 시 완료 불가', () => {
      let state = createTestState()
      const angel9 = REVELATIONS.find(r => r.id === 'angel-9')!

      // angel-9는 faithScore 5 필요하지만 0
      state = {
        ...state,
        players: state.players.map(p =>
          p.id === 'player-1'
            ? { ...p, revelations: [angel9] }
            : p
        ),
      }

      const result = completeRevelation(state, 'player-1', 'angel-9')
      expect(result.success).toBe(false)
      expect(result.message).toContain('조건')
    })

    it('게임 종료 계시 처리', () => {
      let state = createTestState()
      const angel9 = REVELATIONS.find(r => r.id === 'angel-9')!
      expect(angel9.isGameEnd).toBe(true)

      state = {
        ...state,
        players: state.players.map(p =>
          p.id === 'player-1'
            ? {
                ...p,
                revelations: [angel9],
                faithScore: 5,
                position: { q: 0, r: -8 },
              }
            : p
        ),
      }

      const result = completeRevelation(state, 'player-1', 'angel-9')
      expect(result.success).toBe(true)
      expect(result.events.some(e => e.type === 'GAME_OVER')).toBe(true)
    })
  })

  describe('processEventRevelations', () => {
    it('발록 공격 시 angel-5 자동 완료', () => {
      let state = createTestState()
      const angel5 = REVELATIONS.find(r => r.id === 'angel-5')!

      state = {
        ...state,
        players: state.players.map(p =>
          p.id === 'player-1'
            ? { ...p, revelations: [angel5] }
            : p
        ),
      }

      const { newState, events } = processEventRevelations(state, {
        attackerId: 'player-1',
        targetId: 'balrog',
        targetIsMonster: true,
        targetMonsterId: 'balrog',
        targetDied: false,
      })

      expect(events.some(e => e.type === 'REVELATION_COMPLETED' && e.revelationId === 'angel-5')).toBe(true)
      const player = newState.players.find(p => p.id === 'player-1')!
      expect(player.completedRevelations.some(r => r.id === 'angel-5')).toBe(true)
    })

    it('발록 처치 시 angel-6 자동 완료 + 게임 종료', () => {
      let state = createTestState()
      const angel6 = REVELATIONS.find(r => r.id === 'angel-6')!

      state = {
        ...state,
        players: state.players.map(p =>
          p.id === 'player-1'
            ? { ...p, revelations: [angel6], state: 'holy' as const }
            : p
        ),
      }

      const { events } = processEventRevelations(state, {
        attackerId: 'player-1',
        targetId: 'balrog',
        targetIsMonster: true,
        targetMonsterId: 'balrog',
        targetDied: true,
      })

      expect(events.some(e => e.type === 'REVELATION_COMPLETED' && e.revelationId === 'angel-6')).toBe(true)
      expect(events.some(e => e.type === 'GAME_OVER')).toBe(true)
    })

    it('신성으로 용사 공격 시 demon-4 자동 완료', () => {
      let state = createTestState()
      const demon4 = REVELATIONS.find(r => r.id === 'demon-4')!

      state = {
        ...state,
        players: state.players.map(p =>
          p.id === 'player-1'
            ? { ...p, revelations: [demon4], state: 'holy' as const }
            : p
        ),
      }

      const { events } = processEventRevelations(state, {
        attackerId: 'player-1',
        targetId: 'player-2',
        targetIsMonster: false,
        targetDied: false,
      })

      expect(events.some(e => e.type === 'REVELATION_COMPLETED' && e.revelationId === 'demon-4')).toBe(true)
    })

    it('신성으로 용사 처치 시 demon-8 자동 완료', () => {
      let state = createTestState()
      const demon8 = REVELATIONS.find(r => r.id === 'demon-8')!

      state = {
        ...state,
        players: state.players.map(p =>
          p.id === 'player-1'
            ? { ...p, revelations: [demon8], state: 'holy' as const }
            : p
        ),
      }

      const { events } = processEventRevelations(state, {
        attackerId: 'player-1',
        targetId: 'player-2',
        targetIsMonster: false,
        targetDied: true,
      })

      expect(events.some(e => e.type === 'REVELATION_COMPLETED' && e.revelationId === 'demon-8')).toBe(true)
    })

    it('조건 미충족 시 완료하지 않음', () => {
      let state = createTestState()
      const angel6 = REVELATIONS.find(r => r.id === 'angel-6')!

      // 타락 상태에서 발록 처치 → angel-6은 신성 상태만 가능
      state = {
        ...state,
        players: state.players.map(p =>
          p.id === 'player-1'
            ? { ...p, revelations: [angel6], state: 'corrupt' as const }
            : p
        ),
      }

      const { events } = processEventRevelations(state, {
        attackerId: 'player-1',
        targetId: 'balrog',
        targetIsMonster: true,
        targetMonsterId: 'balrog',
        targetDied: true,
      })

      expect(events.some(e => e.type === 'REVELATION_COMPLETED' && e.revelationId === 'angel-6')).toBe(false)
    })
  })

  describe('checkAngel7Protection', () => {
    it('타락 용사에게 치사 피해 시 체력 1로 생존', () => {
      let state = createTestState()
      const angel7 = REVELATIONS.find(r => r.id === 'angel-7')!

      state = {
        ...state,
        players: state.players.map(p => {
          if (p.id === 'player-1') {
            return { ...p, revelations: [angel7], health: 5 }
          }
          if (p.id === 'player-2') {
            return { ...p, state: 'corrupt' as const }
          }
          return p
        }),
      }

      const result = checkAngel7Protection(state, 'player-1', 'player-2', 10)
      expect(result.protected).toBe(true)

      const player = result.newState.players.find(p => p.id === 'player-1')!
      expect(player.health).toBe(1)
    })

    it('angel-7 계시 자동 완료 + 신앙 3점', () => {
      let state = createTestState()
      const angel7 = REVELATIONS.find(r => r.id === 'angel-7')!

      state = {
        ...state,
        players: state.players.map(p => {
          if (p.id === 'player-1') {
            return { ...p, revelations: [angel7], health: 5, faithScore: 0 }
          }
          if (p.id === 'player-2') {
            return { ...p, state: 'corrupt' as const }
          }
          return p
        }),
      }

      const result = checkAngel7Protection(state, 'player-1', 'player-2', 10)
      expect(result.protected).toBe(true)

      const player = result.newState.players.find(p => p.id === 'player-1')!
      expect(player.faithScore).toBe(angel7.reward.faithScore ?? 0)
      expect(player.completedRevelations.some(r => r.id === 'angel-7')).toBe(true)
      expect(player.revelations.some(r => r.id === 'angel-7')).toBe(false)
    })

    it('비타락 공격자에게는 발동 안 함', () => {
      let state = createTestState()
      const angel7 = REVELATIONS.find(r => r.id === 'angel-7')!

      state = {
        ...state,
        players: state.players.map(p => {
          if (p.id === 'player-1') {
            return { ...p, revelations: [angel7], health: 5 }
          }
          if (p.id === 'player-2') {
            return { ...p, state: 'holy' as const } // 비타락
          }
          return p
        }),
      }

      const result = checkAngel7Protection(state, 'player-1', 'player-2', 10)
      expect(result.protected).toBe(false)
    })

    it('angel-7 미보유 시 발동 안 함', () => {
      let state = createTestState()

      state = {
        ...state,
        players: state.players.map(p => {
          if (p.id === 'player-1') {
            return { ...p, health: 5 } // angel-7 미보유
          }
          if (p.id === 'player-2') {
            return { ...p, state: 'corrupt' as const }
          }
          return p
        }),
      }

      const result = checkAngel7Protection(state, 'player-1', 'player-2', 10)
      expect(result.protected).toBe(false)
    })

    it('피해가 치명적이지 않으면 발동 안 함', () => {
      let state = createTestState()
      const angel7 = REVELATIONS.find(r => r.id === 'angel-7')!

      state = {
        ...state,
        players: state.players.map(p => {
          if (p.id === 'player-1') {
            return { ...p, revelations: [angel7], health: 20 }
          }
          if (p.id === 'player-2') {
            return { ...p, state: 'corrupt' as const }
          }
          return p
        }),
      }

      // 피해 5 < 체력 20 → 치명적이지 않음
      const result = checkAngel7Protection(state, 'player-1', 'player-2', 5)
      expect(result.protected).toBe(false)
    })
  })
})
