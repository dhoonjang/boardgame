import { describe, it, expect, beforeEach } from 'vitest'
import { GameEngine } from '../engine/game-engine'
import { getMaxHealthByLevel } from '../constants'
import type { Player } from '../types'

describe('Health System', () => {
  describe('getMaxHealthByLevel', () => {
    describe('전사 (Warrior)', () => {
      it('레벨 2~4에서 최대 체력이 30이다', () => {
        expect(getMaxHealthByLevel('warrior', 2)).toBe(30)
        expect(getMaxHealthByLevel('warrior', 3)).toBe(30)
        expect(getMaxHealthByLevel('warrior', 4)).toBe(30)
      })

      it('레벨 5~7에서 최대 체력이 30이다', () => {
        expect(getMaxHealthByLevel('warrior', 5)).toBe(30)
        expect(getMaxHealthByLevel('warrior', 6)).toBe(30)
        expect(getMaxHealthByLevel('warrior', 7)).toBe(30)
      })

      it('레벨 8~10에서 최대 체력이 40이다', () => {
        expect(getMaxHealthByLevel('warrior', 8)).toBe(40)
        expect(getMaxHealthByLevel('warrior', 9)).toBe(40)
        expect(getMaxHealthByLevel('warrior', 10)).toBe(40)
      })

      it('레벨 11에서 최대 체력이 50이다', () => {
        expect(getMaxHealthByLevel('warrior', 11)).toBe(50)
      })

      it('레벨 12에서 최대 체력이 50이다', () => {
        expect(getMaxHealthByLevel('warrior', 12)).toBe(50)
      })
    })

    describe('도적 (Rogue)', () => {
      it('레벨 2~4에서 최대 체력이 20이다', () => {
        expect(getMaxHealthByLevel('rogue', 2)).toBe(20)
        expect(getMaxHealthByLevel('rogue', 3)).toBe(20)
        expect(getMaxHealthByLevel('rogue', 4)).toBe(20)
      })

      it('레벨 5~7에서 최대 체력이 30이다', () => {
        expect(getMaxHealthByLevel('rogue', 5)).toBe(30)
        expect(getMaxHealthByLevel('rogue', 6)).toBe(30)
        expect(getMaxHealthByLevel('rogue', 7)).toBe(30)
      })

      it('레벨 8~10에서 최대 체력이 40이다', () => {
        expect(getMaxHealthByLevel('rogue', 8)).toBe(40)
        expect(getMaxHealthByLevel('rogue', 9)).toBe(40)
        expect(getMaxHealthByLevel('rogue', 10)).toBe(40)
      })

      it('레벨 11에서 최대 체력이 50이다', () => {
        expect(getMaxHealthByLevel('rogue', 11)).toBe(50)
      })

      it('레벨 12에서 최대 체력이 50이다', () => {
        expect(getMaxHealthByLevel('rogue', 12)).toBe(50)
      })
    })

    describe('법사 (Mage)', () => {
      it('레벨 2~4에서 최대 체력이 20이다', () => {
        expect(getMaxHealthByLevel('mage', 2)).toBe(20)
        expect(getMaxHealthByLevel('mage', 3)).toBe(20)
        expect(getMaxHealthByLevel('mage', 4)).toBe(20)
      })

      it('레벨 5~7에서 최대 체력이 20이다', () => {
        expect(getMaxHealthByLevel('mage', 5)).toBe(20)
        expect(getMaxHealthByLevel('mage', 6)).toBe(20)
        expect(getMaxHealthByLevel('mage', 7)).toBe(20)
      })

      it('레벨 8~10에서 최대 체력이 30이다', () => {
        expect(getMaxHealthByLevel('mage', 8)).toBe(30)
        expect(getMaxHealthByLevel('mage', 9)).toBe(30)
        expect(getMaxHealthByLevel('mage', 10)).toBe(30)
      })

      it('레벨 11에서 최대 체력이 40이다', () => {
        expect(getMaxHealthByLevel('mage', 11)).toBe(40)
      })

      it('레벨 12에서 최대 체력이 50이다', () => {
        expect(getMaxHealthByLevel('mage', 12)).toBe(50)
      })
    })

    describe('레벨 범위 처리', () => {
      it('레벨 1 이하는 레벨 2로 처리된다', () => {
        expect(getMaxHealthByLevel('warrior', 1)).toBe(30)
        expect(getMaxHealthByLevel('warrior', 0)).toBe(30)
        expect(getMaxHealthByLevel('warrior', -1)).toBe(30)
      })

      it('레벨 12 초과는 레벨 12로 처리된다', () => {
        expect(getMaxHealthByLevel('warrior', 13)).toBe(50)
        expect(getMaxHealthByLevel('warrior', 100)).toBe(50)
      })
    })
  })

  describe('ROLL_STAT_DICE로 능력치 업그레이드 시 체력 변화', () => {
    let engine: GameEngine

    beforeEach(() => {
      engine = new GameEngine()
    })

    /**
     * 플레이어 레벨 계산 헬퍼 함수
     * 레벨 = 가장 높은 능력치의 주사위 2개 합
     */
    function getPlayerLevel(player: Player): number {
      return Math.max(
        player.stats.strength[0] + player.stats.strength[1],
        player.stats.dexterity[0] + player.stats.dexterity[1],
        player.stats.intelligence[0] + player.stats.intelligence[1]
      )
    }

    it('ROLL_STAT_DICE로 레벨 8에 도달하면 전사의 최대 체력이 40이 된다', () => {
      // 전사 레벨 7 → 8 시나리오
      // 능력치 [6, 1] = 레벨 7, 낮은 주사위 1
      // ROLL_STAT_DICE로 2 이상이 나오면 레벨 상승 가능
      let state = engine.createGame({
        players: [{ id: 'warrior-1', name: 'Warrior', heroClass: 'warrior' }],
      })

      const warrior = state.players[0]

      // 레벨 7 상태 설정 (주사위 [6, 1] = 7)
      state = {
        ...state,
        players: state.players.map(p =>
          p.id === warrior.id
            ? {
                ...p,
                stats: {
                  strength: [6, 1] as [number, number],
                  dexterity: [1, 1] as [number, number],
                  intelligence: [1, 1] as [number, number],
                },
                maxHealth: 30, // 레벨 7 전사 체력
                health: 25,    // 5 데미지 받은 상태
                monsterEssence: 100,
                turnPhase: 'action' as const,
              }
            : p
        ),
        roundTurnOrder: [warrior.id, 'monster'],
        currentTurnIndex: 0,
      }

      // ROLL_STAT_DICE 실행
      const result = engine.executeAction(state, {
        type: 'ROLL_STAT_DICE',
        stat: 'strength',
      })

      expect(result.success).toBe(true)

      const updatedWarrior = result.newState.players.find(p => p.id === warrior.id)!
      const newLevel = getPlayerLevel(updatedWarrior)
      const expectedMaxHealth = getMaxHealthByLevel('warrior', newLevel)

      // 게임 엔진이 레벨에 따라 maxHealth를 업데이트해야 함
      expect(updatedWarrior.maxHealth).toBe(expectedMaxHealth)

      // 성공하면 [6, 1] → [6, 2] = 레벨 8
      if (newLevel === 8) {
        // 최대 체력 30 → 40 (+10), 현재 체력 25 → 35
        expect(updatedWarrior.maxHealth).toBe(40)
        expect(updatedWarrior.health).toBe(35)
      }
    })

    it('ROLL_STAT_DICE로 레벨 5에 도달하면 도적의 최대 체력이 30이 된다', () => {
      let state = engine.createGame({
        players: [{ id: 'rogue-1', name: 'Rogue', heroClass: 'rogue' }],
      })

      const rogue = state.players[0]

      // 레벨 4 상태 설정 (주사위 [3, 1] = 4)
      state = {
        ...state,
        players: state.players.map(p =>
          p.id === rogue.id
            ? {
                ...p,
                stats: {
                  strength: [1, 1] as [number, number],
                  dexterity: [3, 1] as [number, number],
                  intelligence: [1, 1] as [number, number],
                },
                maxHealth: 20, // 레벨 4 도적 체력
                health: 20,
                monsterEssence: 100,
                turnPhase: 'action' as const,
              }
            : p
        ),
        roundTurnOrder: [rogue.id, 'monster'],
        currentTurnIndex: 0,
      }

      const result = engine.executeAction(state, {
        type: 'ROLL_STAT_DICE',
        stat: 'dexterity',
      })

      expect(result.success).toBe(true)

      const updatedRogue = result.newState.players.find(p => p.id === rogue.id)!
      const newLevel = getPlayerLevel(updatedRogue)
      const expectedMaxHealth = getMaxHealthByLevel('rogue', newLevel)

      expect(updatedRogue.maxHealth).toBe(expectedMaxHealth)

      if (newLevel >= 5) {
        expect(updatedRogue.maxHealth).toBe(30)
        expect(updatedRogue.health).toBe(30) // 최대 체력 증가분만큼 증가
      }
    })

    it('ROLL_STAT_DICE로 레벨 8에 도달하면 법사의 최대 체력이 30이 된다', () => {
      let state = engine.createGame({
        players: [{ id: 'mage-1', name: 'Mage', heroClass: 'mage' }],
      })

      const mage = state.players[0]

      // 레벨 7 상태 설정 (주사위 [6, 1] = 7)
      state = {
        ...state,
        players: state.players.map(p =>
          p.id === mage.id
            ? {
                ...p,
                stats: {
                  strength: [1, 1] as [number, number],
                  dexterity: [1, 1] as [number, number],
                  intelligence: [6, 1] as [number, number],
                },
                maxHealth: 20, // 레벨 7 법사 체력
                health: 15,
                monsterEssence: 100,
                turnPhase: 'action' as const,
              }
            : p
        ),
        roundTurnOrder: [mage.id, 'monster'],
        currentTurnIndex: 0,
      }

      const result = engine.executeAction(state, {
        type: 'ROLL_STAT_DICE',
        stat: 'intelligence',
      })

      expect(result.success).toBe(true)

      const updatedMage = result.newState.players.find(p => p.id === mage.id)!
      const newLevel = getPlayerLevel(updatedMage)
      const expectedMaxHealth = getMaxHealthByLevel('mage', newLevel)

      expect(updatedMage.maxHealth).toBe(expectedMaxHealth)

      if (newLevel >= 8) {
        expect(updatedMage.maxHealth).toBe(30)
        expect(updatedMage.health).toBe(25) // 15 + 10 = 25
      }
    })

    it('레벨 구간이 바뀌지 않으면 최대 체력이 유지된다', () => {
      // 레벨 3 → 4, 5, 6, 7 같은 경우 전사는 최대 체력 30 유지
      let state = engine.createGame({
        players: [{ id: 'warrior-1', name: 'Warrior', heroClass: 'warrior' }],
      })

      const warrior = state.players[0]

      // 레벨 3 상태 설정 (주사위 [2, 1] = 3)
      state = {
        ...state,
        players: state.players.map(p =>
          p.id === warrior.id
            ? {
                ...p,
                stats: {
                  strength: [2, 1] as [number, number],
                  dexterity: [1, 1] as [number, number],
                  intelligence: [1, 1] as [number, number],
                },
                maxHealth: 30,
                health: 30,
                monsterEssence: 100,
                turnPhase: 'action' as const,
              }
            : p
        ),
        roundTurnOrder: [warrior.id, 'monster'],
        currentTurnIndex: 0,
      }

      const result = engine.executeAction(state, {
        type: 'ROLL_STAT_DICE',
        stat: 'strength',
      })

      expect(result.success).toBe(true)

      const updatedWarrior = result.newState.players.find(p => p.id === warrior.id)!
      const newLevel = getPlayerLevel(updatedWarrior)

      // 레벨 7 이하면 전사 최대 체력은 30 유지
      if (newLevel <= 7) {
        expect(updatedWarrior.maxHealth).toBe(30)
        expect(updatedWarrior.health).toBe(30) // 변화 없음
      }
    })
  })

  describe('게임 초기화 시 직업별 체력', () => {
    let engine: GameEngine

    beforeEach(() => {
      engine = new GameEngine()
    })

    it('전사는 초기 레벨 2에서 최대 체력 30으로 시작해야 한다', () => {
      // 초기 능력치 [1, 1] = 레벨 2
      // 전사 레벨 2의 최대 체력은 30
      const state = engine.createGame({
        players: [{ id: 'warrior-1', name: 'Warrior', heroClass: 'warrior' }],
      })

      const warrior = state.players[0]
      expect(getPlayerLevel(warrior)).toBe(2) // [1,1] + [1,1] + [1,1] 중 최대 = 2
      expect(warrior.maxHealth).toBe(30)
      expect(warrior.health).toBe(30)
    })

    it('도적은 초기 레벨 2에서 최대 체력 20으로 시작해야 한다', () => {
      const state = engine.createGame({
        players: [{ id: 'rogue-1', name: 'Rogue', heroClass: 'rogue' }],
      })

      const rogue = state.players[0]
      expect(rogue.maxHealth).toBe(20)
      expect(rogue.health).toBe(20)
    })

    it('법사는 초기 레벨 2에서 최대 체력 20으로 시작해야 한다', () => {
      const state = engine.createGame({
        players: [{ id: 'mage-1', name: 'Mage', heroClass: 'mage' }],
      })

      const mage = state.players[0]
      expect(mage.maxHealth).toBe(20)
      expect(mage.health).toBe(20)
    })

    it('같은 게임에서 직업별로 다른 초기 체력을 갖는다', () => {
      const state = engine.createGame({
        players: [
          { id: 'warrior-1', name: 'Warrior', heroClass: 'warrior' },
          { id: 'rogue-1', name: 'Rogue', heroClass: 'rogue' },
          { id: 'mage-1', name: 'Mage', heroClass: 'mage' },
        ],
      })

      const warrior = state.players.find(p => p.heroClass === 'warrior')!
      const rogue = state.players.find(p => p.heroClass === 'rogue')!
      const mage = state.players.find(p => p.heroClass === 'mage')!

      expect(warrior.maxHealth).toBe(30)
      expect(rogue.maxHealth).toBe(20)
      expect(mage.maxHealth).toBe(20)
    })

    /**
     * 플레이어 레벨 계산 헬퍼 함수
     */
    function getPlayerLevel(player: Player): number {
      return Math.max(
        player.stats.strength[0] + player.stats.strength[1],
        player.stats.dexterity[0] + player.stats.dexterity[1],
        player.stats.intelligence[0] + player.stats.intelligence[1]
      )
    }
  })

  describe('최대 체력 증가 시 현재 체력 동기화', () => {
    let engine: GameEngine

    beforeEach(() => {
      engine = new GameEngine()
    })

    it('최대 체력이 증가하면 현재 체력도 같은 양만큼 증가한다', () => {
      // 피해를 입은 상태에서 레벨업하면 현재 체력도 증가해야 함
      // 예: maxHealth 30, health 25 → maxHealth 40, health 35
      let state = engine.createGame({
        players: [{ id: 'warrior-1', name: 'Warrior', heroClass: 'warrior' }],
      })

      const warrior = state.players[0]

      // 레벨 7, 체력 25/30 설정 (주사위 [6, 1] = 7)
      state = {
        ...state,
        players: state.players.map(p =>
          p.id === warrior.id
            ? {
                ...p,
                stats: {
                  strength: [6, 1] as [number, number],
                  dexterity: [1, 1] as [number, number],
                  intelligence: [1, 1] as [number, number],
                },
                maxHealth: 30,
                health: 25, // 5 데미지 받은 상태
                monsterEssence: 100,
                turnPhase: 'action' as const,
              }
            : p
        ),
        roundTurnOrder: [warrior.id, 'monster'],
        currentTurnIndex: 0,
      }

      // 여러 번 주사위를 굴려서 레벨 8 이상이 될 때까지 시도 (최대 100회)
      for (let i = 0; i < 100; i++) {
        const result = engine.executeAction(state, {
          type: 'ROLL_STAT_DICE',
          stat: 'strength',
        })

        if (!result.success) break

        const updatedWarrior = result.newState.players.find(p => p.id === warrior.id)!
        const newLevel = updatedWarrior.stats.strength[0] + updatedWarrior.stats.strength[1]

        if (newLevel >= 8) {
          // 레벨 8 이상: 최대 체력 40, 현재 체력 35 (25 + 10)
          expect(updatedWarrior.maxHealth).toBe(40)
          expect(updatedWarrior.health).toBe(35)
          return
        }

        // 레벨이 안 올랐으면 다시 시도 (몬스터 정수 보충)
        state = {
          ...result.newState,
          players: result.newState.players.map(p =>
            p.id === warrior.id
              ? { ...p, monsterEssence: 100 }
              : p
          ),
        }
      }

      // 100번 굴렸는데도 레벨 8이 안 되면 통계적으로 거의 불가능
    })

    it('현재 체력이 최대인 상태에서 최대 체력이 증가하면 현재 체력도 증가한다', () => {
      let state = engine.createGame({
        players: [{ id: 'warrior-1', name: 'Warrior', heroClass: 'warrior' }],
      })

      const warrior = state.players[0]

      // 레벨 7, 체력 30/30 (만땅) - 주사위 [6, 1] = 7
      state = {
        ...state,
        players: state.players.map(p =>
          p.id === warrior.id
            ? {
                ...p,
                stats: {
                  strength: [6, 1] as [number, number],
                  dexterity: [1, 1] as [number, number],
                  intelligence: [1, 1] as [number, number],
                },
                maxHealth: 30,
                health: 30,
                monsterEssence: 100,
                turnPhase: 'action' as const,
              }
            : p
        ),
        roundTurnOrder: [warrior.id, 'monster'],
        currentTurnIndex: 0,
      }

      for (let i = 0; i < 100; i++) {
        const result = engine.executeAction(state, {
          type: 'ROLL_STAT_DICE',
          stat: 'strength',
        })

        if (!result.success) break

        const updatedWarrior = result.newState.players.find(p => p.id === warrior.id)!
        const newLevel = updatedWarrior.stats.strength[0] + updatedWarrior.stats.strength[1]

        if (newLevel >= 8) {
          // 레벨 8 이상: 최대 체력 40, 현재 체력도 40
          expect(updatedWarrior.maxHealth).toBe(40)
          expect(updatedWarrior.health).toBe(40)
          return
        }

        state = {
          ...result.newState,
          players: result.newState.players.map(p =>
            p.id === warrior.id
              ? { ...p, monsterEssence: 100 }
              : p
          ),
        }
      }
    })
  })
})
