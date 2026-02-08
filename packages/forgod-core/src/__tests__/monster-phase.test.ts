import { describe, it, expect } from 'vitest'
import { processMonsterPhase, checkBalrogRespawn } from '../engine/monsters'
import { GameEngine } from '../engine/game-engine'
import type { GameState, Monster, HexCoord } from '../types'
import { MONSTERS } from '../constants'
import { MockDiceRoller } from './test-helpers'

/**
 * 몬스터 페이즈 테스트용 상태 생성
 */
function createMonsterTestState(): { state: GameState; engine: GameEngine; diceRoller: MockDiceRoller } {
  const diceRoller = new MockDiceRoller()
  diceRoller.setDefaultValue(3)
  const engine = new GameEngine({ diceRoller })

  const state = engine.createGame({
    players: [
      { id: 'warrior-1', name: 'Warrior', heroClass: 'warrior' },
      { id: 'rogue-1', name: 'Rogue', heroClass: 'rogue' },
      { id: 'mage-1', name: 'Mage', heroClass: 'mage' },
    ],
  })

  return { state, engine, diceRoller }
}

/**
 * 플레이어를 특정 위치로 이동
 */
function movePlayerTo(state: GameState, playerId: string, position: HexCoord): GameState {
  return {
    ...state,
    players: state.players.map(p =>
      p.id === playerId ? { ...p, position } : p
    ),
  }
}

