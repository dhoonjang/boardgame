import type {
  GameState, GameAction, ActionResult, ValidAction, PlayerView,
  Player, Card, Shuffler, GameEvent,
} from '../types'
import {
  INITIAL_CHIPS, ANTE_AMOUNT, INITIAL_PEEK_COUNT, INITIAL_SWAP_COUNT,
  MAX_ROUNDS, FULL_DECK, MIN_RAISE_AMOUNT,
} from '../constants'
import { executePeek, executeSwap } from './abilities'
import { executeRaise, executeCall, executeFold } from './betting'
import { resolveShowdown } from './showdown'

function generateId(): string {
  return Math.random().toString(36).substring(2, 10)
}

const defaultShuffler: Shuffler = {
  shuffle<T>(array: T[]): T[] {
    const arr = [...array]
    for (let i = arr.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      [arr[i], arr[j]] = [arr[j], arr[i]]
    }
    return arr
  },
}

export class GameEngine {
  private shuffler: Shuffler

  constructor(config?: { shuffler?: Shuffler }) {
    this.shuffler = config?.shuffler ?? defaultShuffler
  }

  /**
   * 새 게임 생성 (waiting 상태)
   */
  createGame(player1: { id: string; name: string }): GameState {
    const p1: Player = {
      id: player1.id,
      name: player1.name,
      chips: INITIAL_CHIPS,
      card: null,
      peekCount: INITIAL_PEEK_COUNT,
      swapCount: INITIAL_SWAP_COUNT,
      currentBet: 0,
      hasFolded: false,
      hasPeeked: false,
      hasUsedAbility: false,
    }

    const emptyPlayer: Player = {
      id: '',
      name: '',
      chips: INITIAL_CHIPS,
      card: null,
      peekCount: INITIAL_PEEK_COUNT,
      swapCount: INITIAL_SWAP_COUNT,
      currentBet: 0,
      hasFolded: false,
      hasPeeked: false,
      hasUsedAbility: false,
    }

    return {
      id: generateId(),
      players: [p1, emptyPlayer],
      deck: [],
      discardPile: [],
      pot: 0,
      phase: 'waiting',
      roundNumber: 0,
      maxRounds: MAX_ROUNDS,
      currentPlayerIndex: 0,
      firstPlayerIndex: 0,
      lastRaisePlayerIndex: null,
      winner: null,
      isDraw: false,
      roundHistory: [],
    }
  }

  /**
   * 두 번째 플레이어 참가
   */
  joinGame(state: GameState, player2: { id: string; name: string }): GameState {
    const p2: Player = {
      id: player2.id,
      name: player2.name,
      chips: INITIAL_CHIPS,
      card: null,
      peekCount: INITIAL_PEEK_COUNT,
      swapCount: INITIAL_SWAP_COUNT,
      currentBet: 0,
      hasFolded: false,
      hasPeeked: false,
      hasUsedAbility: false,
    }

    return {
      ...state,
      players: [state.players[0], p2],
    }
  }

  /**
   * 액션 실행
   */
  executeAction(state: GameState, action: GameAction, playerId?: string): ActionResult {
    // START_ROUND는 playerId 불필요
    if (action.type === 'START_ROUND') {
      return this.startRound(state)
    }

    // 나머지 액션은 현재 플레이어만 가능
    const currentPlayer = state.players[state.currentPlayerIndex]
    const actingPlayerId = playerId ?? currentPlayer.id

    if (actingPlayerId !== currentPlayer.id) {
      return {
        success: false,
        newState: state,
        message: '현재 당신의 차례가 아닙니다.',
        events: [],
      }
    }

    switch (action.type) {
      case 'PEEK':
        return this.handleAbilityResult(state, executePeek(state, actingPlayerId))
      case 'SWAP':
        return this.handleAbilityResult(state, executeSwap(state, actingPlayerId))
      case 'SKIP_ABILITY':
        return this.skipAbility(state, actingPlayerId)
      case 'RAISE':
        return this.handleBettingResult(state, executeRaise(state, actingPlayerId, action.amount))
      case 'CALL':
        return this.handleBettingResult(state, executeCall(state, actingPlayerId))
      case 'FOLD':
        return this.handlePostRound(executeFold(state, actingPlayerId))
      default:
        return { success: false, newState: state, message: '알 수 없는 액션입니다.', events: [] }
    }
  }

