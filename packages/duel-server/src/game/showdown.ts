import type { GameState, ActionResult, GameEvent, RoundResult } from './types'

/**
 * 쇼다운: 카드 공개 → 높은 카드 승리, 팟 획득
 */
export function resolveShowdown(state: GameState): ActionResult {
  const [player0, player1] = state.players

  if (player0.card === null || player1.card === null) {
    return { success: false, newState: state, message: '카드가 배분되지 않았습니다.', events: [] }
  }

  const card0 = player0.card
  const card1 = player1.card

  const events: GameEvent[] = [{
    type: 'SHOWDOWN',
    message: `카드 공개: ${player0.name}(${card0}) vs ${player1.name}(${card1})`,
    data: { player0Card: card0, player1Card: card1 },
  }]

  let winnerId: string | null = null
  let winnerIndex: number

  if (card0 > card1) {
    winnerId = player0.id
    winnerIndex = 0
  } else if (card1 > card0) {
    winnerId = player1.id
    winnerIndex = 1
  } else {
    // 동점 → 팟을 반반 나눔
    const half = Math.floor(state.pot / 2)
    const remainder = state.pot % 2

    const newPlayers = [...state.players] as [typeof state.players[0], typeof state.players[1]]
    // 선 플레이어에게 나머지 1칩
    newPlayers[0] = { ...player0, chips: player0.chips + half + (state.firstPlayerIndex === 0 ? remainder : 0) }
    newPlayers[1] = { ...player1, chips: player1.chips + half + (state.firstPlayerIndex === 1 ? remainder : 0) }

    const p0Got = half + (state.firstPlayerIndex === 0 ? remainder : 0)
    const p1Got = half + (state.firstPlayerIndex === 1 ? remainder : 0)

    const roundResult: RoundResult = {
      roundNumber: state.roundNumber,
      player0Card: card0,
      player1Card: card1,
      winner: null,
      potWon: state.pot,
      foldedPlayerId: null,
      player0ChipChange: p0Got - player0.currentBet,
      player1ChipChange: p1Got - player1.currentBet,
    }

    events.push({
      type: 'TIE',
      message: `무승부! 팟 ${state.pot}칩을 반반 나눕니다.`,
    })

    return {
      success: true,
      newState: {
        ...state,
        players: newPlayers,
        pot: 0,
        phase: 'round_end',
        roundHistory: [...state.roundHistory, roundResult],
      },
      message: '무승부! 팟을 반반 나눕니다.',
      events,
    }
  }

  // 승자가 팟 획득
  const newPlayers = [...state.players] as [typeof state.players[0], typeof state.players[1]]
  newPlayers[winnerIndex!] = {
    ...state.players[winnerIndex!],
    chips: state.players[winnerIndex!].chips + state.pot,
  }

  const winner = state.players[winnerIndex!]

  const roundResult: RoundResult = {
    roundNumber: state.roundNumber,
    player0Card: card0,
    player1Card: card1,
    winner: winnerId,
    potWon: state.pot,
    foldedPlayerId: null,
    player0ChipChange: winnerIndex === 0 ? state.pot - player0.currentBet : -player0.currentBet,
    player1ChipChange: winnerIndex === 1 ? state.pot - player1.currentBet : -player1.currentBet,
  }

  events.push({
    type: 'WIN',
    playerId: winnerId!,
    message: `${winner.name}이(가) 승리! ${state.pot}칩을 획득합니다.`,
  })

  return {
    success: true,
    newState: {
      ...state,
      players: newPlayers,
      pot: 0,
      phase: 'round_end',
      roundHistory: [...state.roundHistory, roundResult],
    },
    message: `${winner.name}이(가) 승리! ${state.pot}칩을 획득합니다.`,
    events,
  }
}