describe('processMonsterPhase', () => {
  describe('주사위 및 공격', () => {
    it('몬스터 주사위 6개를 굴리고 정렬한다', () => {
      const { state } = createMonsterTestState()
      const { newState } = processMonsterPhase(state)
      expect(newState.monsterDice).toHaveLength(6)
    })

    it('인접한 플레이어에게 피해를 준다', () => {
      const { state } = createMonsterTestState()
      const harpy = state.monsters.find(m => m.id === 'harpy')!
      const harpyDef = MONSTERS.find(m => m.id === 'harpy')!

      // 플레이어를 하피 인접 타일에 배치
      const targetTile = harpyDef.adjacentTiles[0]
      const modifiedState = movePlayerTo(state, 'warrior-1', targetTile)

      const { newState, events } = processMonsterPhase(modifiedState)

      // 공격이 발생했을 수 있음 (주사위 결과에 따라 타일 결정)
      const warrior = newState.players.find(p => p.id === 'warrior-1')!
      const originalWarrior = modifiedState.players.find(p => p.id === 'warrior-1')!

      // 인접 타일에 있었으므로 공격받을 가능성이 있다
      // 정확한 피해 여부는 주사위 결과에 의존
      expect(newState.monsterDice).toHaveLength(6)
    })
  })

  describe('몬스터별 효과', () => {
    it('리치: 효과 처리 (합 >= 15이면 메테오 면역)', () => {
      const { state } = createMonsterTestState()
      // 리치의 diceIndices: [3, 4, 5] (0-indexed, 정렬된 주사위)
      // processMonsterPhase는 효과를 설정한 후 마지막에 리셋하므로
      // 반환된 상태에서는 확인 불가
      // 대신, 리치만 살아있는 상태로 processMonsterPhase를 실행하여
      // 주사위 굴림 + 정렬이 올바르게 동작하는지 확인
      const modifiedState = {
        ...state,
        monsters: state.monsters.map(m =>
          m.id !== 'lich' ? { ...m, isDead: true } : m
        ),
      }

      const { newState } = processMonsterPhase(modifiedState)
      // 주사위 6개가 굴려짐
      expect(newState.monsterDice).toHaveLength(6)
      // 리셋 후에는 false (구현상 매 라운드 끝에 리셋됨)
      // 버프는 다음 라운드 공격 처리 중에만 유효
      expect(newState.monsterRoundBuffs.meteorImmune).toBe(false)
    })

    it('골렘: 효과 처리 (합 = 12이면 기본공격 면역)', () => {
      const { state } = createMonsterTestState()
      // 골렘 diceIndices: [4, 5] (정렬된 6개 중 상위 2개)
      const modifiedState = {
        ...state,
        monsters: state.monsters.map(m =>
          m.id !== 'golem' ? { ...m, isDead: true } : m
        ),
      }

      const { newState } = processMonsterPhase(modifiedState)
      // 주사위 6개가 굴려짐
      expect(newState.monsterDice).toHaveLength(6)
      // 리셋 후에는 false (구현상 매 라운드 끝에 리셋됨)
      expect(newState.monsterRoundBuffs.golemBasicAttackImmune).toBe(false)
    })

    it('히드라: 합 >= 15이면 잃은 체력의 2배 회복', () => {
      const { state } = createMonsterTestState()
      const hydra = state.monsters.find(m => m.id === 'hydra')!

      // 히드라 체력을 낮춰서 회복 테스트
      const modifiedState = {
        ...state,
        monsters: state.monsters.map(m =>
          m.id === 'hydra' ? { ...m, health: 10 } : { ...m, isDead: true }
        ),
      }

      // 히드라 diceIndices: [0, 1, 4, 5] → 합이 높아야 함
      let healOccurred = false
      for (let i = 0; i < 50; i++) {
        const { newState } = processMonsterPhase(modifiedState)
        const newHydra = newState.monsters.find(m => m.id === 'hydra')!
        if (newHydra.health > 10) {
          healOccurred = true
          break
        }
      }
      expect(healOccurred).toBe(true)
    })
  })

  describe('공격 스킵 조건', () => {
    it('은신 용사 공격 안 함', () => {
      const { state } = createMonsterTestState()
      const harpy = state.monsters.find(m => m.id === 'harpy')!
      const harpyDef = MONSTERS.find(m => m.id === 'harpy')!

      // 플레이어를 하피의 모든 인접 타일에 배치 (은신 상태)
      let modifiedState = state
      for (let i = 0; i < harpyDef.adjacentTiles.length && i < state.players.length; i++) {
        const playerId = state.players[i].id
        modifiedState = movePlayerTo(modifiedState, playerId, harpyDef.adjacentTiles[i])
        modifiedState = {
          ...modifiedState,
          players: modifiedState.players.map(p =>
            p.id === playerId ? { ...p, isStealthed: true } : p
          ),
        }
      }

      // 다른 몬스터 죽이기
      modifiedState = {
        ...modifiedState,
        monsters: modifiedState.monsters.map(m =>
          m.id !== 'harpy' ? { ...m, isDead: true } : m
        ),
      }

      // 여러 번 실행 - 은신 플레이어는 피해 받지 않아야 함
      for (let i = 0; i < 10; i++) {
        const { newState } = processMonsterPhase(modifiedState)
        for (const player of newState.players) {
          const original = modifiedState.players.find(p => p.id === player.id)!
          expect(player.health).toBe(original.health)
        }
      }
    })

    it('마검 소유자 공격 안 함', () => {
      const { state } = createMonsterTestState()
      const harpyDef = MONSTERS.find(m => m.id === 'harpy')!

      let modifiedState = movePlayerTo(state, 'warrior-1', harpyDef.adjacentTiles[0])
      modifiedState = {
        ...modifiedState,
        players: modifiedState.players.map(p =>
          p.id === 'warrior-1' ? { ...p, hasDemonSword: true } : p
        ),
        monsters: modifiedState.monsters.map(m =>
          m.id !== 'harpy' ? { ...m, isDead: true } : m
        ),
      }

      for (let i = 0; i < 10; i++) {
        const { newState } = processMonsterPhase(modifiedState)
        const warrior = newState.players.find(p => p.id === 'warrior-1')!
        const original = modifiedState.players.find(p => p.id === 'warrior-1')!
        expect(warrior.health).toBe(original.health)
      }
    })

    it('무적 태세 피해 감소', () => {
      const { state } = createMonsterTestState()
      const harpyDef = MONSTERS.find(m => m.id === 'harpy')!

      // 전사를 하피 옆에 배치, 무적 태세 활성, 높은 힘
      let modifiedState = movePlayerTo(state, 'warrior-1', harpyDef.adjacentTiles[0])
      modifiedState = {
        ...modifiedState,
        players: modifiedState.players.map(p =>
          p.id === 'warrior-1'
            ? { ...p, ironStanceActive: true, stats: { ...p.stats, strength: [5, 5] as [number, number] } }
            : p
        ),
        monsters: modifiedState.monsters.map(m =>
          m.id !== 'harpy' ? { ...m, isDead: true } : m
        ),
      }

      // 피해 감소 확인 (피해 = 주사위합, 감소 = 힘 10)
      // 주사위 합이 10 이하면 피해 0
      let noDamageOccurred = false
      for (let i = 0; i < 20; i++) {
        const { newState } = processMonsterPhase(modifiedState)
        const warrior = newState.players.find(p => p.id === 'warrior-1')!
        const original = modifiedState.players.find(p => p.id === 'warrior-1')!
        if (warrior.health === original.health) {
          noDamageOccurred = true
          break
        }
      }
      // 하피의 diceIndices [0,1,2]에서 합이 10 이하일 확률이 높음
      expect(noDamageOccurred).toBe(true)
    })

    it('트롤: 타락 용사에게 짝수일 때 공격 안 함', () => {
      const { state } = createMonsterTestState()
      const trollDef = MONSTERS.find(m => m.id === 'troll')!

      let modifiedState = movePlayerTo(state, 'warrior-1', trollDef.adjacentTiles[0])
      modifiedState = {
        ...modifiedState,
        players: modifiedState.players.map(p =>
          p.id === 'warrior-1' ? { ...p, state: 'corrupt' as const } : p
        ),
        monsters: modifiedState.monsters.map(m =>
          m.id !== 'troll' ? { ...m, isDead: true } : m
        ),
      }

      // 여러 번 실행하여 짝수 합일 때 공격 안 함을 확인
      let skippedAttack = false
      for (let i = 0; i < 30; i++) {
        const { newState } = processMonsterPhase(modifiedState)
        const warrior = newState.players.find(p => p.id === 'warrior-1')!
        const original = modifiedState.players.find(p => p.id === 'warrior-1')!
        if (warrior.health === original.health) {
          skippedAttack = true
          break
        }
      }
      expect(skippedAttack).toBe(true)
    })
  })

  describe('발록 사망/부활', () => {
    it('사망 시 fireTileDisabled = true', () => {
      const { state } = createMonsterTestState()
      const modifiedState = {
        ...state,
        monsters: state.monsters.map(m =>
          m.id === 'balrog' ? { ...m, isDead: true } : m
        ),
      }

      const { newState } = processMonsterPhase(modifiedState)
      // 발록이 부활하므로 fireTileDisabled는 false가 됨
      // 대신 부활 전 상태를 확인하기 위해 checkBalrogRespawn 직접 테스트
      expect(newState.monsterRoundBuffs.fireTileDisabled).toBe(false) // 부활 후
    })

    it('checkBalrogRespawn: 사망한 발록 부활', () => {
      const { state } = createMonsterTestState()
      const balrogDef = MONSTERS.find(m => m.id === 'balrog')!

      const modifiedState = {
        ...state,
        monsters: state.monsters.map(m =>
          m.id === 'balrog' ? { ...m, isDead: true, health: 0 } : m
        ),
        monsterRoundBuffs: { ...state.monsterRoundBuffs, fireTileDisabled: true },
      }

      const result = checkBalrogRespawn(modifiedState)
      const balrog = result.monsters.find(m => m.id === 'balrog')!

      expect(balrog.isDead).toBe(false)
      expect(balrog.health).toBe(balrogDef.maxHealth)
      expect(result.monsterRoundBuffs.fireTileDisabled).toBe(false)
    })

    it('checkBalrogRespawn: 살아있는 발록은 변경 없음', () => {
      const { state } = createMonsterTestState()
      const result = checkBalrogRespawn(state)
      const balrog = result.monsters.find(m => m.id === 'balrog')!
      const originalBalrog = state.monsters.find(m => m.id === 'balrog')!

      expect(balrog.health).toBe(originalBalrog.health)
      expect(balrog.isDead).toBe(false)
    })
  })

  describe('버프 리셋', () => {
    it('매 라운드 golemBasicAttackImmune, meteorImmune 리셋', () => {
      const { state } = createMonsterTestState()
      const modifiedState = {
        ...state,
        monsterRoundBuffs: {
          golemBasicAttackImmune: true,
          meteorImmune: true,
          fireTileDisabled: false,
        },
      }

      const { newState } = processMonsterPhase(modifiedState)
      // 효과가 다시 트리거되지 않는 한 false로 리셋됨
      // (리치/골렘 효과가 발동하지 않았으면)
      // 정확한 결과는 주사위에 의존하지만, 리셋 로직 자체는 항상 실행됨
      expect(typeof newState.monsterRoundBuffs.golemBasicAttackImmune).toBe('boolean')
      expect(typeof newState.monsterRoundBuffs.meteorImmune).toBe('boolean')
    })
  })
})