  /**
   * 새 라운드 시작
   */
  private startRound(state: GameState): ActionResult {
    if (state.phase !== 'waiting' && state.phase !== 'round_end') {
      return { success: false, newState: state, message: '라운드를 시작할 수 없는 상태입니다.', events: [] }
    }

    // 플레이어 2명 확인
    if (state.players[1].id === '') {
      return { success: false, newState: state, message: '상대 플레이어가 필요합니다.', events: [] }
    }

    const newRoundNumber = state.roundNumber + 1

    // 최대 라운드 초과 확인
    if (newRoundNumber > state.maxRounds) {
      return this.endGame(state)
    }

    // 덱 준비: 새 라운드마다 전체 10장으로 리셋 후 셔플
    const deck = this.shuffler.shuffle([...FULL_DECK])

    // 카드 딜링 (각 1장)
    const card0 = deck.shift()!
    const card1 = deck.shift()!

    // 앤티
    const p0Chips = state.players[0].chips
    const p1Chips = state.players[1].chips

    // 칩이 부족하면 있는 만큼만
    const ante0 = Math.min(ANTE_AMOUNT, p0Chips)
    const ante1 = Math.min(ANTE_AMOUNT, p1Chips)

    // 선 플레이어 교체 (매 라운드)
    const firstPlayerIndex = state.roundNumber === 0 ? 0 : (1 - state.firstPlayerIndex) as 0 | 1

    const newPlayers: [Player, Player] = [
      {
        ...state.players[0],
        card: card0,
        currentBet: ante0,
        hasFolded: false,
        hasPeeked: false,
        hasUsedAbility: false,
        chips: p0Chips - ante0,
      },
      {
        ...state.players[1],
        card: card1,
        currentBet: ante1,
        hasFolded: false,
        hasPeeked: false,
        hasUsedAbility: false,
        chips: p1Chips - ante1,
      },
    ]

    const events: GameEvent[] = [{
      type: 'ROUND_START',
      message: `라운드 ${newRoundNumber} 시작! 앤티 ${ante0 + ante1}칩.`,
      data: { roundNumber: newRoundNumber },
    }]

    return {
      success: true,
      newState: {
        ...state,
        players: newPlayers,
        deck,
        discardPile: [],
        pot: ante0 + ante1,
        phase: 'ability',
        roundNumber: newRoundNumber,
        currentPlayerIndex: firstPlayerIndex,
        firstPlayerIndex,
        lastRaisePlayerIndex: null,
      },
      message: `라운드 ${newRoundNumber} 시작!`,
      events,
    }
  }

  /**
   * 능력 사용 후 상태 처리
   */
  private handleAbilityResult(state: GameState, result: ActionResult): ActionResult {
    if (!result.success) return result

    if (state.phase !== 'ability') {
      return { success: false, newState: state, message: '능력 단계가 아닙니다.', events: [] }
    }

    // 능력 사용 후 → 상대에게 턴 넘기거나, 둘 다 완료면 베팅으로
    const newState = result.newState
    const otherIndex = 1 - state.currentPlayerIndex
    const otherPlayer = newState.players[otherIndex]

    // 현재 플레이어 능력 사용 완료 → 상대 차례
    if (!otherPlayer.hasUsedAbility) {
      return {
        ...result,
        newState: { ...newState, currentPlayerIndex: otherIndex },
      }
    }

    // 둘 다 능력 사용 완료 → 베팅 단계로
    return {
      ...result,
      newState: {
        ...newState,
        phase: 'betting',
        currentPlayerIndex: newState.firstPlayerIndex,
        lastRaisePlayerIndex: null,
      },
    }
  }

