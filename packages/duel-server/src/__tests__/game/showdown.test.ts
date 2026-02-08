import { describe, it, expect } from 'vitest'
import { createTestGame, startRoundWithCards, skipAbilityPhase } from './test-helpers'

describe('Showdown', () => {
  function playToShowdown(card1: number, card2: number) {
    const { engine, state, shuffler } = createTestGame()
    let s = startRoundWithCards(engine, state, shuffler, card1 as any, card2 as any)
    s = skipAbilityPhase(engine, s)

    // 체크 → 쇼다운
    const result = engine.executeAction(s, { type: 'CALL' })
    return { result, engine }
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

  it('동점이면 팟 반반 나눔', () => {
    const { result } = playToShowdown(5, 5)
    const history = result.newState.roundHistory[0]
    expect(history.winner).toBeNull()

    // 각자 칩이 동일하게 돌아옴
    const p0 = result.newState.players[0]
    const p1 = result.newState.players[1]
    expect(p0.chips).toBe(p1.chips)
  })

  it('승자가 팟 전체를 가져감', () => {
    const { engine, state, shuffler } = createTestGame()
    let s = startRoundWithCards(engine, state, shuffler, 10, 1)
    s = skipAbilityPhase(engine, s)

    const potBefore = s.pot
    const p0Before = s.players[0].chips

    const result = engine.executeAction(s, { type: 'CALL' })
    // player-1(10) > player-2(1)
    const p0After = result.newState.players[0].chips
    expect(p0After).toBe(p0Before + potBefore)
  })
})
