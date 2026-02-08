import { describe, it, expect } from 'vitest'
import { canUseSkill, useSkill } from '../engine/skills'
import { GameEngine } from '../engine/game-engine'
import type { GameState, Player, HexCoord } from '../types'
import { ALL_SKILLS } from '../constants'
import { MockDiceRoller } from './test-helpers'

/**
 * 스킬 테스트용 상태 생성 헬퍼
 */
function createSkillTestState(options?: {
  heroClass?: 'warrior' | 'rogue' | 'mage'
  stats?: Partial<Player['stats']>
  playerPosition?: HexCoord
  targetPosition?: HexCoord
  targetOverrides?: Partial<Player>
}): GameState {
  const diceRoller = new MockDiceRoller()
  diceRoller.setDefaultValue(3)
  const engine = new GameEngine({ diceRoller })

  const mainClass = options?.heroClass ?? 'warrior'
  const otherClass = mainClass === 'warrior' ? 'rogue' : 'warrior'

  let state = engine.createGame({
    players: [
      { id: 'player-1', name: 'Player1', heroClass: mainClass },
      { id: 'target-1', name: 'Target', heroClass: otherClass as any },
      { id: 'extra-1', name: 'Extra', heroClass: 'mage' },
    ],
  })

  const pos = options?.playerPosition ?? { q: 0, r: 0 }
  const targetPos = options?.targetPosition ?? { q: 1, r: 0 }

  state = {
    ...state,
    players: state.players.map(p => {
      if (p.id === 'player-1') {
        return {
          ...p,
          position: pos,
          turnPhase: 'action' as const,
          remainingMovement: 0,
          stats: {
            strength: options?.stats?.strength ?? [3, 3] as [number, number],
            dexterity: options?.stats?.dexterity ?? [3, 3] as [number, number],
            intelligence: options?.stats?.intelligence ?? [5, 5] as [number, number],
          },
        }
      }
      if (p.id === 'target-1') {
        return {
          ...p,
          position: targetPos,
          health: 30,
          maxHealth: 30,
          ...(options?.targetOverrides ?? {}),
        }
      }
      return p
    }),
    roundTurnOrder: ['player-1', 'target-1', 'extra-1', 'monster'],
    currentTurnIndex: 0,
  }

  return state
}