  /**
   * 능력 건너뛰기
   */
  private skipAbility(state: GameState, playerId: string): ActionResult {
    if (state.phase !== 'ability') {
      return { success: false, newState: state, message: '능력 단계가 아닙니다.', events: [] }
    }

    const playerIndex = state.players.findIndex(p => p.id === playerId)
    const player = state.players[playerIndex]

    const newPlayers = [...state.players] as [Player, Player]
    newPlayers[playerIndex] = { ...player, hasUsedAbility: true }

    const events: GameEvent[] = [{
      type: 'SKIP_ABILITY',
      playerId,
      message: `${player.name}이(가) 능력 사용을 건너뛰었습니다.`,
    }]

    const otherIndex = 1 - playerIndex
    const otherPlayer = newPlayers[otherIndex]

    // 상대도 이미 완료했으면 베팅으로
    if (otherPlayer.hasUsedAbility) {
      return {
        success: true,
        newState: {
          ...state,
          players: newPlayers,
          phase: 'betting',
          currentPlayerIndex: state.firstPlayerIndex,
          lastRaisePlayerIndex: null,
        },
        message: '능력 사용을 건너뛰었습니다.',
        events,
      }
    }

    // 아니면 상대 차례
    return {
      success: true,
      newState: {
        ...state,
        players: newPlayers,
        currentPlayerIndex: otherIndex,
      },
      message: '능력 사용을 건너뛰었습니다.',
      events,
    }
  }

  /**
   * 베팅 결과 후 쇼다운 확인
   */
  private handleBettingResult(_state: GameState, result: ActionResult): ActionResult {
    if (!result.success) return result

    // 쇼다운 상태면 즉시 처리
    if (result.newState.phase === 'showdown') {
      const showdownResult = resolveShowdown(result.newState)
      if (showdownResult.success) {
        return this.handlePostRound({
          ...showdownResult,
          events: [...result.events, ...showdownResult.events],
        })
      }
      return showdownResult
    }

    return result
  }

  /**
   * 라운드 후 게임 종료 확인
   */
  private handlePostRound(result: ActionResult): ActionResult {
    if (!result.success) return result

    const state = result.newState

    // 누군가 칩이 0이면 게임 종료
    if (state.players[0].chips <= 0 || state.players[1].chips <= 0) {
      const endResult = this.endGame(state)
      return {
        ...endResult,
        events: [...result.events, ...endResult.events],
      }
    }

    // 최대 라운드 도달 확인
    if (state.roundNumber >= state.maxRounds) {
      const endResult = this.endGame(state)
      return {
        ...endResult,
        events: [...result.events, ...endResult.events],
      }
    }

    return result
  }

  /**
   * 게임 종료 처리
   */
  private endGame(state: GameState): ActionResult {
    const [p0, p1] = state.players

    let winner: string | null = null
    let isDraw = false

    if (p0.chips > p1.chips) {
      winner = p0.id
    } else if (p1.chips > p0.chips) {
      winner = p1.id
    } else {
      isDraw = true
    }

    const events: GameEvent[] = [{
      type: 'GAME_OVER',
      message: isDraw
        ? `게임 종료! 무승부 (${p0.chips}칩 동률)`
        : `게임 종료! ${winner === p0.id ? p0.name : p1.name} 승리!`,
      data: { player0Chips: p0.chips, player1Chips: p1.chips },
    }]

    return {
      success: true,
      newState: {
        ...state,
        phase: 'game_over',
        winner,
        isDraw,
      },
      message: isDraw ? '무승부!' : `${winner === p0.id ? p0.name : p1.name} 승리!`,
      events,
    }
  }

  /**
   * 현재 상태에서 유효한 액션 목록
   */
  getValidActions(state: GameState, playerId?: string): ValidAction[] {
    const currentPlayer = state.players[state.currentPlayerIndex]
    const checkPlayerId = playerId ?? currentPlayer.id

    // 자기 차례가 아니면 빈 배열
    if (checkPlayerId !== currentPlayer.id) return []

    switch (state.phase) {
      case 'round_end':
        return [{ type: 'START_ROUND', description: '다음 라운드 시작' }]

      case 'waiting':
        // 두 번째 플레이어가 있으면 시작 가능
        if (state.players[1].id !== '') {
          return [{ type: 'START_ROUND', description: '게임 시작' }]
        }
        return []

      case 'ability':
        return this.getAbilityActions(state, currentPlayer)

      case 'betting':
        return this.getBettingActions(state, currentPlayer)

      default:
        return []
    }
  }

