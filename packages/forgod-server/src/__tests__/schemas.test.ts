import { describe, it, expect } from 'vitest'
import {
  CreateGameSchema,
  GameActionSchema,
  PlayerInitSchema,
} from '../schemas/action'

describe('Zod Schemas', () => {
  describe('PlayerInitSchema', () => {
    it('유효한 플레이어 정보를 검증한다', () => {
      const validPlayer = {
        id: 'p1',
        name: 'Player 1',
        heroClass: 'warrior',
      }

      const result = PlayerInitSchema.safeParse(validPlayer)
      expect(result.success).toBe(true)
    })

    it('잘못된 heroClass는 실패', () => {
      const invalidPlayer = {
        id: 'p1',
        name: 'Player 1',
        heroClass: 'invalid',
      }

      const result = PlayerInitSchema.safeParse(invalidPlayer)
      expect(result.success).toBe(false)
    })

    it('필수 필드가 없으면 실패', () => {
      const missingId = { name: 'Player 1', heroClass: 'warrior' }
      const missingName = { id: 'p1', heroClass: 'warrior' }
      const missingClass = { id: 'p1', name: 'Player 1' }

      expect(PlayerInitSchema.safeParse(missingId).success).toBe(false)
      expect(PlayerInitSchema.safeParse(missingName).success).toBe(false)
      expect(PlayerInitSchema.safeParse(missingClass).success).toBe(false)
    })
  })

  describe('CreateGameSchema', () => {
    it('유효한 플레이어 배열(3명)을 검증한다', () => {
      const valid = {
        players: [
          { id: 'p1', name: 'Player 1', heroClass: 'warrior' },
          { id: 'p2', name: 'Player 2', heroClass: 'rogue' },
          { id: 'p3', name: 'Player 3', heroClass: 'mage' },
        ],
      }

      const result = CreateGameSchema.safeParse(valid)
      expect(result.success).toBe(true)
    })

    it('6명도 유효하다', () => {
      const valid = {
        players: [
          { id: 'p1', name: 'Player 1', heroClass: 'warrior' },
          { id: 'p2', name: 'Player 2', heroClass: 'rogue' },
          { id: 'p3', name: 'Player 3', heroClass: 'mage' },
          { id: 'p4', name: 'Player 4', heroClass: 'warrior' },
          { id: 'p5', name: 'Player 5', heroClass: 'rogue' },
          { id: 'p6', name: 'Player 6', heroClass: 'mage' },
        ],
      }

      const result = CreateGameSchema.safeParse(valid)
      expect(result.success).toBe(true)
    })

    it('3명 미만이면 실패', () => {
      const twoPlayers = {
        players: [
          { id: 'p1', name: 'Player 1', heroClass: 'warrior' },
          { id: 'p2', name: 'Player 2', heroClass: 'rogue' },
        ],
      }

      const result = CreateGameSchema.safeParse(twoPlayers)
      expect(result.success).toBe(false)
    })

    it('6명 초과면 실패', () => {
      const sevenPlayers = {
        players: Array.from({ length: 7 }, (_, i) => ({
          id: `p${i + 1}`,
          name: `Player ${i + 1}`,
          heroClass: 'warrior',
        })),
      }

      const result = CreateGameSchema.safeParse(sevenPlayers)
      expect(result.success).toBe(false)
    })
  })

  describe('GameActionSchema', () => {
    it('ROLL_MOVE_DICE 액션을 검증한다', () => {
      const action = { type: 'ROLL_MOVE_DICE' }
      const result = GameActionSchema.safeParse(action)
      expect(result.success).toBe(true)
    })

    it('MOVE 액션을 검증한다', () => {
      const action = { type: 'MOVE', position: { q: 1, r: 2 } }
      const result = GameActionSchema.safeParse(action)
      expect(result.success).toBe(true)
    })

    it('END_MOVE_PHASE 액션을 검증한다', () => {
      const action = { type: 'END_MOVE_PHASE' }
      const result = GameActionSchema.safeParse(action)
      expect(result.success).toBe(true)
    })

    it('END_TURN 액션을 검증한다', () => {
      const action = { type: 'END_TURN' }
      const result = GameActionSchema.safeParse(action)
      expect(result.success).toBe(true)
    })

    it('BASIC_ATTACK 액션을 검증한다', () => {
      const action = { type: 'BASIC_ATTACK', targetId: 'monster1' }
      const result = GameActionSchema.safeParse(action)
      expect(result.success).toBe(true)
    })

    it('USE_SKILL 액션을 검증한다 (기본)', () => {
      const action = { type: 'USE_SKILL', skillId: 'charge' }
      const result = GameActionSchema.safeParse(action)
      expect(result.success).toBe(true)
    })

    it('USE_SKILL 액션을 검증한다 (targetId 포함)', () => {
      const action = { type: 'USE_SKILL', skillId: 'charge', targetId: 'p2' }
      const result = GameActionSchema.safeParse(action)
      expect(result.success).toBe(true)
    })

    it('USE_SKILL 액션을 검증한다 (position 포함)', () => {
      const action = { type: 'USE_SKILL', skillId: 'meteor', position: { q: 0, r: 0 } }
      const result = GameActionSchema.safeParse(action)
      expect(result.success).toBe(true)
    })

    it('ROLL_STAT_DICE 액션을 검증한다', () => {
      const strengthAction = { type: 'ROLL_STAT_DICE', stat: 'strength' }
      const dexAction = { type: 'ROLL_STAT_DICE', stat: 'dexterity' }
      const intAction = { type: 'ROLL_STAT_DICE', stat: 'intelligence' }

      expect(GameActionSchema.safeParse(strengthAction).success).toBe(true)
      expect(GameActionSchema.safeParse(dexAction).success).toBe(true)
      expect(GameActionSchema.safeParse(intAction).success).toBe(true)
    })

    it('COMPLETE_REVELATION 액션을 검증한다', () => {
      const action = { type: 'COMPLETE_REVELATION', revelationId: 'rev1' }
      const result = GameActionSchema.safeParse(action)
      expect(result.success).toBe(true)
    })

    it('APPLY_CORRUPT_DICE 액션을 검증한다', () => {
      const action = { type: 'APPLY_CORRUPT_DICE', stat: 'strength' }
      const result = GameActionSchema.safeParse(action)
      expect(result.success).toBe(true)
    })

    it('CHOOSE_HOLY 액션을 검증한다', () => {
      const action = { type: 'CHOOSE_HOLY' }
      const result = GameActionSchema.safeParse(action)
      expect(result.success).toBe(true)
    })

    it('DRAW_DEMON_SWORD 액션을 검증한다', () => {
      const action = { type: 'DRAW_DEMON_SWORD' }
      const result = GameActionSchema.safeParse(action)
      expect(result.success).toBe(true)
    })

    it('알 수 없는 액션 타입은 실패', () => {
      const action = { type: 'UNKNOWN_ACTION' }
      const result = GameActionSchema.safeParse(action)
      expect(result.success).toBe(false)
    })

    it('필수 필드가 없으면 실패', () => {
      const missingTargetId = { type: 'BASIC_ATTACK' }
      const missingStat = { type: 'ROLL_STAT_DICE' }
      const missingPosition = { type: 'MOVE' }

      expect(GameActionSchema.safeParse(missingTargetId).success).toBe(false)
      expect(GameActionSchema.safeParse(missingStat).success).toBe(false)
      expect(GameActionSchema.safeParse(missingPosition).success).toBe(false)
    })
  })
})