describe('스킬 시스템', () => {
  describe('canUseSkill', () => {
    it('존재하지 않는 스킬 불가', () => {
      const state = createSkillTestState()
      const player = state.players[0]
      const result = canUseSkill(state, player, 'nonexistent-skill')
      expect(result.canUse).toBe(false)
      expect(result.reason).toContain('존재하지 않는')
    })

    it('다른 직업 스킬 불가', () => {
      const state = createSkillTestState({ heroClass: 'warrior' })
      const player = state.players.find(p => p.id === 'player-1')!
      const result = canUseSkill(state, player, 'rogue-stealth')
      expect(result.canUse).toBe(false)
      expect(result.reason).toContain('직업')
    })

    it('쿨다운 중 불가', () => {
      let state = createSkillTestState({ heroClass: 'warrior' })
      state = {
        ...state,
        players: state.players.map(p =>
          p.id === 'player-1'
            ? { ...p, skillCooldowns: { 'warrior-charge': 2 } }
            : p
        ),
      }
      const player = state.players.find(p => p.id === 'player-1')!
      const result = canUseSkill(state, player, 'warrior-charge')
      expect(result.canUse).toBe(false)
      expect(result.reason).toContain('재사용 대기')
    })

    it('비용 부족 시 불가', () => {
      const state = createSkillTestState({
        heroClass: 'warrior',
        stats: { intelligence: [1, 1] as [number, number] },
      })
      const player = state.players.find(p => p.id === 'player-1')!
      // warrior-sword-wave costs 3, intelligence is 2
      const result = canUseSkill(state, player, 'warrior-sword-wave')
      expect(result.canUse).toBe(false)
      expect(result.reason).toContain('비용')
    })

    it('몬스터 턴에 불가', () => {
      let state = createSkillTestState()
      state = {
        ...state,
        currentTurnIndex: state.roundTurnOrder.length - 1,
      }
      const result = useSkill(state, 'warrior-charge', 'target-1')
      expect(result.success).toBe(false)
      expect(result.message).toContain('몬스터 턴')
    })
  })

  describe('전사 스킬', () => {
    describe('돌진 (warrior-charge)', () => {
      it('2칸 떨어진 대상에게 돌진', () => {
        const state = createSkillTestState({
          heroClass: 'warrior',
          playerPosition: { q: 0, r: 0 },
          targetPosition: { q: 2, r: 0 },
        })
        const result = useSkill(state, 'warrior-charge', 'target-1')
        expect(result.success).toBe(true)
        expect(result.events.some(e => e.type === 'PLAYER_MOVED')).toBe(true)
      })

      it('1칸 대상은 실패', () => {
        const state = createSkillTestState({
          heroClass: 'warrior',
          playerPosition: { q: 0, r: 0 },
          targetPosition: { q: 1, r: 0 },
        })
        const result = useSkill(state, 'warrior-charge', 'target-1')
        expect(result.success).toBe(false)
        expect(result.message).toContain('2칸')
      })

      it('3칸 대상은 실패', () => {
        const state = createSkillTestState({
          heroClass: 'warrior',
          playerPosition: { q: 0, r: 0 },
          targetPosition: { q: 3, r: 0 },
        })
        const result = useSkill(state, 'warrior-charge', 'target-1')
        expect(result.success).toBe(false)
        expect(result.message).toContain('2칸')
      })

      it('돌진 후 원하는 스킬 쿨 1 감소', () => {
        let state = createSkillTestState({
          heroClass: 'warrior',
          playerPosition: { q: 0, r: 0 },
          targetPosition: { q: 2, r: 0 },
        })
        // 미리 쿨다운 설정
        state = {
          ...state,
          players: state.players.map(p =>
            p.id === 'player-1'
              ? { ...p, skillCooldowns: { 'warrior-power-strike': 3 } }
              : p
          ),
        }
        const result = useSkill(state, 'warrior-charge', 'target-1')
        expect(result.success).toBe(true)
        const player = result.newState.players.find(p => p.id === 'player-1')!
        expect(player.skillCooldowns['warrior-power-strike']).toBe(2)
      })
    })

    describe('일격 필살 (warrior-power-strike)', () => {
      it('인접 대상에게 힘x2 피해', () => {
        const state = createSkillTestState({
          heroClass: 'warrior',
          stats: { strength: [3, 3] as [number, number] },
          playerPosition: { q: 0, r: 0 },
          targetPosition: { q: 1, r: 0 },
        })
        const result = useSkill(state, 'warrior-power-strike', 'target-1')
        expect(result.success).toBe(true)
        const target = result.newState.players.find(p => p.id === 'target-1')!
        expect(target.health).toBe(30 - 12) // 힘 6 * 2 = 12
      })

      it('비인접 실패', () => {
        const state = createSkillTestState({
          heroClass: 'warrior',
          playerPosition: { q: 0, r: 0 },
          targetPosition: { q: 2, r: 0 },
        })
        const result = useSkill(state, 'warrior-power-strike', 'target-1')
        expect(result.success).toBe(false)
        expect(result.message).toContain('인접')
      })
    })

    describe('무적 태세 (warrior-iron-stance)', () => {
      it('ironStanceActive가 true로 설정됨', () => {
        const state = createSkillTestState({ heroClass: 'warrior' })
        const result = useSkill(state, 'warrior-iron-stance')
        expect(result.success).toBe(true)
        const player = result.newState.players.find(p => p.id === 'player-1')!
        expect(player.ironStanceActive).toBe(true)
      })
    })

    describe('검기 발사 (warrior-sword-wave)', () => {
      it('방향 3칸에 힘 피해', () => {
        const state = createSkillTestState({
          heroClass: 'warrior',
          stats: { strength: [3, 3] as [number, number] },
          playerPosition: { q: 0, r: 0 },
          targetPosition: { q: 1, r: 0 },
        })
        const result = useSkill(state, 'warrior-sword-wave', undefined, { q: 1, r: 0 })
        expect(result.success).toBe(true)
        const target = result.newState.players.find(p => p.id === 'target-1')!
        expect(target.health).toBe(30 - 6)
      })
    })
  })

  describe('도적 스킬', () => {
    describe('독 바르기 (rogue-poison)', () => {
      it('poisonActive가 true로 설정됨', () => {
        const state = createSkillTestState({ heroClass: 'rogue' })
        const result = useSkill(state, 'rogue-poison')
        expect(result.success).toBe(true)
        const player = result.newState.players.find(p => p.id === 'player-1')!
        expect(player.poisonActive).toBe(true)
      })
    })

    describe('그림자 함정 (rogue-shadow-trap)', () => {
      it('현재 위치에 함정 설치', () => {
        const state = createSkillTestState({
          heroClass: 'rogue',
          playerPosition: { q: 0, r: 0 },
        })
        const result = useSkill(state, 'rogue-shadow-trap')
        expect(result.success).toBe(true)
        const player = result.newState.players.find(p => p.id === 'player-1')!
        expect(player.traps).toHaveLength(1)
        expect(player.traps[0]).toEqual({ q: 0, r: 0 })
      })

      it('최대 3개 초과 시 가장 오래된 것 제거', () => {
        let state = createSkillTestState({ heroClass: 'rogue' })
        state = {
          ...state,
          players: state.players.map(p =>
            p.id === 'player-1'
              ? { ...p, traps: [{ q: 1, r: 0 }, { q: 2, r: 0 }, { q: 3, r: 0 }] }
              : p
          ),
        }
        const result = useSkill(state, 'rogue-shadow-trap')
        expect(result.success).toBe(true)
        const player = result.newState.players.find(p => p.id === 'player-1')!
        expect(player.traps).toHaveLength(3)
        expect(player.traps[0]).toEqual({ q: 2, r: 0 })
      })
    })

    describe('은신 (rogue-stealth)', () => {
      it('isStealthed가 true로 설정됨', () => {
        const state = createSkillTestState({ heroClass: 'rogue' })
        const result = useSkill(state, 'rogue-stealth')
        expect(result.success).toBe(true)
        const player = result.newState.players.find(p => p.id === 'player-1')!
        expect(player.isStealthed).toBe(true)
      })
    })

    describe('배후 일격 (rogue-backstab)', () => {
      it('대상을 지정하지 않으면 실패', () => {
        const state = createSkillTestState({ heroClass: 'rogue' })
        const result = useSkill(state, 'rogue-backstab')
        expect(result.success).toBe(false)
        expect(result.message).toContain('대상')
      })
    })

    describe('무한의 표창 (rogue-shuriken)', () => {
      it('일직선 첫 대상에 민첩 피해', () => {
        const state = createSkillTestState({
          heroClass: 'rogue',
          stats: { dexterity: [3, 3] as [number, number] },
          playerPosition: { q: 0, r: 0 },
          targetPosition: { q: 1, r: 0 },
        })
        const result = useSkill(state, 'rogue-shuriken', undefined, { q: 1, r: 0 })
        expect(result.success).toBe(true)
        const target = result.newState.players.find(p => p.id === 'target-1')!
        expect(target.health).toBe(30 - 6) // 1칸이므로 민첩 x1
      })

      it('2칸 이상이면 민첩x2 피해', () => {
        const state = createSkillTestState({
          heroClass: 'rogue',
          stats: { dexterity: [3, 3] as [number, number] },
          playerPosition: { q: 0, r: 0 },
          targetPosition: { q: 2, r: 0 },
        })
        const result = useSkill(state, 'rogue-shuriken', undefined, { q: 1, r: 0 })
        expect(result.success).toBe(true)
        const target = result.newState.players.find(p => p.id === 'target-1')!
        expect(target.health).toBe(30 - 12) // 2칸이므로 민첩 x2
      })
    })
  })

  describe('법사 스킬', () => {
    describe('스킬 강화 (mage-enhance)', () => {
      it('isEnhanced가 true로 설정됨', () => {
        const state = createSkillTestState({ heroClass: 'mage' })
        const result = useSkill(state, 'mage-enhance')
        expect(result.success).toBe(true)
        const player = result.newState.players.find(p => p.id === 'player-1')!
        expect(player.isEnhanced).toBe(true)
      })
    })

    describe('마법 화살 (mage-magic-arrow)', () => {
      it('사거리 2 내 대상에 지능 피해', () => {
        const state = createSkillTestState({
          heroClass: 'mage',
          stats: { intelligence: [4, 4] as [number, number] },
          playerPosition: { q: 0, r: 0 },
          targetPosition: { q: 2, r: 0 },
        })
        const result = useSkill(state, 'mage-magic-arrow', 'target-1')
        expect(result.success).toBe(true)
        const target = result.newState.players.find(p => p.id === 'target-1')!
        expect(target.health).toBe(30 - 8)
      })

      it('3칸 이상 실패 (용사 대상)', () => {
        const state = createSkillTestState({
          heroClass: 'mage',
          playerPosition: { q: 0, r: 0 },
          targetPosition: { q: 3, r: 0 },
        })
        const result = useSkill(state, 'mage-magic-arrow', 'target-1')
        expect(result.success).toBe(false)
      })
    })

    describe('분신 (mage-clone)', () => {
      it('현재 위치에 분신 생성', () => {
        const state = createSkillTestState({
          heroClass: 'mage',
          playerPosition: { q: 0, r: 0 },
        })
        const result = useSkill(state, 'mage-clone')
        expect(result.success).toBe(true)
        expect(result.newState.clones).toContainEqual({
          playerId: 'player-1',
          position: { q: 0, r: 0 },
        })
      })
    })

    describe('마력 방출 (mage-burst)', () => {
      it('주변 1칸에 지능 피해', () => {
        const state = createSkillTestState({
          heroClass: 'mage',
          stats: { intelligence: [4, 4] as [number, number] },
          playerPosition: { q: 0, r: 0 },
          targetPosition: { q: 1, r: 0 },
        })
        const result = useSkill(state, 'mage-burst')
        expect(result.success).toBe(true)
        const target = result.newState.players.find(p => p.id === 'target-1')!
        expect(target.health).toBe(30 - 8)
      })
    })

    describe('메테오 (mage-meteor)', () => {
      it('지정 위치에 지능 피해', () => {
        const state = createSkillTestState({
          heroClass: 'mage',
          stats: { intelligence: [4, 4] as [number, number] },
          targetPosition: { q: 5, r: 0 },
        })
        const result = useSkill(state, 'mage-meteor', undefined, { q: 5, r: 0 })
        expect(result.success).toBe(true)
        const target = result.newState.players.find(p => p.id === 'target-1')!
        expect(target.health).toBe(30 - 8)
      })

      it('메테오 면역 시 몬스터에 피해 없음', () => {
        const state = createSkillTestState({
          heroClass: 'mage',
          stats: { intelligence: [4, 4] as [number, number] },
        })
        const harpy = state.monsters.find(m => m.id === 'harpy')!
        const modifiedState = {
          ...state,
          monsterRoundBuffs: { ...state.monsterRoundBuffs, meteorImmune: true },
        }
        const result = useSkill(modifiedState, 'mage-meteor', undefined, harpy.position)
        expect(result.success).toBe(true)
        const harpyAfter = result.newState.monsters.find(m => m.id === 'harpy')!
        expect(harpyAfter.health).toBe(harpy.health)
      })

      it('강화 시 지능x2 피해', () => {
        let state = createSkillTestState({
          heroClass: 'mage',
          stats: { intelligence: [4, 4] as [number, number] },
          targetPosition: { q: 5, r: 0 },
        })
        state = {
          ...state,
          players: state.players.map(p =>
            p.id === 'player-1' ? { ...p, isEnhanced: true } : p
          ),
        }
        const result = useSkill(state, 'mage-meteor', undefined, { q: 5, r: 0 })
        expect(result.success).toBe(true)
        const target = result.newState.players.find(p => p.id === 'target-1')!
        expect(target.health).toBe(30 - 16) // 지능 8 * 2 = 16
        // 강화 소모 확인
        const player = result.newState.players.find(p => p.id === 'player-1')!
        expect(player.isEnhanced).toBe(false)
      })
    })
  })

  describe('스킬 사용 후 상태', () => {
    it('쿨다운 적용', () => {
      const state = createSkillTestState({ heroClass: 'warrior' })
      const result = useSkill(state, 'warrior-iron-stance')
      expect(result.success).toBe(true)
      const player = result.newState.players.find(p => p.id === 'player-1')!
      const skill = ALL_SKILLS.find(s => s.id === 'warrior-iron-stance')!
      expect(player.skillCooldowns['warrior-iron-stance']).toBe(skill.cooldown)
    })

    it('비용 누적', () => {
      const state = createSkillTestState({ heroClass: 'rogue' })
      const result = useSkill(state, 'rogue-poison')
      expect(result.success).toBe(true)
      const player = result.newState.players.find(p => p.id === 'player-1')!
      const skill = ALL_SKILLS.find(s => s.id === 'rogue-poison')!
      expect(player.usedSkillCost).toBe(skill.cost)
    })
  })
})
