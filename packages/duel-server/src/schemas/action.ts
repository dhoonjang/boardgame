import { z } from 'zod'

export const GameActionSchema = z.discriminatedUnion('type', [
  z.object({ type: z.literal('START_ROUND') }),
  z.object({ type: z.literal('PEEK') }),
  z.object({ type: z.literal('SWAP') }),
  z.object({ type: z.literal('SKIP_ABILITY') }),
  z.object({ type: z.literal('RAISE'), amount: z.number().int().min(1) }),
  z.object({ type: z.literal('CALL') }),
  z.object({ type: z.literal('FOLD') }),
])

export const PlayerInitSchema = z.object({
  id: z.string().min(1),
  name: z.string().min(1),
})

export type GameActionInput = z.infer<typeof GameActionSchema>
export type PlayerInitInput = z.infer<typeof PlayerInitSchema>
