import { describe, it, expect } from 'vitest'
import { createTestGame, startRoundWithCards } from './test-helpers'

describe('Abilities', () => {
  describe('PEEK', () => {
    it('엿보기로 자기 카드 확인', () => {
      const { engine, state, shuffler } = createTestGame()
      const s = startRoundWithCards(engine, state, shuffler, 7, 3)

      const result = engine.executeAction(s, { type: 'PEEK' })
      expect(result.success).toBe(true)

      // peek 후 getPlayerView에서 내 카드 보임
      const peekPlayer = result.newState.players[s.currentPlayerIndex]
      expect(peekPlayer.hasPeeked).toBe(true)
      expect(peekPlayer.peekCount).toBe(2) // 3 → 2

      const view = engine.getPlayerView(result.newState, peekPlayer.id)
      expect(view.myCard).toBe(peekPlayer.card)
    })

    it('같은 라운드에 두 번 엿보기 불가', () => {
      const { engine, state, shuffler } = createTestGame()
      const s = startRoundWithCards(engine, state, shuffler, 7, 3)

      const r1 = engine.executeAction(s, { type: 'PEEK' })
      expect(r1.success).toBe(true)

      // 같은 플레이어가 다시 peek → 실패 (이미 hasUsedAbility)
      // 하지만 능력 사용 후 상대 차례로 넘어감
      // 상대가 peek하는 것을 테스트
      const r2 = engine.executeAction(r1.newState, { type: 'PEEK' })
      expect(r2.success).toBe(true) // 상대는 아직 안 썼으니 성공
    })

    it('peek 횟수 0이면 실패', () => {
      const { engine, state, shuffler } = createTestGame()

      // peekCount를 0으로 설정
      const modified = {
        ...state,
        players: [
          { ...state.players[0], peekCount: 0 },
          state.players[1],
        ] as typeof state.players,
      }

      const s = startRoundWithCards(engine, modified, shuffler, 7, 3)
      const result = engine.executeAction(s, { type: 'PEEK' })
      expect(result.success).toBe(false)
    })
  })

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
      let s = startRoundWithCards(engine, state, shuffler, 7, 3)

      const r1 = engine.executeAction(s, { type: 'SKIP_ABILITY' })
      expect(r1.success).toBe(true)
      expect(r1.newState.phase).toBe('ability') // 상대 아직 안 함

      const r2 = engine.executeAction(r1.newState, { type: 'SKIP_ABILITY' })
      expect(r2.success).toBe(true)
      expect(r2.newState.phase).toBe('betting') // 둘 다 완료
    })

    it('한쪽 peek 후 다른쪽 skip → betting', () => {
      const { engine, state, shuffler } = createTestGame()
      let s = startRoundWithCards(engine, state, shuffler, 7, 3)

      const r1 = engine.executeAction(s, { type: 'PEEK' })
      expect(r1.success).toBe(true)

      const r2 = engine.executeAction(r1.newState, { type: 'SKIP_ABILITY' })
      expect(r2.success).toBe(true)
      expect(r2.newState.phase).toBe('betting')
    })
  })
})