  private getAbilityActions(state: GameState, player: Player): ValidAction[] {
    if (player.hasUsedAbility) return []

    const actions: ValidAction[] = []

    if (player.peekCount > 0 && !player.hasPeeked) {
      actions.push({
        type: 'PEEK',
        description: `엿보기 (남은 ${player.peekCount}회)`,
      })
    }

    if (player.swapCount > 0 && state.deck.length > 0) {
      actions.push({
        type: 'SWAP',
        description: `교체 (남은 ${player.swapCount}회)`,
      })
    }

    actions.push({ type: 'SKIP_ABILITY', description: '능력 건너뛰기' })

    return actions
  }

  private getBettingActions(state: GameState, player: Player): ValidAction[] {
    const opponent = state.players[1 - state.currentPlayerIndex]
    const actions: ValidAction[] = []

    const callAmount = opponent.currentBet - player.currentBet

    // 레이즈 (칩이 callAmount + 1 이상 있어야)
    if (player.chips > callAmount) {
      const maxRaise = player.chips - callAmount
      actions.push({
        type: 'RAISE',
        description: `레이즈 (${MIN_RAISE_AMOUNT}~${maxRaise}칩)`,
        minAmount: MIN_RAISE_AMOUNT,
        maxAmount: maxRaise,
      })
    }

    // 콜 (또는 체크)
    if (callAmount > 0) {
      actions.push({
        type: 'CALL',
        description: `콜 (${Math.min(callAmount, player.chips)}칩)`,
      })
    } else {
      actions.push({
        type: 'CALL',
        description: '체크',
      })
    }

    // 폴드 (상대가 레이즈한 경우에만)
    if (callAmount > 0) {
      actions.push({
        type: 'FOLD',
        description: '폴드',
      })
    }

    return actions
  }

  /**
   * 특정 플레이어의 뷰 생성 (카드 숨김 처리)
   */
  getPlayerView(state: GameState, playerId: string): PlayerView {
    const myIndex = state.players.findIndex(p => p.id === playerId)
    if (myIndex === -1) {
      throw new Error('플레이어를 찾을 수 없습니다.')
    }

    const me = state.players[myIndex]
    const opponent = state.players[1 - myIndex]

    return {
      gameId: state.id,
      phase: state.phase,
      roundNumber: state.roundNumber,
      maxRounds: state.maxRounds,
      pot: state.pot,
      currentPlayerIndex: state.currentPlayerIndex,
      firstPlayerIndex: state.firstPlayerIndex,
      myIndex,
      // 핵심: 내 카드는 peek 했을 때만, 상대 카드는 항상 보임
      myCard: me.hasPeeked ? me.card : null,
      opponentCard: state.phase === 'round_end' || state.phase === 'game_over'
        ? opponent.card  // 라운드/게임 종료 시에도 보임
        : opponent.card, // 인디언 포커: 상대 카드 항상 보임
      me: {
        id: me.id,
        name: me.name,
        chips: me.chips,
        currentBet: me.currentBet,
        hasFolded: me.hasFolded,
        hasPeeked: me.hasPeeked,
        hasUsedAbility: me.hasUsedAbility,
        peekCount: me.peekCount,
        swapCount: me.swapCount,
      },
      opponent: {
        id: opponent.id,
        name: opponent.name,
        chips: opponent.chips,
        currentBet: opponent.currentBet,
        hasFolded: opponent.hasFolded,
        hasPeeked: opponent.hasPeeked,
        hasUsedAbility: opponent.hasUsedAbility,
        peekCount: opponent.peekCount,
        swapCount: opponent.swapCount,
      },
      winner: state.winner,
      isDraw: state.isDraw,
      roundHistory: state.roundHistory,
      deckRemaining: state.deck.length,
    }
  }
}
