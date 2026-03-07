import { describe, it, expect, beforeEach } from 'vitest'
import { GameEngine } from '../engine/game-engine'
import type { GameState, Player, HexCoord } from '../types'
import {
  applyDamageToPlayer,
  applyDamageToMonster,
  healAtVillage,
  applyFireTileDamage,
} from '../engine/combat'
import { GAME_BOARD, STARTING_POSITIONS, TILE_EFFECTS, DEATH_RESPAWN_TURNS } from '../constants'
import { MockDiceRoller } from './test-helpers'

/**
 * 테스트용 게임 상태 생성 헬퍼
 */
function createTestState(overrides?: {
  playerOverrides?: Array<Partial<Player> & { index?: number }>
  monsterOverrides?: Array<{ id: string } & Record<string, any>>
}): GameState {
  const diceRoller = new MockDiceRoller()
  diceRoller.setDefaultValue(3)
  const engine = new GameEngine({ diceRoller })

  let state = engine.createGame({
    players: [
      { id: 'warrior-1', name: 'Warrior', heroClass: 'warrior' },
      { id: 'rogue-1', name: 'Rogue', heroClass: 'rogue' },
      { id: 'mage-1', name: 'Mage', heroClass: 'mage' },
    ],
  })

  if (overrides?.playerOverrides) {
    for (const override of overrides.playerOverrides) {
      const idx = override.index ?? 0
      const { index: _, ...rest } = override
      state = {
        ...state,
        players: state.players.map((p, i) => i === idx ? { ...p, ...rest } : p),
      }
    }
  }

  if (overrides?.monsterOverrides) {
    state = {
      ...state,
      monsters: state.monsters.map(m => {
        const override = overrides.monsterOverrides!.find(o => o.id === m.id)
        return override ? { ...m, ...override } : m
      }),
    }
  }

  return state
}

