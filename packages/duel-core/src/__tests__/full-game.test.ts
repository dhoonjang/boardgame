import { describe, it, expect } from 'vitest'
import { createTestGame, startRoundWithCards, skipAbilityPhase } from './test-helpers'
import type { Card } from '../types'
import { INITIAL_CHIPS, ANTE_AMOUNT, MAX_ROUNDS } from '../constants'

describe('Full Game', () => {
  it('5라운드 완주', () => {
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

    // 5라운드 종료 후
    expect(s.roundHistory).toHaveLength(5)
    expect(s.roundNumber).toBe(5)
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

  it('동률이면 무승부', () => {
    const { engine, state, shuffler } = createTestGame()
    let s = state

    // 5라운드 동안 번갈아 승리하여 칩 동률
    const rounds: [Card, Card][] = [
      [5, 5], // 무승부
      [5, 5], // 무승부
      [5, 5], // 무승부
      [5, 5], // 무승부
      [5, 5], // 무승부
    ]

    for (const [c1, c2] of rounds) {
      s = startRoundWithCards(engine, s, shuffler, c1, c2)
      s = skipAbilityPhase(engine, s)

      const result = engine.executeAction(s, { type: 'CALL' })
      expect(result.success).toBe(true)
      s = result.newState

      if (s.phase === 'game_over') break
    }

    // 마지막 라운드 종료 후 START_ROUND → game_over
    if (s.phase === 'round_end') {
      const endResult = engine.executeAction(s, { type: 'START_ROUND' })
      s = endResult.newState
    }

    expect(s.phase).toBe('game_over')
    expect(s.isDraw).toBe(true)
    expect(s.winner).toBeNull()
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

    // 선 플레이어 peek
    const r1 = engine.executeAction(s, { type: 'PEEK' })
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
