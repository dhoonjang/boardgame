import type { GameState, ActionResult, GameEvent } from './types'

/**
 * 교체 (Swap): 현재 카드를 버리고 덱에서 새 카드 뽑기
 */
export function executeSwap(state: GameState, playerId: string): ActionResult {
  const playerIndex = state.players.findIndex(p => p.id === playerId)
  if (playerIndex === -1) {
    return { success: false, newState: state, message: '플레이어를 찾을 수 없습니다.', events: [] }
  }

  const player = state.players[playerIndex]

  if (player.swapCount <= 0) {
    return { success: false, newState: state, message: '교체 횟수를 모두 소진했습니다.', events: [] }
  }

  if (player.card === null) {
    return { success: false, newState: state, message: '교체할 카드가 없습니다.', events: [] }
  }

  if (state.deck.length === 0) {
    return { success: false, newState: state, message: '덱에 남은 카드가 없습니다.', events: [] }
  }

  const newDeck = [...state.deck]
  const newCard = newDeck.shift()!
  const newDiscardPile = [...state.discardPile, player.card]

  const newPlayers = [...state.players] as [typeof state.players[0], typeof state.players[1]]
  newPlayers[playerIndex] = {
    ...player,
    card: newCard,
    swapCount: player.swapCount - 1,
    hasUsedAbility: true,
  }

  const events: GameEvent[] = [{
    type: 'SWAP',
    playerId,
    message: `${player.name}이(가) 카드를 교체했습니다.`,
  }]

  return {
    success: true,
    newState: {
      ...state,
      players: newPlayers,
      deck: newDeck,
      discardPile: newDiscardPile,
    },
    message: '카드를 교체했습니다.',
    events,
  }
}
