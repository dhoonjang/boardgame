import { describe, it, expect } from 'vitest'
import { GameEngine } from '../engine/game-engine'
import { createTestGame, startRoundWithCards, skipAbilityPhase } from './test-helpers'
import { INITIAL_CHIPS, ANTE_AMOUNT } from '../constants'

describe('GameEngine', () => {
  describe('createGame', () => {
    it('게임을 생성하면 waiting 상태', () => {
      const engine = new GameEngine()
      const state = engine.createGame({ id: 'p1', name: 'Player1' })

      expect(state.phase).toBe('waiting')
      expect(state.players[0].id).toBe('p1')
      expect(state.players[0].chips).toBe(INITIAL_CHIPS)
      expect(state.players[1].id).toBe('')
      expect(state.roundNumber).toBe(0)
    })
  })

  describe('joinGame', () => {
    it('두 번째 플레이어 참가', () => {
      const engine = new GameEngine()
      let state = engine.createGame({ id: 'p1', name: 'Player1' })
      state = engine.joinGame(state, { id: 'p2', name: 'Player2' })

      expect(state.players[1].id).toBe('p2')
      expect(state.players[1].name).toBe('Player2')
      expect(state.players[1].chips).toBe(INITIAL_CHIPS)
    })
  })

  describe('startRound', () => {
    it('상대 없이 시작 불가', () => {
      const engine = new GameEngine()
      const state = engine.createGame({ id: 'p1', name: 'Player1' })
      const result = engine.executeAction(state, { type: 'START_ROUND' })

      expect(result.success).toBe(false)
    })

    it('라운드 시작하면 ability 단계', () => {
      const { engine, state, shuffler } = createTestGame()
      const newState = startRoundWithCards(engine, state, shuffler, 5, 3)

      expect(newState.phase).toBe('ability')
      expect(newState.roundNumber).toBe(1)
      expect(newState.players[0].card).toBe(5)
      expect(newState.players[1].card).toBe(3)
      expect(newState.pot).toBe(ANTE_AMOUNT * 2)
    })

    it('앤티로 각 1칩 차감', () => {
      const { engine, state, shuffler } = createTestGame()
      const newState = startRoundWithCards(engine, state, shuffler, 5, 3)

      expect(newState.players[0].chips).toBe(INITIAL_CHIPS - ANTE_AMOUNT)
      expect(newState.players[1].chips).toBe(INITIAL_CHIPS - ANTE_AMOUNT)
    })
  })

  describe('기본 플로우: 능력 건너뛰기 → 체크 → 쇼다운', () => {
    it('양쪽 체크하면 쇼다운 진행', () => {
      const { engine, state, shuffler } = createTestGame()
      let s = startRoundWithCards(engine, state, shuffler, 7, 3)

      // 능력 건너뛰기
      s = skipAbilityPhase(engine, s)
      expect(s.phase).toBe('betting')

      // 선 플레이어 체크 (콜)
      const r1 = engine.executeAction(s, { type: 'CALL' })
      expect(r1.success).toBe(true)

      // 콜 → 쇼다운 → round_end
      expect(r1.newState.phase).toBe('round_end')

      // 7 > 3 이므로 player-1 승리
      const history = r1.newState.roundHistory
      expect(history).toHaveLength(1)
      expect(history[0].winner).toBe('player-1')
    })
  })

  describe('getPlayerView', () => {
    it('내 카드는 peek 전에는 숨김', () => {
      const { engine, state, shuffler } = createTestGame()
      const s = startRoundWithCards(engine, state, shuffler, 7, 3)

      const view1 = engine.getPlayerView(s, 'player-1')
      expect(view1.myCard).toBeNull()    // peek 안 함 → 안 보임
      expect(view1.opponentCard).toBe(3) // 상대 카드는 보임

      const view2 = engine.getPlayerView(s, 'player-2')
      expect(view2.myCard).toBeNull()    // peek 안 함 → 안 보임
      expect(view2.opponentCard).toBe(7) // 상대 카드는 보임
    })
  })

  describe('getValidActions', () => {
    it('ability 단계에서 유효 액션', () => {
      const { engine, state, shuffler } = createTestGame()
      const s = startRoundWithCards(engine, state, shuffler, 5, 3)

      const actions = engine.getValidActions(s, 'player-1')
      const types = actions.map(a => a.type)

      expect(types).toContain('PEEK')
      expect(types).toContain('SWAP')
      expect(types).toContain('SKIP_ABILITY')
    })

    it('자기 차례가 아니면 빈 배열', () => {
      const { engine, state, shuffler } = createTestGame()
      const s = startRoundWithCards(engine, state, shuffler, 5, 3)

      // player-1이 선이면 player-2는 빈 배열
      const otherIndex = 1 - s.currentPlayerIndex
      const otherId = s.players[otherIndex].id
      const actions = engine.getValidActions(s, otherId)
      expect(actions).toHaveLength(0)
    })
  })
})
