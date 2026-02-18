import { describe, it, expect } from 'vitest'
import { GameActionSchema } from '../schemas/action'

describe('GameActionSchema', () => {
  it('START_ROUND 검증', () => {
    const result = GameActionSchema.safeParse({ type: 'START_ROUND' })
    expect(result.success).toBe(true)
  })

  it('SWAP은 더 이상 유효하지 않음', () => {
    const result = GameActionSchema.safeParse({ type: 'SWAP' })
    expect(result.success).toBe(false)
  })

  it('SKIP_ABILITY은 더 이상 유효하지 않음', () => {
    const result = GameActionSchema.safeParse({ type: 'SKIP_ABILITY' })
    expect(result.success).toBe(false)
  })

  it('RAISE 검증 (유효)', () => {
    const result = GameActionSchema.safeParse({ type: 'RAISE', amount: 5 })
    expect(result.success).toBe(true)
  })

  it('RAISE 검증 (0 이하 실패)', () => {
    const result = GameActionSchema.safeParse({ type: 'RAISE', amount: 0 })
    expect(result.success).toBe(false)
  })

  it('RAISE 검증 (amount 누락 실패)', () => {
    const result = GameActionSchema.safeParse({ type: 'RAISE' })
    expect(result.success).toBe(false)
  })

  it('CALL 검증', () => {
    const result = GameActionSchema.safeParse({ type: 'CALL' })
    expect(result.success).toBe(true)
  })

  it('FOLD 검증', () => {
    const result = GameActionSchema.safeParse({ type: 'FOLD' })
    expect(result.success).toBe(true)
  })

  it('알 수 없는 타입 실패', () => {
    const result = GameActionSchema.safeParse({ type: 'UNKNOWN' })
    expect(result.success).toBe(false)
  })
})
