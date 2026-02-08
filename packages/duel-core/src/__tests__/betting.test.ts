import { describe, it, expect } from 'vitest'
import { createTestGame, startRoundWithCards, skipAbilityPhase } from './test-helpers'

describe('Betting', () => {
  function setupBetting() {
    const { engine, state, shuffler } = createTestGame()
    let s = startRoundWithCards(engine, state, shuffler, 7, 3)
    s = skipAbilityPhase(engine, s)
    expect(s.phase).toBe('betting')
    return { engine, state: s }
  }

  describe('RAISE', () => {
    it('레이즈하면 상대 차례', () => {
      const { engine, state } = setupBetting()
      const firstPlayer = state.players[state.currentPlayerIndex]

      const result = engine.executeAction(state, { type: 'RAISE', amount: 3 })
      expect(result.success).toBe(true)
      expect(result.newState.currentPlayerIndex).toBe(1 - state.currentPlayerIndex)
      expect(result.newState.pot).toBe(state.pot + 3)

      const raiser = result.newState.players.find(p => p.id === firstPlayer.id)!
      expect(raiser.chips).toBe(firstPlayer.chips - 3)
    })

    it('칩 부족하면 실패', () => {
      const { engine, state } = setupBetting()
      const result = engine.executeAction(state, { type: 'RAISE', amount: 100 })
      expect(result.success).toBe(false)
    })

    it('0칩 이하 레이즈 불가', () => {
      const { engine, state } = setupBetting()
      const result = engine.executeAction(state, { type: 'RAISE', amount: 0 })
      expect(result.success).toBe(false)
    })
  })

  describe('CALL', () => {
    it('체크 (동일 베팅) 시 쇼다운 진행', () => {
      const { engine, state } = setupBetting()

      // 선 플레이어 체크
      const result = engine.executeAction(state, { type: 'CALL' })
      expect(result.success).toBe(true)
      // 체크 = 콜 → 쇼다운 → round_end
      expect(result.newState.phase).toBe('round_end')
    })

    it('레이즈 후 콜하면 쇼다운', () => {
      const { engine, state } = setupBetting()

      // 선 플레이어 레이즈
      const r1 = engine.executeAction(state, { type: 'RAISE', amount: 5 })
      expect(r1.success).toBe(true)

      // 상대 콜
      const r2 = engine.executeAction(r1.newState, { type: 'CALL' })
      expect(r2.success).toBe(true)
      expect(r2.newState.phase).toBe('round_end')
    })
  })

  describe('FOLD', () => {
    it('폴드하면 상대가 팟 획득', () => {
      const { engine, state } = setupBetting()
      const currentIdx = state.currentPlayerIndex
      const opponentIdx = 1 - currentIdx
      const opponentBefore = state.players[opponentIdx].chips
      const potBefore = state.pot

      const result = engine.executeAction(state, { type: 'FOLD' })
      expect(result.success).toBe(true)
      expect(result.newState.phase).toBe('round_end')

      const opponentAfter = result.newState.players[opponentIdx].chips
      expect(opponentAfter).toBe(opponentBefore + potBefore)
    })

    it('레이즈 후 폴드', () => {
      const { engine, state } = setupBetting()

      // 레이즈
      const r1 = engine.executeAction(state, { type: 'RAISE', amount: 5 })
      const pot = r1.newState.pot
      const opponentIdx = 1 - r1.newState.currentPlayerIndex
      const opponentBefore = r1.newState.players[opponentIdx].chips

      // 상대 폴드
      const r2 = engine.executeAction(r1.newState, { type: 'FOLD' })
      expect(r2.success).toBe(true)

      const raiser = r2.newState.players[opponentIdx]
      expect(raiser.chips).toBe(opponentBefore + pot)
    })
  })

  describe('올인', () => {
    it('칩 전부 레이즈 (올인)', () => {
      const { engine, state } = setupBetting()
      const player = state.players[state.currentPlayerIndex]
      const allChips = player.chips

      const result = engine.executeAction(state, { type: 'RAISE', amount: allChips })
      expect(result.success).toBe(true)

      const raiser = result.newState.players[state.currentPlayerIndex]
      expect(raiser.chips).toBe(0)
    })
  })
})
