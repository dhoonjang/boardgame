import { describe, it, expect } from 'vitest'
import { createTestGame, startRoundWithCards } from './test-helpers'
import { FOLD_TEN_PENALTY, INITIAL_CHIPS, ANTE_AMOUNT } from '../../game'

describe('Betting', () => {
  function setupBetting() {
    const { engine, state, shuffler } = createTestGame()
    const s = startRoundWithCards(engine, state, shuffler, 7, 3)
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

    it('10 카드 폴드 시 패널티 5칩 적용', () => {
      const { engine, state, shuffler } = createTestGame()
      // player-1 카드 10, player-2 카드 3
      const s = startRoundWithCards(engine, state, shuffler, 10, 3)

      const currentIdx = s.currentPlayerIndex
      const opponentIdx = 1 - currentIdx
      const folderBefore = s.players[currentIdx].chips
      const opponentBefore = s.players[opponentIdx].chips
      const potBefore = s.pot

      // 선 플레이어(카드 10) 폴드
      const result = engine.executeAction(s, { type: 'FOLD' })
      expect(result.success).toBe(true)

      // 폴드한 플레이어: 패널티 5칩 추가 차감
      const folderAfter = result.newState.players[currentIdx].chips
      expect(folderAfter).toBe(folderBefore - FOLD_TEN_PENALTY)

      // 상대: 팟 + 패널티 획득
      const opponentAfter = result.newState.players[opponentIdx].chips
      expect(opponentAfter).toBe(opponentBefore + potBefore + FOLD_TEN_PENALTY)

      // roundResult에 penalty 기록
      const roundResult = result.newState.roundHistory[result.newState.roundHistory.length - 1]
      expect(roundResult.penalty).toBe(FOLD_TEN_PENALTY)
    })

    it('10이 아닌 카드 폴드 시 패널티 없음', () => {
      const { engine, state, shuffler } = createTestGame()
      // player-1 카드 9, player-2 카드 3
      const s = startRoundWithCards(engine, state, shuffler, 9, 3)

      const currentIdx = s.currentPlayerIndex
      const opponentIdx = 1 - currentIdx
      const folderBefore = s.players[currentIdx].chips
      const opponentBefore = s.players[opponentIdx].chips
      const potBefore = s.pot

      const result = engine.executeAction(s, { type: 'FOLD' })
      expect(result.success).toBe(true)

      // 패널티 없음
      const folderAfter = result.newState.players[currentIdx].chips
      expect(folderAfter).toBe(folderBefore)

      const opponentAfter = result.newState.players[opponentIdx].chips
      expect(opponentAfter).toBe(opponentBefore + potBefore)

      const roundResult = result.newState.roundHistory[result.newState.roundHistory.length - 1]
      expect(roundResult.penalty).toBeUndefined()
    })

    it('칩 부족 시 패널티가 보유 칩만큼만 적용', () => {
      const { engine, state, shuffler } = createTestGame()
      // 칩을 적게 설정 (앤티 1칩 후 2칩 남음)
      const lowChipsState = {
        ...state,
        players: [
          { ...state.players[0], chips: 3 },
          { ...state.players[1], chips: INITIAL_CHIPS },
        ] as typeof state.players,
      }

      // player-1 카드 10
      const s = startRoundWithCards(engine, lowChipsState, shuffler, 10, 3)
      const currentIdx = s.currentPlayerIndex
      const opponentIdx = 1 - currentIdx
      const folderChips = s.players[currentIdx].chips // 3 - 1(앤티) = 2칩
      const opponentBefore = s.players[opponentIdx].chips

      const result = engine.executeAction(s, { type: 'FOLD' })
      expect(result.success).toBe(true)

      // 패널티는 보유 칩(2칩)만큼만
      const folderAfter = result.newState.players[currentIdx].chips
      expect(folderAfter).toBe(0) // 2 - 2 = 0

      const opponentAfter = result.newState.players[opponentIdx].chips
      expect(opponentAfter).toBe(opponentBefore + s.pot + folderChips)

      const roundResult = result.newState.roundHistory[result.newState.roundHistory.length - 1]
      expect(roundResult.penalty).toBe(folderChips) // 2칩 (5보다 작음)
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
