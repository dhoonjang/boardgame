import { describe, it, expect } from 'vitest'
import { createTestGame, startRoundWithCards } from './test-helpers'
import { INITIAL_CHIPS, ANTE_AMOUNT } from '../../game'

describe('Showdown', () => {
  function playToShowdown(card1: number, card2: number) {
    const { engine, state, shuffler } = createTestGame()
    const s = startRoundWithCards(engine, state, shuffler, card1 as any, card2 as any)

    // 레이즈 1 → 콜 → 쇼다운
    const r1 = engine.executeAction(s, { type: 'RAISE', amount: 1 })
    expect(r1.success).toBe(true)
    const r2 = engine.executeAction(r1.newState, { type: 'CALL' })
    return { result: r2, engine }
  }

  it('높은 카드가 승리', () => {
    const { result } = playToShowdown(8, 3)
    expect(result.success).toBe(true)
    expect(result.newState.phase).toBe('round_end')

    const history = result.newState.roundHistory[0]
    expect(history.winner).toBe('player-1')
  })

  it('낮은 카드가 패배', () => {
    const { result } = playToShowdown(2, 9)
    const history = result.newState.roundHistory[0]
    expect(history.winner).toBe('player-2')
  })

  it('동점이면 팟이 이월됨', () => {
    const { result } = playToShowdown(5, 5)
    const history = result.newState.roundHistory[0]
    expect(history.winner).toBeNull()
    expect(result.newState.pot).toBeGreaterThan(0)

    // 팟을 가져간 승자가 없으므로 앤티/베팅만 빠진 상태
    const p0 = result.newState.players[0]
    const p1 = result.newState.players[1]
    expect(p0.chips).toBe(INITIAL_CHIPS - ANTE_AMOUNT - 1)
    expect(p1.chips).toBe(INITIAL_CHIPS - ANTE_AMOUNT - 1)
  })

  it('승자가 팟 전체를 가져감', () => {
    const { engine, state, shuffler } = createTestGame()
    const s = startRoundWithCards(engine, state, shuffler, 10, 1)

    const potBefore = s.pot
    const p0Before = s.players[0].chips

    const r1 = engine.executeAction(s, { type: 'RAISE', amount: 1 })
    expect(r1.success).toBe(true)
    const result = engine.executeAction(r1.newState, { type: 'CALL' })
    expect(result.success).toBe(true)
    // player-1(10) > player-2(1)
    const p0After = result.newState.players[0].chips
    expect(p0After).toBe(p0Before + potBefore + 1)
  })
})
