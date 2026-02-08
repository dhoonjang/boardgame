import type { Shuffler, Card, GameState } from '../types'
import { GameEngine } from '../engine/game-engine'

/**
 * 테스트용 MockShuffler: 카드 순서를 제어
 */
export class MockShuffler implements Shuffler {
  private nextOrder: unknown[] | null = null

  /**
   * 다음 shuffle 호출 시 반환할 배열 순서 설정
   */
  setNextOrder<T>(order: T[]): void {
    this.nextOrder = order
  }

  shuffle<T>(array: T[]): T[] {
    if (this.nextOrder) {
      const result = this.nextOrder as T[]
      this.nextOrder = null
      return result
    }
    return [...array]  // 기본: 원래 순서 유지
  }
}

/**
 * 두 플레이어가 참여한 게임 생성
 */
export function createTestGame(shuffler?: MockShuffler): {
  engine: GameEngine
  state: GameState
  shuffler: MockShuffler
} {
  const mockShuffler = shuffler ?? new MockShuffler()
  const engine = new GameEngine({ shuffler: mockShuffler })

  let state = engine.createGame({ id: 'player-1', name: '플레이어1' })
  state = engine.joinGame(state, { id: 'player-2', name: '플레이어2' })

  return { engine, state, shuffler: mockShuffler }
}

/**
 * 게임을 특정 카드 배치로 라운드 시작
 * @param card1 플레이어1 카드
 * @param card2 플레이어2 카드
 */
export function startRoundWithCards(
  engine: GameEngine,
  state: GameState,
  shuffler: MockShuffler,
  card1: Card,
  card2: Card,
): GameState {
  // 셔플 결과의 첫 2장이 card1, card2가 되도록 설정
  const remaining: Card[] = ([1, 2, 3, 4, 5, 6, 7, 8, 9, 10] as Card[])
    .filter(c => c !== card1 && c !== card2)
  shuffler.setNextOrder([card1, card2, ...remaining])

  const result = engine.executeAction(state, { type: 'START_ROUND' })
  if (!result.success) throw new Error(`라운드 시작 실패: ${result.message}`)
  return result.newState
}

/**
 * 능력 단계 건너뛰기 (양쪽 모두)
 */
export function skipAbilityPhase(engine: GameEngine, state: GameState): GameState {
  let current = state

  // 현재 플레이어 skip
  const result1 = engine.executeAction(current, { type: 'SKIP_ABILITY' })
  if (!result1.success) throw new Error(`능력 건너뛰기 실패: ${result1.message}`)
  current = result1.newState

  // 아직 ability 단계면 상대도 skip
  if (current.phase === 'ability') {
    const result2 = engine.executeAction(current, { type: 'SKIP_ABILITY' })
    if (!result2.success) throw new Error(`능력 건너뛰기 실패: ${result2.message}`)
    current = result2.newState
  }

  return current
}
