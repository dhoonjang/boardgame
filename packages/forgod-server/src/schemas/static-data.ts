import { z } from 'zod'

// 스킬 필터링 쿼리 스키마
export const HeroClassQuerySchema = z.object({
  heroClass: z.enum(['warrior', 'rogue', 'mage']).optional(),
})

// 계시 필터링 쿼리 스키마
export const RevelationSourceQuerySchema = z.object({
  source: z.enum(['angel', 'demon']).optional(),
})

// 타입 추론
export type HeroClassQuery = z.infer<typeof HeroClassQuerySchema>
export type RevelationSourceQuery = z.infer<typeof RevelationSourceQuerySchema>
