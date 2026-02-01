import { describe, expect, it } from 'vitest'
import { GAME_BOARD } from '../constants'
import {
  applyDamageToMonster,
  applyDamageToPlayer,
  applyFireTileDamage,
  applyTileEntryDamage,
  calculateDamage,
  healAtVillage,
} from '../engine/combat'
import { GameEngine } from '../engine/game-engine'
import type { GameState } from '../types'

function createTestState(): GameState {
  const engine = new GameEngine()
  return engine.createGame({
    players: [
      { id: 'player-1', name: 'Warrior', heroClass: 'warrior' },
      { id: 'player-2', name: 'Rogue', heroClass: 'rogue' },
    ],
  })
}

describe('combat', () => {
  describe('calculateDamage', () => {
    it('기본 피해를 계산한다', () => {
      const state = createTestState()
      const attacker = state.players[0]
      const target = state.players[1]

      const result = calculateDamage(attacker, target, 10)

      expect(result.baseDamage).toBe(10)
      expect(result.finalDamage).toBe(10)
    })

    it('스킬 보너스를 추가한다', () => {
      const state = createTestState()
      const attacker = state.players[0]
      const target = state.players[1]

      const result = calculateDamage(attacker, target, 10, {
        isSkill: true,
        skillBonus: 5,
      })

      expect(result.baseDamage).toBe(10)
      expect(result.bonusDamage).toBe(5)
      expect(result.finalDamage).toBe(15)
    })
  })

  describe('applyDamageToPlayer', () => {
    it('플레이어에게 피해를 적용한다', () => {
      const state = createTestState()
      const targetId = 'player-2'

      const { newState, events } = applyDamageToPlayer(state, targetId, 5, 'player-1')

      const target = newState.players.find(p => p.id === targetId)
      expect(target?.health).toBe(15) // 20 - 5
      expect(target?.isDead).toBe(false)
      expect(events).toContainEqual(
        expect.objectContaining({ type: 'PLAYER_ATTACKED', damage: 5 })
      )
    })

    it('체력이 0 이하가 되면 사망 처리한다', () => {
      const state = createTestState()
      const targetId = 'player-2'

      const { newState, events } = applyDamageToPlayer(state, targetId, 25)

      const target = newState.players.find(p => p.id === targetId)
      expect(target?.health).toBe(0)
      expect(target?.isDead).toBe(true)
      expect(target?.deathTurnsRemaining).toBe(3)
      expect(events).toContainEqual(
        expect.objectContaining({ type: 'PLAYER_DIED', playerId: targetId })
      )
    })

    it('이미 죽은 플레이어는 무시한다', () => {
      let state = createTestState()
      const targetId = 'player-2'

      // 먼저 플레이어를 죽인다
      state = {
        ...state,
        players: state.players.map(p =>
          p.id === targetId ? { ...p, isDead: true, health: 0 } : p
        ),
      }

      const { newState, events } = applyDamageToPlayer(state, targetId, 10)

      expect(events).toHaveLength(0)
      expect(newState).toEqual(state)
    })
  })

  describe('applyDamageToMonster', () => {
    it('몬스터에게 피해를 적용한다', () => {
      const state = createTestState()
      const monster = state.monsters[0]
      const attackerId = 'player-1'

      const { newState, events } = applyDamageToMonster(
        state,
        monster.id,
        10,
        attackerId
      )

      const updatedMonster = newState.monsters.find(m => m.id === monster.id)
      expect(updatedMonster?.health).toBe(monster.health - 10)
      expect(events).toContainEqual(
        expect.objectContaining({ type: 'PLAYER_ATTACKED', targetId: monster.id })
      )
    })

    it('몬스터에게 준 피해만큼 몬스터 정수를 획득한다', () => {
      const state = createTestState()
      const monster = state.monsters[0]
      const attackerId = 'player-1'

      const { newState } = applyDamageToMonster(state, monster.id, 10, attackerId)

      const attacker = newState.players.find(p => p.id === attackerId)
      expect(attacker?.monsterEssence).toBe(10)
    })

    it('몬스터의 남은 체력보다 많은 피해는 남은 체력만큼만 정수로 획득한다', () => {
      let state = createTestState()
      const monster = state.monsters[0]
      const attackerId = 'player-1'

      // 몬스터 체력을 5로 설정
      state = {
        ...state,
        monsters: state.monsters.map(m =>
          m.id === monster.id ? { ...m, health: 5 } : m
        ),
      }

      const { newState } = applyDamageToMonster(state, monster.id, 100, attackerId)

      const attacker = newState.players.find(p => p.id === attackerId)
      expect(attacker?.monsterEssence).toBe(5)
    })

    it('몬스터가 죽으면 MONSTER_DIED 이벤트를 발생시킨다', () => {
      let state = createTestState()
      const monster = state.monsters[0]
      const attackerId = 'player-1'

      // 몬스터 체력을 10으로 설정
      state = {
        ...state,
        monsters: state.monsters.map(m =>
          m.id === monster.id ? { ...m, health: 10 } : m
        ),
      }

      const { newState, events } = applyDamageToMonster(
        state,
        monster.id,
        10,
        attackerId
      )

      const updatedMonster = newState.monsters.find(m => m.id === monster.id)
      expect(updatedMonster?.isDead).toBe(true)
      expect(events).toContainEqual(
        expect.objectContaining({ type: 'MONSTER_DIED', monsterId: monster.id })
      )
    })
  })

  describe('healAtVillage', () => {
    it('자기 직업 마을에서 10 회복한다', () => {
      let state = createTestState()
      const warrior = state.players.find(p => p.heroClass === 'warrior')!

      // 체력을 10으로 설정하고 전사 마을에 위치
      const warriorVillage = GAME_BOARD.find(
        t => t.type === 'village' && t.villageClass === 'warrior'
      )!

      state = {
        ...state,
        players: state.players.map(p =>
          p.id === warrior.id
            ? { ...p, health: 10, position: warriorVillage.coord }
            : p
        ),
      }

      const { newState, healAmount } = healAtVillage(state, warrior.id)

      const healed = newState.players.find(p => p.id === warrior.id)
      expect(healed?.health).toBe(20) // 10 + 10
      expect(healAmount).toBe(10)
    })

    it('다른 직업 마을에서 5 회복한다', () => {
      let state = createTestState()
      const warrior = state.players.find(p => p.heroClass === 'warrior')!

      // 도적 마을에 위치
      const rogueVillage = GAME_BOARD.find(
        t => t.type === 'village' && t.villageClass === 'rogue'
      )!

      state = {
        ...state,
        players: state.players.map(p =>
          p.id === warrior.id
            ? { ...p, health: 10, position: rogueVillage.coord }
            : p
        ),
      }

      const { newState, healAmount } = healAtVillage(state, warrior.id)

      const healed = newState.players.find(p => p.id === warrior.id)
      expect(healed?.health).toBe(15) // 10 + 5
      expect(healAmount).toBe(5)
    })

    it('최대 체력을 초과하지 않는다', () => {
      let state = createTestState()
      const warrior = state.players.find(p => p.heroClass === 'warrior')!

      const warriorVillage = GAME_BOARD.find(
        t => t.type === 'village' && t.villageClass === 'warrior'
      )!

      // 전사의 기본 maxHealth는 30 (레벨 4 기준)
      // 체력 28에서 자기 마을 회복(+10) → 최대 30까지만 회복
      state = {
        ...state,
        players: state.players.map(p =>
          p.id === warrior.id
            ? { ...p, health: 28, position: warriorVillage.coord }
            : p
        ),
      }

      const { newState, healAmount } = healAtVillage(state, warrior.id)

      const healed = newState.players.find(p => p.id === warrior.id)
      expect(healed?.health).toBe(30) // maxHealth가 30
      expect(healAmount).toBe(2) // 30 - 28
    })

    it('마을이 아닌 곳에서는 회복하지 않는다', () => {
      let state = createTestState()
      const warrior = state.players.find(p => p.heroClass === 'warrior')!

      // 평지에 위치
      const plain = GAME_BOARD.find(t => t.type === 'plain')!

      state = {
        ...state,
        players: state.players.map(p =>
          p.id === warrior.id
            ? { ...p, health: 10, position: plain.coord }
            : p
        ),
      }

      const { healAmount } = healAtVillage(state, warrior.id)
      expect(healAmount).toBe(0)
    })
  })

  describe('applyFireTileDamage', () => {
    it('신성 용사가 화염 타일에서 피해를 받는다', () => {
      let state = createTestState()
      const player = state.players[0]

      // 화염 타일 찾기
      const fireTile = GAME_BOARD.find(t => t.type === 'fire')!

      state = {
        ...state,
        players: state.players.map(p =>
          p.id === player.id
            ? { ...p, state: 'holy' as const, position: fireTile.coord }
            : p
        ),
      }

      const { damage } = applyFireTileDamage(state, player.id)

      expect(damage).toBe(10)
    })

    it('타락 용사는 화염 타일에서 피해를 받지 않는다', () => {
      let state = createTestState()
      const player = state.players[0]

      const fireTile = GAME_BOARD.find(t => t.type === 'fire')!

      state = {
        ...state,
        players: state.players.map(p =>
          p.id === player.id
            ? { ...p, state: 'corrupt' as const, position: fireTile.coord }
            : p
        ),
      }

      const { damage } = applyFireTileDamage(state, player.id)

      expect(damage).toBe(0)
    })

    it('타락 주사위만큼 화염 피해가 감소한다', () => {
      let state = createTestState()
      const player = state.players[0]

      const fireTile = GAME_BOARD.find(t => t.type === 'fire')!

      state = {
        ...state,
        players: state.players.map(p =>
          p.id === player.id
            ? { ...p, state: 'holy' as const, corruptDice: 3, position: fireTile.coord }
            : p
        ),
      }

      const { damage } = applyFireTileDamage(state, player.id)

      expect(damage).toBe(7) // 10 - 3
    })
  })

  describe('applyTileEntryDamage', () => {
    it('신성 용사가 마왕성에서 피해를 받는다', () => {
      let state = createTestState()
      const player = state.players[0]

      state = {
        ...state,
        players: state.players.map(p =>
          p.id === player.id ? { ...p, state: 'holy' as const } : p
        ),
      }

      const { damage } = applyTileEntryDamage(state, player.id, 'castle')

      expect(damage).toBe(10)
    })

    it('타락 용사는 마왕성에서 피해를 받지 않는다', () => {
      let state = createTestState()
      const player = state.players[0]

      state = {
        ...state,
        players: state.players.map(p =>
          p.id === player.id ? { ...p, state: 'corrupt' as const } : p
        ),
      }

      const { damage } = applyTileEntryDamage(state, player.id, 'castle')

      expect(damage).toBe(0)
    })
  })
})