describe('combat', () => {
  describe('applyDamageToPlayer', () => {
    it('플레이어에게 피해를 적용한다', () => {
      const state = createTestState()
      const target = state.players[0]

      const result = applyDamageToPlayer(state, target.id, 5)

      const updatedTarget = result.newState.players.find(p => p.id === target.id)!
      expect(updatedTarget.health).toBe(target.health - 5)
      expect(updatedTarget.isDead).toBe(false)
    })

    it('체력이 0 이하가 되면 사망 처리한다', () => {
      const state = createTestState({
        playerOverrides: [{ index: 0, health: 5 }],
      })
      const target = state.players[0]

      const result = applyDamageToPlayer(state, target.id, 10)

      const updatedTarget = result.newState.players.find(p => p.id === target.id)!
      expect(updatedTarget.health).toBe(0)
      expect(updatedTarget.isDead).toBe(true)
      expect(updatedTarget.deathTurnsRemaining).toBe(DEATH_RESPAWN_TURNS)
      expect(result.events.some(e => e.type === 'PLAYER_DIED')).toBe(true)
    })

    it('이미 죽은 플레이어는 무시한다', () => {
      const state = createTestState({
        playerOverrides: [{ index: 0, isDead: true, health: 0 }],
      })
      const target = state.players[0]

      const result = applyDamageToPlayer(state, target.id, 10)

      expect(result.events).toHaveLength(0)
    })

    it('attackerId가 있으면 PLAYER_ATTACKED 이벤트를 발생시킨다', () => {
      const state = createTestState()
      const target = state.players[0]
      const attacker = state.players[1]

      const result = applyDamageToPlayer(state, target.id, 5, attacker.id)

      expect(result.events).toContainEqual({
        type: 'PLAYER_ATTACKED',
        attackerId: attacker.id,
        targetId: target.id,
        damage: 5,
      })
    })
  })

  describe('applyDamageToMonster', () => {
    it('몬스터에게 피해를 적용한다', () => {
      const state = createTestState()
      const monster = state.monsters.find(m => m.id === 'harpy')!
      const attacker = state.players[0]

      const result = applyDamageToMonster(state, monster.id, 5, attacker.id)

      const updatedMonster = result.newState.monsters.find(m => m.id === monster.id)!
      expect(updatedMonster.health).toBe(monster.health - 5)
    })

    it('피해만큼 몬스터 정수를 획득한다', () => {
      const state = createTestState()
      const monster = state.monsters.find(m => m.id === 'harpy')!
      const attacker = state.players[0]

      const result = applyDamageToMonster(state, monster.id, 5, attacker.id)

      const updatedAttacker = result.newState.players.find(p => p.id === attacker.id)!
      expect(updatedAttacker.monsterEssence).toBe(attacker.monsterEssence + 5)
    })

    it('남은 체력보다 많은 피해는 남은 체력만큼만 정수로 획득', () => {
      const state = createTestState({
        monsterOverrides: [{ id: 'harpy', health: 3 }],
      })
      const attacker = state.players[0]

      const result = applyDamageToMonster(state, 'harpy', 100, attacker.id)

      const updatedAttacker = result.newState.players.find(p => p.id === attacker.id)!
      expect(updatedAttacker.monsterEssence).toBe(attacker.monsterEssence + 3)
    })

    it('몬스터 사망 시 MONSTER_DIED 이벤트', () => {
      const state = createTestState({
        monsterOverrides: [{ id: 'harpy', health: 1 }],
      })
      const attacker = state.players[0]

      const result = applyDamageToMonster(state, 'harpy', 5, attacker.id)

      const updatedMonster = result.newState.monsters.find(m => m.id === 'harpy')!
      expect(updatedMonster.isDead).toBe(true)
      expect(result.events.some(e => e.type === 'MONSTER_DIED')).toBe(true)
    })
  })

  describe('healAtVillage', () => {
    it('자기 직업 마을에서 10 회복', () => {
      const warriorStart = STARTING_POSITIONS.warrior[0]
      const state = createTestState({
        playerOverrides: [{ index: 0, position: warriorStart, health: 20, maxHealth: 30 }],
      })

      const result = healAtVillage(state, 'warrior-1')

      const healed = result.newState.players.find(p => p.id === 'warrior-1')!
      expect(result.healAmount).toBe(10)
      expect(healed.health).toBe(30)
    })

    it('다른 직업 마을에서 5 회복', () => {
      const rogueStart = STARTING_POSITIONS.rogue[0]
      const state = createTestState({
        playerOverrides: [{ index: 0, position: rogueStart, health: 20, maxHealth: 30 }],
      })

      const result = healAtVillage(state, 'warrior-1')

      expect(result.healAmount).toBe(5)
      const healed = result.newState.players.find(p => p.id === 'warrior-1')!
      expect(healed.health).toBe(25)
    })

    it('최대 체력을 초과하지 않는다', () => {
      const warriorStart = STARTING_POSITIONS.warrior[0]
      const state = createTestState({
        playerOverrides: [{ index: 0, position: warriorStart, health: 28, maxHealth: 30 }],
      })

      const result = healAtVillage(state, 'warrior-1')

      const healed = result.newState.players.find(p => p.id === 'warrior-1')!
      expect(healed.health).toBe(30)
      expect(result.healAmount).toBe(2)
    })

    it('마을이 아닌 곳에서는 회복하지 않는다', () => {
      const plainTile = GAME_BOARD.find(t => t.type === 'plain')!
      const state = createTestState({
        playerOverrides: [{ index: 0, position: plainTile.coord, health: 20, maxHealth: 30 }],
      })

      const result = healAtVillage(state, 'warrior-1')

      expect(result.healAmount).toBe(0)
    })
  })

  describe('applyFireTileDamage', () => {
    let fireTile: HexCoord

    beforeEach(() => {
      const tile = GAME_BOARD.find(t => t.type === 'fire')!
      fireTile = tile.coord
    })

    it('신성 용사가 화염 타일에서 10 피해', () => {
      const state = createTestState({
        playerOverrides: [{ index: 0, position: fireTile, state: 'holy' as const, health: 30, maxHealth: 30 }],
      })

      const result = applyFireTileDamage(state, 'warrior-1')

      expect(result.damage).toBe(TILE_EFFECTS.fire.baseDamage)
      const updated = result.newState.players.find(p => p.id === 'warrior-1')!
      expect(updated.health).toBe(20)
    })

    it('타락 용사는 화염 면역', () => {
      const state = createTestState({
        playerOverrides: [{ index: 0, position: fireTile, state: 'corrupt' as const, health: 30, maxHealth: 30 }],
      })

      const result = applyFireTileDamage(state, 'warrior-1')

      expect(result.damage).toBe(0)
    })

    it('타락 주사위가 있으면 화염 피해 감소', () => {
      const state = createTestState({
        playerOverrides: [{ index: 0, position: fireTile, state: 'holy' as const, health: 30, maxHealth: 30, corruptDice: 3 }],
      })

      const result = applyFireTileDamage(state, 'warrior-1')

      expect(result.damage).toBe(7) // 10 - 3
    })
  })

  describe('기본 공격 통합 테스트 (GameEngine)', () => {
    let engine: GameEngine
    let diceRoller: MockDiceRoller

    beforeEach(() => {
      diceRoller = new MockDiceRoller()
      diceRoller.setDefaultValue(3)
      engine = new GameEngine({ diceRoller })
    })

    it('마검 소유자는 몬스터를 공격할 수 없다', () => {
      let state = engine.createGame({
        players: [
          { id: 'warrior-1', name: 'Warrior', heroClass: 'warrior' },
        ],
      })

      const harpy = state.monsters.find(m => m.id === 'harpy')!
      const adjacentToHarpy: HexCoord = { q: 7, r: -4 } // 하피 인접 타일

      state = {
        ...state,
        players: state.players.map(p => ({
          ...p,
          position: adjacentToHarpy,
          hasDemonSword: true,
          turnPhase: 'action' as const,
          remainingMovement: 0,
        })),
        roundTurnOrder: ['warrior-1', 'monster'],
        currentTurnIndex: 0,
      }

      const result = engine.executeAction(state, { type: 'BASIC_ATTACK', targetId: 'harpy' })

      expect(result.success).toBe(false)
      expect(result.message).toContain('마검 소유자는 몬스터를 공격할 수 없습니다')
    })

    it('골렘 기본공격 면역 시 피해 무시', () => {
      let state = engine.createGame({
        players: [
          { id: 'warrior-1', name: 'Warrior', heroClass: 'warrior' },
        ],
      })

      const adjacentToGolem: HexCoord = { q: 8, r: -8 } // 골렘 인접 타일

      state = {
        ...state,
        players: state.players.map(p => ({
          ...p,
          position: adjacentToGolem,
          turnPhase: 'action' as const,
          remainingMovement: 0,
        })),
        roundTurnOrder: ['warrior-1', 'monster'],
        currentTurnIndex: 0,
        monsterRoundBuffs: {
          ...state.monsterRoundBuffs,
          golemBasicAttackImmune: true,
        },
      }

      const golemBefore = state.monsters.find(m => m.id === 'golem')!
      const result = engine.executeAction(state, { type: 'BASIC_ATTACK', targetId: 'golem' })

      expect(result.success).toBe(true)
      expect(result.message).toContain('기본 공격을 무시')
      const golemAfter = result.newState.monsters.find(m => m.id === 'golem')!
      expect(golemAfter.health).toBe(golemBefore.health)
    })

    it('은신 상태 플레이어는 공격할 수 없다', () => {
      let state = engine.createGame({
        players: [
          { id: 'warrior-1', name: 'Warrior', heroClass: 'warrior' },
          { id: 'rogue-1', name: 'Rogue', heroClass: 'rogue' },
        ],
      })

      const pos1: HexCoord = { q: 0, r: 0 }
      const pos2: HexCoord = { q: 1, r: 0 }

      state = {
        ...state,
        players: state.players.map(p => {
          if (p.id === 'warrior-1') return { ...p, position: pos1, turnPhase: 'action' as const, remainingMovement: 0 }
          if (p.id === 'rogue-1') return { ...p, position: pos2, isStealthed: true }
          return p
        }),
        roundTurnOrder: ['warrior-1', 'rogue-1', 'monster'],
        currentTurnIndex: 0,
      }

      const result = engine.executeAction(state, { type: 'BASIC_ATTACK', targetId: 'rogue-1' })

      expect(result.success).toBe(false)
      expect(result.message).toContain('은신')
    })

    it('무적 태세 활성 시 힘 수치만큼 피해 감소', () => {
      let state = engine.createGame({
        players: [
          { id: 'warrior-1', name: 'Warrior', heroClass: 'warrior' },
          { id: 'rogue-1', name: 'Rogue', heroClass: 'rogue' },
        ],
      })

      const pos1: HexCoord = { q: 0, r: 0 }
      const pos2: HexCoord = { q: 1, r: 0 }

      state = {
        ...state,
        players: state.players.map(p => {
          if (p.id === 'warrior-1') {
            return {
              ...p,
              position: pos1,
              turnPhase: 'action' as const,
              remainingMovement: 0,
              stats: { ...p.stats, strength: [3, 3] as [number, number] }, // 힘 6
            }
          }
          if (p.id === 'rogue-1') {
            return {
              ...p,
              position: pos2,
              ironStanceActive: true,
              stats: { ...p.stats, strength: [3, 2] as [number, number] }, // 힘 5
              health: 20,
              maxHealth: 20,
            }
          }
          return p
        }),
        roundTurnOrder: ['warrior-1', 'rogue-1', 'monster'],
        currentTurnIndex: 0,
      }

      const result = engine.executeAction(state, { type: 'BASIC_ATTACK', targetId: 'rogue-1' })

      expect(result.success).toBe(true)
      const rogue = result.newState.players.find(p => p.id === 'rogue-1')!
      expect(rogue.health).toBe(19) // 20 - (6 - 5) = 19
    })

    it('독 바르기 시 민첩 추가 피해 후 소모', () => {
      let state = engine.createGame({
        players: [
          { id: 'rogue-1', name: 'Rogue', heroClass: 'rogue' },
          { id: 'warrior-1', name: 'Warrior', heroClass: 'warrior' },
        ],
      })

      const pos1: HexCoord = { q: 0, r: 0 }
      const pos2: HexCoord = { q: 1, r: 0 }

      state = {
        ...state,
        players: state.players.map(p => {
          if (p.id === 'rogue-1') {
            return {
              ...p,
              position: pos1,
              turnPhase: 'action' as const,
              remainingMovement: 0,
              poisonActive: true,
              stats: {
                strength: [2, 2] as [number, number],
                dexterity: [3, 3] as [number, number],
                intelligence: [1, 1] as [number, number],
              },
            }
          }
          if (p.id === 'warrior-1') return { ...p, position: pos2, health: 30, maxHealth: 30 }
          return p
        }),
        roundTurnOrder: ['rogue-1', 'warrior-1', 'monster'],
        currentTurnIndex: 0,
      }

      const result = engine.executeAction(state, { type: 'BASIC_ATTACK', targetId: 'warrior-1' })

      expect(result.success).toBe(true)
      const warrior = result.newState.players.find(p => p.id === 'warrior-1')!
      expect(warrior.health).toBe(20) // 30 - (4 + 6) = 20

      const rogue = result.newState.players.find(p => p.id === 'rogue-1')!
      expect(rogue.poisonActive).toBe(false)
    })

    it('공격 시 은신 해제', () => {
      let state = engine.createGame({
        players: [
          { id: 'rogue-1', name: 'Rogue', heroClass: 'rogue' },
          { id: 'warrior-1', name: 'Warrior', heroClass: 'warrior' },
        ],
      })

      const pos1: HexCoord = { q: 0, r: 0 }
      const pos2: HexCoord = { q: 1, r: 0 }

      state = {
        ...state,
        players: state.players.map(p => {
          if (p.id === 'rogue-1') return { ...p, position: pos1, turnPhase: 'action' as const, remainingMovement: 0, isStealthed: true }
          if (p.id === 'warrior-1') return { ...p, position: pos2 }
          return p
        }),
        roundTurnOrder: ['rogue-1', 'warrior-1', 'monster'],
        currentTurnIndex: 0,
      }

      const result = engine.executeAction(state, { type: 'BASIC_ATTACK', targetId: 'warrior-1' })

      expect(result.success).toBe(true)
      const rogue = result.newState.players.find(p => p.id === 'rogue-1')!
      expect(rogue.isStealthed).toBe(false)
    })

    it('턴당 1회 제한 (hasUsedBasicAttack)', () => {
      let state = engine.createGame({
        players: [
          { id: 'warrior-1', name: 'Warrior', heroClass: 'warrior' },
          { id: 'rogue-1', name: 'Rogue', heroClass: 'rogue' },
        ],
      })

      const pos1: HexCoord = { q: 0, r: 0 }
      const pos2: HexCoord = { q: 1, r: 0 }

      state = {
        ...state,
        players: state.players.map(p => {
          if (p.id === 'warrior-1') return { ...p, position: pos1, turnPhase: 'action' as const, remainingMovement: 0, hasUsedBasicAttack: true }
          if (p.id === 'rogue-1') return { ...p, position: pos2 }
          return p
        }),
        roundTurnOrder: ['warrior-1', 'rogue-1', 'monster'],
        currentTurnIndex: 0,
      }

      const result = engine.executeAction(state, { type: 'BASIC_ATTACK', targetId: 'rogue-1' })

      expect(result.success).toBe(false)
      expect(result.message).toContain('이미 기본 공격을 사용')
    })
  })
})
