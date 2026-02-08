import { describe, it, expect } from 'vitest'
import { createTestGame, startRoundWithCards } from './test-helpers'

describe('Abilities', () => {
  describe('SWAP', () => {
    it('카드 교체하면 새 카드 받음', () => {
      const { engine, state, shuffler } = createTestGame()
      const s = startRoundWithCards(engine, state, shuffler, 7, 3)

      const oldCard = s.players[s.currentPlayerIndex].card
      const result = engine.executeAction(s, { type: 'SWAP' })
      expect(result.success).toBe(true)

      const newCard = result.newState.players[s.currentPlayerIndex].card
      expect(result.newState.players[s.currentPlayerIndex].swapCount).toBe(2) // 3 → 2

      // 이전 카드가 discardPile에 들어감
      expect(result.newState.discardPile).toContain(oldCard)
      // 새 카드는 덱에서 나옴
      expect(result.newState.deck.length).toBe(s.deck.length - 1)
      expect(newCard).not.toBeNull()
    })

    it('교체 횟수 0이면 실패', () => {
      const { engine, state, shuffler } = createTestGame()

      const modified = {
        ...state,
        players: [
          { ...state.players[0], swapCount: 0 },
          state.players[1],
        ] as typeof state.players,
      }

      const s = startRoundWithCards(engine, modified, shuffler, 7, 3)
      const result = engine.executeAction(s, { type: 'SWAP' })
      expect(result.success).toBe(false)
    })
  })

  describe('SKIP_ABILITY', () => {
    it('양쪽 모두 건너뛰면 betting으로 전환', () => {
      const { engine, state, shuffler } = createTestGame()
      const s = startRoundWithCards(engine, state, shuffler, 7, 3)

      const r1 = engine.executeAction(s, { type: 'SKIP_ABILITY' })
      expect(r1.success).toBe(true)
      expect(r1.newState.phase).toBe('ability') // 상대 아직 안 함

      const r2 = engine.executeAction(r1.newState, { type: 'SKIP_ABILITY' })
      expect(r2.success).toBe(true)
      expect(r2.newState.phase).toBe('betting') // 둘 다 완료
    })

    it('한쪽 swap 후 다른쪽 skip → betting', () => {
      const { engine, state, shuffler } = createTestGame()
      const s = startRoundWithCards(engine, state, shuffler, 7, 3)

      const r1 = engine.executeAction(s, { type: 'SWAP' })
      expect(r1.success).toBe(true)

      const r2 = engine.executeAction(r1.newState, { type: 'SKIP_ABILITY' })
      expect(r2.success).toBe(true)
      expect(r2.newState.phase).toBe('betting')
    })
  })
})
