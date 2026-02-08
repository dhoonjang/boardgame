import { Hono } from 'hono'
import type { SessionManager } from './session'

export function createApi(sessionManager: SessionManager): Hono {
  const app = new Hono()

  // GET /health - 서버 상태
  app.get('/health', (c) => {
    return c.json({ status: 'ok', timestamp: new Date().toISOString() })
  })

  // GET /api/games - 활성 게임 목록
  app.get('/api/games', (c) => {
    const games = sessionManager.listGames()
    return c.json({ games })
  })

  return app
}
