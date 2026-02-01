import { describe, it, expect } from 'vitest'
import {
  TERRAIN_MOVEMENT_COST,
  WARRIOR_SKILLS,
  ROGUE_SKILLS,
  MAGE_SKILLS,
  ALL_SKILLS,
  SKILLS_BY_CLASS,
  REVELATIONS,
  HEALTH_BY_CLASS_AND_LEVEL,
  getMaxHealthByLevel,
  MONSTERS,
  GAME_BOARD,
  STARTING_POSITIONS,
} from '../constants'

describe('constants', () => {
  describe('TERRAIN_MOVEMENT_COST', () => {
    it('모든 지형 타입에 대해 비용이 정의되어 있다', () => {
      expect(TERRAIN_MOVEMENT_COST.plain).toBe(3)
      expect(TERRAIN_MOVEMENT_COST.village).toBe(3)
      expect(TERRAIN_MOVEMENT_COST.swamp).toBe(5)
      expect(TERRAIN_MOVEMENT_COST.mountain).toBe('blocked')
      expect(TERRAIN_MOVEMENT_COST.lake).toBe('blocked')
      expect(TERRAIN_MOVEMENT_COST.hill).toBe('all')
    })
  })

  describe('SKILLS', () => {
    it('전사 스킬이 5개 정의되어 있다', () => {
      expect(WARRIOR_SKILLS).toHaveLength(5)
      expect(WARRIOR_SKILLS.every(s => s.heroClass === 'warrior')).toBe(true)
    })

    it('도적 스킬이 5개 정의되어 있다', () => {
      expect(ROGUE_SKILLS).toHaveLength(5)
      expect(ROGUE_SKILLS.every(s => s.heroClass === 'rogue')).toBe(true)
    })

    it('법사 스킬이 5개 정의되어 있다', () => {
      expect(MAGE_SKILLS).toHaveLength(5)
      expect(MAGE_SKILLS.every(s => s.heroClass === 'mage')).toBe(true)
    })

    it('ALL_SKILLS에 모든 스킬이 포함되어 있다', () => {
      expect(ALL_SKILLS).toHaveLength(15)
    })

    it('SKILLS_BY_CLASS가 올바르게 정의되어 있다', () => {
      expect(SKILLS_BY_CLASS.warrior).toBe(WARRIOR_SKILLS)
      expect(SKILLS_BY_CLASS.rogue).toBe(ROGUE_SKILLS)
      expect(SKILLS_BY_CLASS.mage).toBe(MAGE_SKILLS)
    })

    it('모든 스킬에 필수 필드가 있다', () => {
      for (const skill of ALL_SKILLS) {
        expect(skill.id).toBeTruthy()
        expect(skill.name).toBeTruthy()
        expect(skill.description).toBeTruthy()
        expect(typeof skill.cost).toBe('number')
        expect(typeof skill.cooldown).toBe('number')
        expect(['warrior', 'rogue', 'mage']).toContain(skill.heroClass)
      }
    })
  })

  describe('REVELATIONS', () => {
    it('계시 카드가 정의되어 있다', () => {
      expect(REVELATIONS.length).toBeGreaterThan(0)
    })

    it('천사 계시와 마왕 계시가 모두 포함되어 있다', () => {
      const angelRevelations = REVELATIONS.filter(r => r.source === 'angel')
      const demonRevelations = REVELATIONS.filter(r => r.source === 'demon')

      expect(angelRevelations.length).toBeGreaterThan(0)
      expect(demonRevelations.length).toBeGreaterThan(0)
    })

    it('게임 종료 계시가 포함되어 있다', () => {
      const gameEndRevelations = REVELATIONS.filter(r => r.isGameEnd)
      expect(gameEndRevelations.length).toBeGreaterThan(0)
    })

    it('모든 계시에 필수 필드가 있다', () => {
      for (const revelation of REVELATIONS) {
        expect(revelation.id).toBeTruthy()
        expect(revelation.name).toBeTruthy()
        expect(['angel', 'demon']).toContain(revelation.source)
        expect(revelation.task).toBeTruthy()
        expect(revelation.reward).toBeDefined()
        expect(typeof revelation.isGameEnd).toBe('boolean')
      }
    })
  })

  describe('getMaxHealthByLevel', () => {
    it('법사의 레벨별 최대 체력을 반환한다', () => {
      expect(getMaxHealthByLevel('mage', 2)).toBe(20)
      expect(getMaxHealthByLevel('mage', 5)).toBe(20)
      expect(getMaxHealthByLevel('mage', 8)).toBe(30)
      expect(getMaxHealthByLevel('mage', 11)).toBe(40)
      expect(getMaxHealthByLevel('mage', 12)).toBe(50)
    })

    it('도적의 레벨별 최대 체력을 반환한다', () => {
      expect(getMaxHealthByLevel('rogue', 2)).toBe(20)
      expect(getMaxHealthByLevel('rogue', 5)).toBe(30)
      expect(getMaxHealthByLevel('rogue', 8)).toBe(40)
      expect(getMaxHealthByLevel('rogue', 11)).toBe(50)
    })

    it('전사의 레벨별 최대 체력을 반환한다', () => {
      expect(getMaxHealthByLevel('warrior', 2)).toBe(30)
      expect(getMaxHealthByLevel('warrior', 5)).toBe(30)
      expect(getMaxHealthByLevel('warrior', 8)).toBe(40)
      expect(getMaxHealthByLevel('warrior', 11)).toBe(50)
    })

    it('레벨 범위를 벗어나면 클램핑된다', () => {
      expect(getMaxHealthByLevel('warrior', 1)).toBe(30) // 최소 2로 클램핑
      expect(getMaxHealthByLevel('warrior', 15)).toBe(50) // 최대 12로 클램핑
    })
  })

  describe('MONSTERS', () => {
    it('7개의 몬스터가 정의되어 있다', () => {
      expect(MONSTERS).toHaveLength(7)
    })

    it('모든 몬스터에 필수 필드가 있다', () => {
      for (const monster of MONSTERS) {
        expect(monster.id).toBeTruthy()
        expect(monster.name).toBeTruthy()
        expect(monster.nameKo).toBeTruthy()
        expect(monster.position).toBeDefined()
        expect(monster.maxHealth).toBeGreaterThan(0)
        expect(monster.diceIndices.length).toBeGreaterThanOrEqual(2)
        expect(monster.diceIndices.length).toBeLessThanOrEqual(6)
        expect(monster.drops).toBeDefined()
      }
    })

    it('발록이 가장 강력하다', () => {
      const balrog = MONSTERS.find(m => m.id === 'balrog')
      expect(balrog?.maxHealth).toBe(60)
      expect(balrog?.diceIndices).toHaveLength(6)
    })
  })

  describe('GAME_BOARD', () => {
    it('보드 타일이 정의되어 있다', () => {
      expect(GAME_BOARD.length).toBeGreaterThan(0)
    })

    it('신전이 중앙(0,0)에 있다', () => {
      const temple = GAME_BOARD.find(t => t.type === 'temple')
      expect(temple?.coord).toEqual({ q: 0, r: 0 })
    })

    it('마왕성이 있다', () => {
      const castle = GAME_BOARD.find(t => t.type === 'castle')
      expect(castle).toBeDefined()
    })

    it('모든 직업의 마을이 있다', () => {
      const villages = GAME_BOARD.filter(t => t.type === 'village')
      const villageClasses = villages.map(v => v.villageClass)

      expect(villageClasses).toContain('warrior')
      expect(villageClasses).toContain('rogue')
      expect(villageClasses).toContain('mage')
    })
  })

  describe('STARTING_POSITIONS', () => {
    it('모든 직업에 시작 위치가 정의되어 있다', () => {
      expect(STARTING_POSITIONS.warrior.length).toBeGreaterThan(0)
      expect(STARTING_POSITIONS.rogue.length).toBeGreaterThan(0)
      expect(STARTING_POSITIONS.mage.length).toBeGreaterThan(0)
    })
  })
})
