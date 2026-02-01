import { describe, it, expect, beforeEach } from 'vitest'
import { app, sessionManager, resetSessionManager } from '../api'

describe('API Endpoints', () => {
  beforeEach(() => {
    resetSessionManager()
  })

  const mockPlayers = [
    { id: 'p1', name: 'Player 1', heroClass: 'warrior' as const },
    { id: 'p2', name: 'Player 2', heroClass: 'rogue' as const },
    { id: 'p3', name: 'Player 3', heroClass: 'mage' as const },
  ]

  describe('POST /api/games', () => {
    it('게임을 생성하고 gameId와 gameState를 반환한다', async () => {
      const res = await app.request('/api/games', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ players: mockPlayers }),
      })

      expect(res.status).toBe(201)

      const json = await res.json()
      expect(json.gameId).toBeDefined()
      expect(json.gameState).toBeDefined()
      expect(json.gameState.players).toHaveLength(3)
    })

    it('플레이어가 3명 미만이면 400 에러', async () => {
      const res = await app.request('/api/games', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          players: [
            { id: 'p1', name: 'Player 1', heroClass: 'warrior' },
            { id: 'p2', name: 'Player 2', heroClass: 'rogue' },
          ],
        }),
      })

      expect(res.status).toBe(400)

      const json = await res.json()
      expect(json.error).toBeDefined()
    })

    it('플레이어가 6명 초과면 400 에러', async () => {
      const res = await app.request('/api/games', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          players: Array.from({ length: 7 }, (_, i) => ({
            id: `p${i + 1}`,
            name: `Player ${i + 1}`,
            heroClass: 'warrior',
          })),
        }),
      })

      expect(res.status).toBe(400)
    })
  })

  describe('GET /api/games', () => {
    it('게임 목록을 반환한다', async () => {
      // 게임 2개 생성
      await app.request('/api/games', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ players: mockPlayers }),
      })
      await app.request('/api/games', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ players: mockPlayers }),
      })

      const res = await app.request('/api/games')

      expect(res.status).toBe(200)

      const json = await res.json()
      expect(json.games).toHaveLength(2)
      expect(json.games[0]).toHaveProperty('gameId')
      expect(json.games[0]).toHaveProperty('playerCount')
      expect(json.games[0]).toHaveProperty('roundNumber')
    })

    it('빈 목록을 반환할 수 있다', async () => {
      const res = await app.request('/api/games')

      expect(res.status).toBe(200)

      const json = await res.json()
      expect(json.games).toHaveLength(0)
    })
  })

  describe('GET /api/games/:gameId', () => {
    it('게임 상태를 반환한다', async () => {
      // 게임 생성
      const createRes = await app.request('/api/games', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ players: mockPlayers }),
      })
      const { gameId } = await createRes.json()

      const res = await app.request(`/api/games/${gameId}`)

      expect(res.status).toBe(200)

      const json = await res.json()
      expect(json.gameState).toBeDefined()
      expect(json.gameState.players).toHaveLength(3)
    })

    it('존재하지 않는 게임이면 404 에러', async () => {
      const res = await app.request('/api/games/nonexistent')

      expect(res.status).toBe(404)

      const json = await res.json()
      expect(json.error).toBeDefined()
    })
  })

  describe('DELETE /api/games/:gameId', () => {
    it('게임을 삭제한다', async () => {
      // 게임 생성
      const createRes = await app.request('/api/games', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ players: mockPlayers }),
      })
      const { gameId } = await createRes.json()

      const res = await app.request(`/api/games/${gameId}`, {
        method: 'DELETE',
      })

      expect(res.status).toBe(200)

      // 삭제 후 조회하면 404
      const getRes = await app.request(`/api/games/${gameId}`)
      expect(getRes.status).toBe(404)
    })

    it('존재하지 않는 게임 삭제 시 404', async () => {
      const res = await app.request('/api/games/nonexistent', {
        method: 'DELETE',
      })

      expect(res.status).toBe(404)
    })
  })

  describe('POST /api/games/:gameId/actions', () => {
    it('액션을 실행하고 새 상태를 반환한다', async () => {
      // 게임 생성
      const createRes = await app.request('/api/games', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ players: mockPlayers }),
      })
      const { gameId } = await createRes.json()

      // 이동 주사위 굴리기
      const res = await app.request(`/api/games/${gameId}/actions`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ type: 'ROLL_MOVE_DICE' }),
      })

      expect(res.status).toBe(200)

      const json = await res.json()
      expect(json.success).toBe(true)
      expect(json.gameState).toBeDefined()
      expect(json.message).toBeDefined()
    })

    it('존재하지 않는 게임이면 404 에러', async () => {
      const res = await app.request('/api/games/nonexistent/actions', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ type: 'ROLL_MOVE_DICE' }),
      })

      expect(res.status).toBe(404)
    })

    it('유효하지 않은 액션 스키마이면 400 에러', async () => {
      // 게임 생성
      const createRes = await app.request('/api/games', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ players: mockPlayers }),
      })
      const { gameId } = await createRes.json()

      const res = await app.request(`/api/games/${gameId}/actions`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ type: 'INVALID_ACTION' }),
      })

      expect(res.status).toBe(400)
    })
  })

  describe('GET /api/games/:gameId/valid-actions', () => {
    it('현재 가능한 액션 목록을 반환한다', async () => {
      // 게임 생성
      const createRes = await app.request('/api/games', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ players: mockPlayers }),
      })
      const { gameId } = await createRes.json()

      const res = await app.request(`/api/games/${gameId}/valid-actions`)

      expect(res.status).toBe(200)

      const json = await res.json()
      expect(json.validActions).toBeDefined()
      expect(Array.isArray(json.validActions)).toBe(true)
      expect(json.currentPlayerId).toBeDefined()
      expect(json.turnPhase).toBeDefined()
    })

    it('존재하지 않는 게임이면 404 에러', async () => {
      const res = await app.request('/api/games/nonexistent/valid-actions')

      expect(res.status).toBe(404)
    })

    it('새 게임은 ROLL_MOVE_DICE가 가능해야 함', async () => {
      // 게임 생성
      const createRes = await app.request('/api/games', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ players: mockPlayers }),
      })
      const { gameId } = await createRes.json()

      const res = await app.request(`/api/games/${gameId}/valid-actions`)
      const json = await res.json()

      const rollMoveAction = json.validActions.find(
        (va: { action: { type: string } }) => va.action.type === 'ROLL_MOVE_DICE'
      )
      expect(rollMoveAction).toBeDefined()
    })
  })

  describe('GET /api/games/:gameId/current-turn', () => {
    it('현재 턴 정보를 반환한다', async () => {
      // 게임 생성
      const createRes = await app.request('/api/games', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ players: mockPlayers }),
      })
      const { gameId } = await createRes.json()

      const res = await app.request(`/api/games/${gameId}/current-turn`)

      expect(res.status).toBe(200)

      const json = await res.json()
      expect(json.currentTurnEntry).toBeDefined()
      expect(json.roundNumber).toBeDefined()
      expect(json.currentTurnIndex).toBeDefined()
    })

    it('존재하지 않는 게임이면 404 에러', async () => {
      const res = await app.request('/api/games/nonexistent/current-turn')

      expect(res.status).toBe(404)
    })
  })

  describe('GET /api/games/:gameId/players', () => {
    it('모든 플레이어 목록을 반환한다', async () => {
      // 게임 생성
      const createRes = await app.request('/api/games', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ players: mockPlayers }),
      })
      const { gameId } = await createRes.json()

      const res = await app.request(`/api/games/${gameId}/players`)

      expect(res.status).toBe(200)

      const json = await res.json()
      expect(json.players).toHaveLength(3)
    })

    it('각 플레이어에 요약 정보가 포함된다', async () => {
      // 게임 생성
      const createRes = await app.request('/api/games', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ players: mockPlayers }),
      })
      const { gameId } = await createRes.json()

      const res = await app.request(`/api/games/${gameId}/players`)
      const json = await res.json()

      const player = json.players[0]
      expect(player).toHaveProperty('id')
      expect(player).toHaveProperty('name')
      expect(player).toHaveProperty('heroClass')
      expect(player).toHaveProperty('state')
      expect(player).toHaveProperty('health')
      expect(player).toHaveProperty('maxHealth')
      expect(player).toHaveProperty('position')
      expect(player).toHaveProperty('level')
      expect(player).toHaveProperty('isDead')
      expect(player).toHaveProperty('hasDemonSword')
    })

    it('존재하지 않는 게임이면 404 반환', async () => {
      const res = await app.request('/api/games/nonexistent/players')

      expect(res.status).toBe(404)
    })
  })

  describe('GET /api/games/:gameId/players/:playerId', () => {
    it('플레이어 상세 정보를 반환한다', async () => {
      // 게임 생성
      const createRes = await app.request('/api/games', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ players: mockPlayers }),
      })
      const { gameId } = await createRes.json()

      const res = await app.request(`/api/games/${gameId}/players/p1`)

      expect(res.status).toBe(200)

      const json = await res.json()
      expect(json.player).toBeDefined()
      expect(json.player.id).toBe('p1')
      expect(json.player.name).toBe('Player 1')
      expect(json.player.stats).toBeDefined()
    })

    it('존재하지 않는 게임이면 404 반환', async () => {
      const res = await app.request('/api/games/nonexistent/players/p1')

      expect(res.status).toBe(404)
    })

    it('존재하지 않는 플레이어면 404 반환', async () => {
      // 게임 생성
      const createRes = await app.request('/api/games', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ players: mockPlayers }),
      })
      const { gameId } = await createRes.json()

      const res = await app.request(`/api/games/${gameId}/players/nonexistent`)

      expect(res.status).toBe(404)
    })
  })
})
