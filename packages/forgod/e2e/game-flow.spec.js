import { expect, test } from '@playwright/test'

test.describe('forgod local game flow', () => {
  test('home -> new game(local) -> game screen', async ({ page }) => {
    await page.goto('/')

    await expect(page.getByRole('heading', { name: 'For God' })).toBeVisible()
    await page.getByRole('button', { name: '로컬 플레이' }).click()

    await expect(page).toHaveURL(/\/game\/new\?mode=local/)
    await expect(page.getByRole('heading', { name: '새 게임 만들기' })).toBeVisible()

    await page.getByRole('button', { name: '게임 시작' }).click()

    await expect(page).toHaveURL(/\/game\/.+/)
    await expect(page.getByText('행동')).toBeVisible()
    await expect(page.getByText('이동 페이즈')).toBeVisible()
  })

  test('can roll move dice and switch to action phase', async ({ page }) => {
    await page.goto('/game/new?mode=local')
    await page.getByRole('button', { name: '게임 시작' }).click()
    await expect(page).toHaveURL(/\/game\/.+/)

    await page.getByRole('button', { name: /이동 주사위를 굴립니다/ }).click()
    await expect(page.getByText(/총 이동력/)).toBeVisible()

    await page.getByRole('button', { name: /행동 단계로 넘어갑니다/ }).click()
    await expect(page.getByText('행동 페이즈')).toBeVisible()
    await expect(page.getByText(/스킬 비용/)).toBeVisible()
  })
})
