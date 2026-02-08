import { describe, it, expect } from 'vitest'
import { createTestGame, startRoundWithCards, skipAbilityPhase } from './test-helpers'
import type { Card } from '../../game'
import { INITIAL_CHIPS } from '../../game'

describe('Full Game', () => {
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
      s = skipAbilityPhase(engine, s)

      // 체크로 쇼다운
      const result = engine.executeAction(s, { type: 'CALL' })
      expect(result.success).toBe(true)
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
    s = skipAbilityPhase(engine, s)

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
    s = skipAbilityPhase(engine, s)

    const result = engine.executeAction(s, { type: 'CALL' })
    expect(result.success).toBe(true)
    s = result.newState

    // 무승부 → 칩은 앤티만큼만 변동, 게임 계속
    expect(s.phase).toBe('round_end')
    expect(s.roundHistory[0].winner).toBeNull()

    // 다음 라운드 시작 가능
    s = startRoundWithCards(engine, s, shuffler, 7, 3)
    expect(s.phase).toBe('ability')
  })

  it('선 플레이어가 매 라운드 교체됨', () => {
    const { engine, state, shuffler } = createTestGame()

    // 라운드 1
    let s = startRoundWithCards(engine, state, shuffler, 7, 3)
    const firstRoundFirst = s.firstPlayerIndex

    s = skipAbilityPhase(engine, s)
    const r1 = engine.executeAction(s, { type: 'CALL' })
    s = r1.newState

    // 라운드 2
    s = startRoundWithCards(engine, s, shuffler, 7, 3)
    expect(s.firstPlayerIndex).toBe(1 - firstRoundFirst)
  })

  it('레이즈 → 콜 전체 흐름', () => {
    const { engine, state, shuffler } = createTestGame()
    let s = startRoundWithCards(engine, state, shuffler, 9, 2)
    s = skipAbilityPhase(engine, s)

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
    s = skipAbilityPhase(engine, s)

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

  it('능력 사용 후 베팅 흐름', () => {
    const { engine, state, shuffler } = createTestGame()
    let s = startRoundWithCards(engine, state, shuffler, 8, 2)

    // 선 플레이어 swap
    const r1 = engine.executeAction(s, { type: 'SWAP' })
    expect(r1.success).toBe(true)

    // 상대 skip
    const r2 = engine.executeAction(r1.newState, { type: 'SKIP_ABILITY' })
    expect(r2.success).toBe(true)
    expect(r2.newState.phase).toBe('betting')

    // 이후 베팅
    const r3 = engine.executeAction(r2.newState, { type: 'RAISE', amount: 5 })
    expect(r3.success).toBe(true)

    const r4 = engine.executeAction(r3.newState, { type: 'FOLD' })
    expect(r4.success).toBe(true)
    expect(r4.newState.phase).toBe('round_end')
  })
})
