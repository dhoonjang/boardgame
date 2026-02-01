import { describe, it, expect, beforeEach } from 'vitest'
import { SessionManager } from '../session'

describe('SessionManager', () => {
  let sessionManager: SessionManager

  beforeEach(() => {
    sessionManager = new SessionManager()
  })

  const mockPlayers = [
    { id: 'p1', name: 'Player 1', heroClass: 'warrior' as const },
    { id: 'p2', name: 'Player 2', heroClass: 'rogue' as const },
    { id: 'p3', name: 'Player 3', heroClass: 'mage' as const },
  ]

  describe('createGame', () => {
    it('게임을 생성하고 gameId와 gameState를 반환한다', () => {
      const result = sessionManager.createGame(mockPlayers)

      expect(result.gameId).toBeDefined()
      expect(typeof result.gameId).toBe('string')
      expect(result.gameId.length).toBeGreaterThan(0)
      expect(result.gameState).toBeDefined()
      expect(result.gameState.players).toHaveLength(3)
    })

    it('생성된 게임을 내부에 저장한다', () => {
      const result = sessionManager.createGame(mockPlayers)
      const retrieved = sessionManager.getGame(result.gameId)

      expect(retrieved).not.toBeNull()
      expect(retrieved?.id).toBe(result.gameState.id)
    })
  })

  describe('getGame', () => {
    it('게임 ID로 게임 상태를 조회한다', () => {
      const created = sessionManager.createGame(mockPlayers)
      const retrieved = sessionManager.getGame(created.gameId)

      expect(retrieved).not.toBeNull()
      expect(retrieved?.players).toHaveLength(3)
    })

    it('존재하지 않는 게임 조회 시 null 반환', () => {
      const retrieved = sessionManager.getGame('nonexistent-id')

      expect(retrieved).toBeNull()
    })
  })

  describe('updateGame', () => {
    it('게임 상태를 업데이트한다', () => {
      const created = sessionManager.createGame(mockPlayers)
      const originalState = sessionManager.getGame(created.gameId)!

      const updatedState = {
        ...originalState,
        roundNumber: 5,
      }

      sessionManager.updateGame(created.gameId, updatedState)
      const retrieved = sessionManager.getGame(created.gameId)

      expect(retrieved?.roundNumber).toBe(5)
    })

    it('존재하지 않는 게임 업데이트 시 false 반환', () => {
      const mockState = { id: 'fake' } as any
      const result = sessionManager.updateGame('nonexistent-id', mockState)

      expect(result).toBe(false)
    })
  })

  describe('deleteGame', () => {
    it('게임을 삭제하고 true 반환', () => {
      const created = sessionManager.createGame(mockPlayers)
      const result = sessionManager.deleteGame(created.gameId)

      expect(result).toBe(true)
      expect(sessionManager.getGame(created.gameId)).toBeNull()
    })

    it('존재하지 않는 게임 삭제 시 false 반환', () => {
      const result = sessionManager.deleteGame('nonexistent-id')

      expect(result).toBe(false)
    })
  })

  describe('listGames', () => {
    it('모든 게임 목록을 조회한다', () => {
      sessionManager.createGame(mockPlayers)
      sessionManager.createGame(mockPlayers)

      const list = sessionManager.listGames()

      expect(list).toHaveLength(2)
      expect(list[0]).toHaveProperty('gameId')
      expect(list[0]).toHaveProperty('playerCount')
      expect(list[0]).toHaveProperty('roundNumber')
    })

    it('빈 목록을 반환할 수 있다', () => {
      const list = sessionManager.listGames()

      expect(list).toHaveLength(0)
    })

    it('삭제된 게임은 목록에 포함되지 않는다', () => {
      const game1 = sessionManager.createGame(mockPlayers)
      sessionManager.createGame(mockPlayers)

      sessionManager.deleteGame(game1.gameId)
      const list = sessionManager.listGames()

      expect(list).toHaveLength(1)
    })
  })
})
