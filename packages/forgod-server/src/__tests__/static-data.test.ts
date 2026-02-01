import { describe, it, expect } from 'vitest'
import { app } from '../api'

describe('Static Data API', () => {
  describe('GET /api/skills', () => {
    it('모든 스킬 목록을 반환한다 (15개)', async () => {
      const res = await app.request('/api/skills')

      expect(res.status).toBe(200)

      const json = await res.json()
      expect(json.skills).toHaveLength(15)
    })

    it('heroClass 쿼리로 필터링 가능하다', async () => {
      const res = await app.request('/api/skills?heroClass=warrior')

      expect(res.status).toBe(200)

      const json = await res.json()
      expect(json.skills).toHaveLength(5)
      expect(json.skills.every((s: { heroClass: string }) => s.heroClass === 'warrior')).toBe(true)
    })

    it('잘못된 heroClass면 400 반환', async () => {
      const res = await app.request('/api/skills?heroClass=invalid')

      expect(res.status).toBe(400)
    })
  })

  describe('GET /api/monsters', () => {
    it('모든 몬스터 정의를 반환한다 (7개)', async () => {
      const res = await app.request('/api/monsters')

      expect(res.status).toBe(200)

      const json = await res.json()
      expect(json.monsters).toHaveLength(7)
    })

    it('각 몬스터에 필수 필드가 포함된다', async () => {
      const res = await app.request('/api/monsters')
      const json = await res.json()

      const monster = json.monsters[0]
      expect(monster).toHaveProperty('id')
      expect(monster).toHaveProperty('name')
      expect(monster).toHaveProperty('nameKo')
      expect(monster).toHaveProperty('position')
      expect(monster).toHaveProperty('maxHealth')
      expect(monster).toHaveProperty('diceIndices')
      expect(monster).toHaveProperty('drops')
      expect(monster).toHaveProperty('adjacentTiles')
      expect(monster).toHaveProperty('description')
    })
  })

  describe('GET /api/revelations', () => {
    it('모든 계시 정의를 반환한다 (19개)', async () => {
      const res = await app.request('/api/revelations')

      expect(res.status).toBe(200)

      const json = await res.json()
      expect(json.revelations).toHaveLength(19)
    })

    it('source 쿼리로 필터링 가능하다', async () => {
      const res = await app.request('/api/revelations?source=angel')

      expect(res.status).toBe(200)

      const json = await res.json()
      expect(json.revelations.length).toBeGreaterThan(0)
      expect(json.revelations.every((r: { source: string }) => r.source === 'angel')).toBe(true)
    })

    it('잘못된 source면 400 반환', async () => {
      const res = await app.request('/api/revelations?source=invalid')

      expect(res.status).toBe(400)
    })
  })
})
