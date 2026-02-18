import { describe, it, expect } from 'vitest'
import { createTestGame, startRoundWithCards } from './test-helpers'
import type { Card } from '../../game'
import { INITIAL_CHIPS, FOLD_TEN_PENALTY } from '../../game'

describe('Full Game', () => {
  /** 선 레이즈 1 → 후 콜로 쇼다운 진행하는 헬퍼 */
  function playShowdown(engine: ReturnType<typeof createTestGame>['engine'], state: any) {
    const r1 = engine.executeAction(state, { type: 'RAISE', amount: 1 })
    if (!r1.success) throw new Error(`레이즈 실패: ${r1.message}`)
    const r2 = engine.executeAction(r1.newState, { type: 'CALL' })
    if (!r2.success) throw new Error(`콜 실패: ${r2.message}`)
    return r2
  }

  it('여러 라운드 진행 (칩 0 전까지 계속)', () => {
    const { engine, state, shuffler } = createTestGame()
    let s = state

    const rounds: [Card, Card][] = [
      [8, 3],  // p1 승
      [2, 9],  // p2 승
      [6, 4],  // p1 승
      [1, 10], // p2 승
      [7, 5],  // p1 승
    ]

    for (const [c1, c2] of rounds) {
      s = startRoundWithCards(engine, s, shuffler, c1, c2)

      // 레이즈 1 → 콜 → 쇼다운
      const result = playShowdown(engine, s)
      s = result.newState

      if (s.phase === 'game_over') break

      // 다음 라운드
      expect(s.phase).toBe('round_end')
    }

    // 5라운드 후에도 칩이 남아있으면 게임 계속
    expect(s.roundHistory).toHaveLength(5)
    expect(s.roundNumber).toBe(5)
    expect(s.phase).toBe('round_end') // 칩이 남아있으므로 종료 아님
  })

  it('칩이 0이면 즉시 게임 종료', () => {
    const { engine, state, shuffler } = createTestGame()

    // 칩을 적게 설정
    const lowChipsState = {
      ...state,
      players: [
        { ...state.players[0], chips: 2 },
        { ...state.players[1], chips: INITIAL_CHIPS },
      ] as typeof state.players,
    }

    let s = startRoundWithCards(engine, lowChipsState, shuffler, 1, 10)

    // p1이 올인 레이즈 (1칩 - ante 후 남은 칩)
    const r1 = engine.executeAction(s, { type: 'RAISE', amount: s.players[s.currentPlayerIndex].chips })
    expect(r1.success).toBe(true)

    // p2 콜
    const r2 = engine.executeAction(r1.newState, { type: 'CALL' })
    expect(r2.success).toBe(true)

    // p2(10) > p1(1) → p2 승 → p1 칩 0 → game_over
    expect(r2.newState.phase).toBe('game_over')
    expect(r2.newState.winner).toBe('player-2')
  })

  it('무승부 라운드 시 칩 변동 없이 게임 계속', () => {
    const { engine, state, shuffler } = createTestGame()
    let s = state

    // 무승부 라운드
    s = startRoundWithCards(engine, s, shuffler, 5, 5)

    // 레이즈 1 → 콜 → 쇼다운
    const result = playShowdown(engine, s)
    s = result.newState

    // 무승부 → 게임 계속
    expect(s.phase).toBe('round_end')
    expect(s.roundHistory[0].winner).toBeNull()

    // 다음 라운드 시작 가능
    s = startRoundWithCards(engine, s, shuffler, 7, 3)
    expect(s.phase).toBe('betting')
  })

  it('선 플레이어가 매 라운드 교체됨', () => {
    const { engine, state, shuffler } = createTestGame()

    // 라운드 1
    let s = startRoundWithCards(engine, state, shuffler, 7, 3)
    const firstRoundFirst = s.firstPlayerIndex

    const r1 = playShowdown(engine, s)
    s = r1.newState

    // 라운드 2
    s = startRoundWithCards(engine, s, shuffler, 7, 3)
    expect(s.firstPlayerIndex).toBe(1 - firstRoundFirst)
  })

  it('레이즈 → 콜 전체 흐름', () => {
    const { engine, state, shuffler } = createTestGame()
    let s = startRoundWithCards(engine, state, shuffler, 9, 2)

    const firstIdx = s.currentPlayerIndex

    // 레이즈 5
    const r1 = engine.executeAction(s, { type: 'RAISE', amount: 5 })
    expect(r1.success).toBe(true)
    expect(r1.newState.currentPlayerIndex).toBe(1 - firstIdx)

    // 상대 콜
    const r2 = engine.executeAction(r1.newState, { type: 'CALL' })
    expect(r2.success).toBe(true)
    expect(r2.newState.phase).toBe('round_end')

    // 9 > 2 → 선 플레이어 승
    const history = r2.newState.roundHistory[0]
    expect(history.winner).toBe(s.players[firstIdx].id)
  })

  it('레이즈 → 레이즈 → 콜', () => {
    const { engine, state, shuffler } = createTestGame()
    let s = startRoundWithCards(engine, state, shuffler, 6, 4)

    // 선: 레이즈 2
    const r1 = engine.executeAction(s, { type: 'RAISE', amount: 2 })
    expect(r1.success).toBe(true)

    // 후: 리레이즈 3
    const r2 = engine.executeAction(r1.newState, { type: 'RAISE', amount: 3 })
    expect(r2.success).toBe(true)

    // 선: 콜
    const r3 = engine.executeAction(r2.newState, { type: 'CALL' })
    expect(r3.success).toBe(true)
    expect(r3.newState.phase).toBe('round_end')
  })

  it('덱이 라운드 간 공유됨 (20장 → 매 라운드 2장 소비)', () => {
    const { engine, state, shuffler } = createTestGame()

    // 라운드 1: 덱이 비어있으므로 새 20장 덱 생성
    let s = startRoundWithCards(engine, state, shuffler, 8, 3)
    expect(s.deck.length).toBe(18) // 20 - 2

    const r1 = playShowdown(engine, s)
    s = r1.newState

    // 라운드 2: 기존 덱에서 소비
    s = startRoundWithCards(engine, s, shuffler, 7, 4)
    expect(s.deck.length).toBe(16) // 18 - 2

    const r2 = playShowdown(engine, s)
    s = r2.newState

    // 라운드 3: 기존 덱에서 소비
    s = startRoundWithCards(engine, s, shuffler, 6, 5)
    expect(s.deck.length).toBe(14) // 16 - 2
  })

  it('덱이 소진되면 새 20장 덱 생성', () => {
    const { engine, state, shuffler } = createTestGame()

    // 라운드 1: 새 덱 생성
    let s = startRoundWithCards(engine, state, shuffler, 8, 3)
    const r1 = playShowdown(engine, s)
    s = r1.newState

    // 덱을 1장만 남기도록 조작
    s = { ...s, deck: [5 as Card] }

    // 다음 라운드: 덱 < 2 → 새 20장 덱 생성
    s = startRoundWithCards(engine, s, shuffler, 9, 2)
    expect(s.deck.length).toBe(18) // 새 20장 - 2
  })

  it('베팅 전체 흐름', () => {
    const { engine, state, shuffler } = createTestGame()
    let s = startRoundWithCards(engine, state, shuffler, 8, 2)

    // 바로 betting 단계
    expect(s.phase).toBe('betting')

    // 레이즈
    const r1 = engine.executeAction(s, { type: 'RAISE', amount: 5 })
    expect(r1.success).toBe(true)

    // 폴드
    const r2 = engine.executeAction(r1.newState, { type: 'FOLD' })
    expect(r2.success).toBe(true)
    expect(r2.newState.phase).toBe('round_end')
  })

  describe('선 플레이어 폴드', () => {
    it('선 플레이어 폴드 → 상대가 팟 획득', () => {
      const { engine, state, shuffler } = createTestGame()
      const s = startRoundWithCards(engine, state, shuffler, 5, 8)

      const currentIdx = s.currentPlayerIndex
      const opponentIdx = 1 - currentIdx
      const opponentBefore = s.players[opponentIdx].chips
      const pot = s.pot

      // 선 플레이어 폴드
      const result = engine.executeAction(s, { type: 'FOLD' })
      expect(result.success).toBe(true)
      expect(result.newState.phase).toBe('round_end')

      const opponentAfter = result.newState.players[opponentIdx].chips
      expect(opponentAfter).toBe(opponentBefore + pot)
    })

    it('선 플레이어가 10 들고 폴드 → 패널티 포함', () => {
      const { engine, state, shuffler } = createTestGame()
      const s = startRoundWithCards(engine, state, shuffler, 10, 8)

      const currentIdx = s.currentPlayerIndex
      const opponentIdx = 1 - currentIdx
      const folderBefore = s.players[currentIdx].chips
      const opponentBefore = s.players[opponentIdx].chips
      const pot = s.pot

      // 선 플레이어(카드 10) 폴드
      const result = engine.executeAction(s, { type: 'FOLD' })
      expect(result.success).toBe(true)

      // 패널티 적용 확인
      const folderAfter = result.newState.players[currentIdx].chips
      expect(folderAfter).toBe(folderBefore - FOLD_TEN_PENALTY)

      const opponentAfter = result.newState.players[opponentIdx].chips
      expect(opponentAfter).toBe(opponentBefore + pot + FOLD_TEN_PENALTY)
    })

    it('패널티로 칩이 0 이하가 되면 게임 종료', () => {
      const { engine, state, shuffler } = createTestGame()

      // 칩을 패널티보다 적게 설정 (앤티 1칩 후 4칩 남음)
      const lowChipsState = {
        ...state,
        players: [
          { ...state.players[0], chips: 5 },
          { ...state.players[1], chips: INITIAL_CHIPS },
        ] as typeof state.players,
      }

      const s = startRoundWithCards(engine, lowChipsState, shuffler, 10, 8)
      const currentIdx = s.currentPlayerIndex
      const folderChips = s.players[currentIdx].chips // 5 - 1(앤티) = 4칩

      // 선 플레이어(카드 10) 폴드 → 패널티로 칩 0
      const result = engine.executeAction(s, { type: 'FOLD' })
      expect(result.success).toBe(true)

      // 패널티는 보유 칩(4칩)만큼만
      expect(result.newState.players[currentIdx].chips).toBe(0)

      // 칩 0 → 게임 종료
      expect(result.newState.phase).toBe('game_over')
    })
  })
})
