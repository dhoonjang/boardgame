import type { GameState, ActionResult, GameEvent } from '../types'

/**
 * 레이즈: 칩을 더 걸기
 */
export function executeRaise(state: GameState, playerId: string, amount: number): ActionResult {
  const playerIndex = state.players.findIndex(p => p.id === playerId)
  if (playerIndex === -1) {
    return { success: false, newState: state, message: '플레이어를 찾을 수 없습니다.', events: [] }
  }

  const player = state.players[playerIndex]
  const opponent = state.players[1 - playerIndex]

  if (amount < 1) {
    return { success: false, newState: state, message: '최소 1칩 이상 레이즈해야 합니다.', events: [] }
  }

  // 상대 베팅과의 차이 + 추가 레이즈 금액
  const callAmount = opponent.currentBet - player.currentBet
  const totalNeeded = callAmount + amount

  if (totalNeeded > player.chips) {
    return { success: false, newState: state, message: '칩이 부족합니다.', events: [] }
  }

  const newPlayers = [...state.players] as [typeof state.players[0], typeof state.players[1]]
  newPlayers[playerIndex] = {
    ...player,
    chips: player.chips - totalNeeded,
    currentBet: player.currentBet + totalNeeded,
  }

  const events: GameEvent[] = [{
    type: 'RAISE',
    playerId,
    message: `${player.name}이(가) ${amount}칩 레이즈했습니다.`,
    data: { amount, totalBet: player.currentBet + totalNeeded },
  }]

  return {
    success: true,
    newState: {
      ...state,
      players: newPlayers,
      pot: state.pot + totalNeeded,
      currentPlayerIndex: 1 - playerIndex,
      lastRaisePlayerIndex: playerIndex,
    },
    message: `${amount}칩 레이즈했습니다.`,
    events,
  }
}

/**
 * 콜: 상대 베팅에 맞추기 (같으면 체크 역할)
 */
export function executeCall(state: GameState, playerId: string): ActionResult {
  const playerIndex = state.players.findIndex(p => p.id === playerId)
  if (playerIndex === -1) {
    return { success: false, newState: state, message: '플레이어를 찾을 수 없습니다.', events: [] }
  }

  const player = state.players[playerIndex]
  const opponent = state.players[1 - playerIndex]
  const callAmount = opponent.currentBet - player.currentBet

  // 칩이 부족하면 올인 (가진 만큼만 콜)
  const actualCallAmount = Math.min(callAmount, player.chips)

  const newPlayers = [...state.players] as [typeof state.players[0], typeof state.players[1]]
  newPlayers[playerIndex] = {
    ...player,
    chips: player.chips - actualCallAmount,
    currentBet: player.currentBet + actualCallAmount,
  }

  const events: GameEvent[] = [{
    type: 'CALL',
    playerId,
    message: actualCallAmount > 0
      ? `${player.name}이(가) ${actualCallAmount}칩을 콜했습니다.`
      : `${player.name}이(가) 체크했습니다.`,
  }]

  // 콜 후 → 쇼다운으로 전환
  return {
    success: true,
    newState: {
      ...state,
      players: newPlayers,
      pot: state.pot + actualCallAmount,
      phase: 'showdown',
    },
    message: actualCallAmount > 0 ? `${actualCallAmount}칩 콜했습니다.` : '체크했습니다.',
    events,
  }
}

/**
 * 폴드: 포기 (팟 상실)
 */
export function executeFold(state: GameState, playerId: string): ActionResult {
  const playerIndex = state.players.findIndex(p => p.id === playerId)
  if (playerIndex === -1) {
    return { success: false, newState: state, message: '플레이어를 찾을 수 없습니다.', events: [] }
  }

  const player = state.players[playerIndex]
  const opponent = state.players[1 - playerIndex]

  const newPlayers = [...state.players] as [typeof state.players[0], typeof state.players[1]]
  newPlayers[playerIndex] = { ...player, hasFolded: true }

  // 상대가 팟 획득
  newPlayers[1 - playerIndex] = {
    ...opponent,
    chips: opponent.chips + state.pot,
  }

  const roundResult = {
    roundNumber: state.roundNumber,
    player0Card: state.players[0].card!,
    player1Card: state.players[1].card!,
    winner: opponent.id,
    potWon: state.pot,
    foldedPlayerId: playerId,
  }

  const events: GameEvent[] = [{
    type: 'FOLD',
    playerId,
    message: `${player.name}이(가) 폴드했습니다. ${opponent.name}이(가) ${state.pot}칩을 획득합니다.`,
  }]

  // 상대 칩이 0인지 or 라운드 종료 확인
  const newState: GameState = {
    ...state,
    players: newPlayers,
    pot: 0,
    phase: 'round_end',
    roundHistory: [...state.roundHistory, roundResult],
  }

  return {
    success: true,
    newState,
    message: `폴드했습니다. ${opponent.name}이(가) 팟을 획득합니다.`,
    events,
  }
}
