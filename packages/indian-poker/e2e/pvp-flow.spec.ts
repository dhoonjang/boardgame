import { test, expect, type Page } from '@playwright/test'

async function createRoom(hostPage: Page, name: string): Promise<string> {
  await hostPage.goto('/')
  await expect(hostPage.getByText('서버 연결됨')).toBeVisible()

  await hostPage.getByRole('button', { name: '방 만들기' }).click()
  await hostPage.getByPlaceholder('이름 입력').fill(name)
  await hostPage.getByRole('button', { name: '게임 만들기' }).click()

  await expect(hostPage).toHaveURL(/\/lobby\/[A-Z0-9]{4}$/)
  const gameId = hostPage.url().split('/').pop()
  if (!gameId) {
    throw new Error('게임 코드 추출 실패')
  }
  return gameId
}

async function joinRoom(guestPage: Page, name: string, gameId: string): Promise<void> {
  await guestPage.goto('/')
  await expect(guestPage.getByText('서버 연결됨')).toBeVisible()

  await guestPage.getByRole('button', { name: '방 참가하기' }).click()
  await guestPage.getByPlaceholder('이름 입력').fill(name)
  await guestPage.getByPlaceholder('게임 코드 (4자리)').fill(gameId)
  await guestPage.getByRole('button', { name: '참가하기' }).click()
}

test('PvP 실제 플레이 플로우: 방 생성 → 참가 → 시작 → 첫 턴 행동', async ({ browser }) => {
  const hostContext = await browser.newContext()
  const guestContext = await browser.newContext()

  const hostPage = await hostContext.newPage()
  const guestPage = await guestContext.newPage()

  const gameId = await createRoom(hostPage, 'Alice')
  await joinRoom(guestPage, 'Bob', gameId)

  await Promise.all([
    expect(hostPage).toHaveURL(new RegExp(`/game/${gameId}$`)),
    expect(guestPage).toHaveURL(new RegExp(`/game/${gameId}$`)),
  ])

  await hostPage.getByRole('button', { name: '게임 시작!' }).click()
  await Promise.all([
    expect(hostPage.getByText('베팅 단계')).toBeVisible(),
    expect(guestPage.getByText('베팅 단계')).toBeVisible(),
  ])

  const hostCanFold = await hostPage.getByRole('button', { name: '폴드' }).isVisible().catch(() => false)
  const actingPage = hostCanFold ? hostPage : guestPage
  const waitingPage = hostCanFold ? guestPage : hostPage

  await expect(actingPage.getByRole('button', { name: /콜/ })).toHaveCount(0)
  await actingPage.getByRole('button', { name: '폴드' }).click()

  await Promise.all([
    expect(actingPage.getByRole('button', { name: '확인' })).toBeVisible(),
    expect(waitingPage.getByRole('button', { name: '확인' })).toBeVisible(),
  ])

  await actingPage.getByRole('button', { name: '확인' }).click()
  await waitingPage.getByRole('button', { name: '확인' }).click()

  await Promise.all([
    expect(hostPage.getByText(/^R2$/)).toBeVisible(),
    expect(guestPage.getByText(/^R2$/)).toBeVisible(),
  ])

  await hostContext.close()
  await guestContext.close()
})
