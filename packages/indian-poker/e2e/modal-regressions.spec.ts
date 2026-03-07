import { test, expect, type Page } from '@playwright/test'

type TestWindow = Window & {
  __ipTest?: {
    setStore: (partial: Record<string, unknown>) => void
    getStore: () => Record<string, unknown>
  }
}

async function seedGamePage(page: Page, partial: Record<string, unknown>) {
  await page.goto('/')
  await page.waitForFunction(() => !!(window as TestWindow).__ipTest)

  await page.evaluate((state) => {
    const api = (window as TestWindow).__ipTest
    if (!api) throw new Error('__ipTest is not available')
    api.setStore(state)
  }, partial)
}

async function moveToGameRoute(page: Page, gameId: string) {
  await page.evaluate((id) => {
    window.history.pushState({}, '', `/game/${id}`)
    window.dispatchEvent(new PopStateEvent('popstate'))
  }, gameId)
  await expect(page).toHaveURL(new RegExp(`/game/${gameId}$`))
}

function bettingView() {
  return {
    gameId: 'TST1',
    phase: 'betting',
    roundNumber: 3,
    maxRounds: 0,
    pot: 8,
    currentPlayerIndex: 1,
    firstPlayerIndex: 0,
    myIndex: 0,
    opponentCard: 6,
    me: { id: 'p1', name: 'Me', chips: 14, currentBet: 4, hasFolded: false },
    opponent: { id: 'ai-player', name: 'AI', chips: 13, currentBet: 4, hasFolded: false },
    deckRemaining: 10,
    isNewDeck: false,
    winner: null,
    isDraw: false,
    roundHistory: [],
  }
}

test('defer 상태에서 show-game-over가 와도 종료 모달이 열린다', async ({ page }) => {
  const deferredGameOver = {
    ...bettingView(),
    phase: 'game_over',
    me: { id: 'p1', name: 'Me', chips: 0, currentBet: 4, hasFolded: true },
    opponent: { id: 'ai-player', name: 'AI', chips: 27, currentBet: 4, hasFolded: false },
    winner: 'ai-player',
    roundHistory: [{
      roundNumber: 3,
      player0Card: 10,
      player1Card: 6,
      winner: 'ai-player',
      potWon: 8,
      foldedPlayerId: 'p1',
      player0ChipChange: -9,
      player1ChipChange: 9,
    }],
  }

  await seedGamePage(page, {
    playerId: 'p1',
    playerName: 'Me',
    gameId: 'TST1',
    isAIGame: true,
    aiCharacterId: 'kim-jongyoun',
    playerView: bettingView(),
    validActions: [],
    deferredPlayerView: deferredGameOver,
    deferredValidActions: [],
    queuedPlayerView: null,
    queuedValidActions: null,
    pendingGameOver: true,
    pendingRoundResult: null,
  })

  await moveToGameRoute(page, 'TST1')

  await expect(page.getByTestId('game-over-modal')).toBeVisible()
  await expect(page.getByText('패배...')).toBeVisible()
})

test('같은 라운드 결과는 중복 모달로 다시 뜨지 않는다', async ({ page }) => {
  const view = {
    ...bettingView(),
    phase: 'round_end',
  }

  const round1 = {
    roundNumber: 1,
    player0Card: 8,
    player1Card: 3,
    winner: 'p1',
    potWon: 4,
    foldedPlayerId: null,
    player0ChipChange: 2,
    player1ChipChange: -2,
  }

  await seedGamePage(page, {
    playerId: 'p1',
    playerName: 'Me',
    gameId: 'TST1',
    isAIGame: true,
    aiCharacterId: 'kim-jongyoun',
    playerView: { ...view, roundHistory: [round1] },
    validActions: [{ type: 'START_ROUND', description: '다음 라운드 시작' }],
    pendingRoundResult: round1,
    pendingGameOver: false,
  })

  await moveToGameRoute(page, 'TST1')

  await expect(page.getByTestId('round-result-modal')).toBeVisible()
  await page.getByTestId('round-result-confirm').click()
  await expect(page.getByTestId('round-result-modal')).toHaveCount(0)

  await page.evaluate((roundResult) => {
    const api = (window as TestWindow).__ipTest
    if (!api) throw new Error('__ipTest is not available')
    api.setStore({ pendingRoundResult: roundResult })
  }, round1)

  await page.waitForTimeout(500)
  await expect(page.getByTestId('round-result-modal')).toHaveCount(0)
})
