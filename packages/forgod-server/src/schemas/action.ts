import { z } from 'zod'

// 좌표 스키마
export const HexCoordSchema = z.object({
  q: z.number(),
  r: z.number(),
})

// 플레이어 초기화 스키마
export const PlayerInitSchema = z.object({
  id: z.string(),
  name: z.string(),
  heroClass: z.enum(['warrior', 'rogue', 'mage']),
})

// 게임 생성 스키마
export const CreateGameSchema = z.object({
  players: z.array(PlayerInitSchema).min(3).max(6),
})

// 능력치 스키마
export const StatSchema = z.enum(['strength', 'dexterity', 'intelligence'])

// 게임 액션 스키마 (discriminated union)
export const GameActionSchema = z.discriminatedUnion('type', [
  // 1. 이동 주사위 굴리기
  z.object({ type: z.literal('ROLL_MOVE_DICE') }),

  // 2. 이동
  z.object({
    type: z.literal('MOVE'),
    position: HexCoordSchema,
  }),

  // 3. 이동 페이즈 종료
  z.object({ type: z.literal('END_MOVE_PHASE') }),

  // 4. 턴 종료
  z.object({ type: z.literal('END_TURN') }),

  // 5. 기본 공격
  z.object({
    type: z.literal('BASIC_ATTACK'),
    targetId: z.string(),
  }),

  // 6. 스킬 사용
  z.object({
    type: z.literal('USE_SKILL'),
    skillId: z.string(),
    targetId: z.string().optional(),
    position: HexCoordSchema.optional(),
  }),

  // 7. 능력치 주사위 굴리기
  z.object({
    type: z.literal('ROLL_STAT_DICE'),
    stat: StatSchema,
  }),

  // 8. 계시 완료
  z.object({
    type: z.literal('COMPLETE_REVELATION'),
    revelationId: z.string(),
  }),

  // 9. 타락 주사위 적용
  z.object({
    type: z.literal('APPLY_CORRUPT_DICE'),
    stat: StatSchema,
  }),

  // 10. 신성 선택 (부활 시)
  z.object({ type: z.literal('CHOOSE_HOLY') }),

  // 11. 마검 뽑기
  z.object({ type: z.literal('DRAW_DEMON_SWORD') }),
])

// 타입 추론
export type CreateGameInput = z.infer<typeof CreateGameSchema>
export type GameActionInput = z.infer<typeof GameActionSchema>
export type PlayerInitInput = z.infer<typeof PlayerInitSchema>
