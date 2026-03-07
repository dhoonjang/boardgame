import { test, expect } from '@playwright/test'

function chipNumber(raw: string): number {
  const match = raw.match(/(\d+)/)
  if (!match) throw new Error(`칩 숫자를 찾을 수 없습니다: ${raw}`)
  return Number(match[1])
}

test('AI 게임 결과 연출 순서: 말풍선 → 결과 모달 → 칩 반영', async ({ page }) => {
  await page.goto('/')
  await expect(page.getByText('서버 연결됨')).toBeVisible()

  await page.getByRole('button', { name: 'AI 대전' }).click()
  await page.getByPlaceholder('이름 입력').fill('E2EPlayer')
  await page.getByRole('button', { name: 'AI와 대결 시작' }).click()

  await expect(page).toHaveURL(/\/game\/[A-Z0-9]{4}$/)
  await page.getByRole('button', { name: '게임 시작!' }).click()
  await expect(page.getByText('베팅 단계')).toBeVisible()

  const beforeOpponentChipsText = await page.getByTestId('opponent-chips').innerText()
  const beforeOpponentChips = chipNumber(beforeOpponentChipsText)

  const bubbleLocator = page.getByTestId('speech-bubble-ai')
  const bubbleCountBefore = await bubbleLocator.count()

  await page.getByRole('button', { name: '폴드' }).click()

  await expect(bubbleLocator).toHaveCount(bubbleCountBefore + 1)
  const bubbleAppearedAt = Date.now()

  await expect(page.getByTestId('round-result-modal')).toBeVisible()
  const modalAppearedAt = Date.now()

  expect(bubbleAppearedAt).toBeLessThanOrEqual(modalAppearedAt)

  const chipsDuringModal = chipNumber(await page.getByTestId('opponent-chips').innerText())
  expect(chipsDuringModal).toBe(beforeOpponentChips)

  await page.getByTestId('round-result-confirm').click()

  await expect(page.getByTestId('opponent-chips')).not.toHaveText(beforeOpponentChipsText)
})
