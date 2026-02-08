import { describe, it, expect, beforeEach } from 'vitest'
import { SessionManager } from '../session'

describe('SessionManager', () => {
  let sm: SessionManager

  beforeEach(() => {
    sm = new SessionManager()
  })

  describe('createGame', () => {
    it('게임 생성 후 gameId 반환', () => {
      const { gameId, gameState } = sm.createGame('p1', 'Player1', 'socket-1')

      expect(gameId).toBeTruthy()
      expect(gameId.length).toBe(4)
      expect(gameState.players[0].id).toBe('p1')
      expect(gameState.phase).toBe('waiting')
    })

    it('소켓-게임 매핑 저장', () => {
      sm.createGame('p1', 'Player1', 'socket-1')

      const result = sm.getGameBySocketId('socket-1')
      expect(result).not.toBeNull()
      expect(result!.room.gameState.players[0].id).toBe('p1')
    })
  })

  describe('joinGame', () => {
    it('두 번째 플레이어 참가', () => {
      const { gameId } = sm.createGame('p1', 'Player1', 'socket-1')

      const gameState = sm.joinGame(gameId, 'p2', 'Player2', 'socket-2')
      expect(gameState).not.toBeNull()
      expect(gameState!.players[1].id).toBe('p2')
    })

    it('존재하지 않는 게임 참가 실패', () => {
      const result = sm.joinGame('XXXX', 'p2', 'Player2', 'socket-2')
      expect(result).toBeNull()
    })

    it('이미 2명인 게임 참가 불가', () => {
      const { gameId } = sm.createGame('p1', 'Player1', 'socket-1')
      sm.joinGame(gameId, 'p2', 'Player2', 'socket-2')

      const result = sm.joinGame(gameId, 'p3', 'Player3', 'socket-3')
      expect(result).toBeNull()
    })
  })

  describe('removePlayer', () => {
    it('플레이어 제거', () => {
      const { gameId } = sm.createGame('p1', 'Player1', 'socket-1')
      sm.joinGame(gameId, 'p2', 'Player2', 'socket-2')

      const removed = sm.removePlayer('socket-1')
      expect(removed).not.toBeNull()
      expect(removed!.playerId).toBe('p1')
    })

    it('마지막 플레이어 제거 시 방 삭제', () => {
      const { gameId } = sm.createGame('p1', 'Player1', 'socket-1')
      sm.removePlayer('socket-1')

      const room = sm.getRoom(gameId)
      expect(room).toBeNull()
    })
  })

  describe('listGames', () => {
    it('게임 목록 조회', () => {
      sm.createGame('p1', 'Player1', 'socket-1')
      sm.createGame('p2', 'Player2', 'socket-2')

      const list = sm.listGames()
      expect(list).toHaveLength(2)
    })
  })

  describe('getPlayerIdBySocketId', () => {
    it('소켓 ID로 플레이어 ID 조회', () => {
      sm.createGame('p1', 'Player1', 'socket-1')
      expect(sm.getPlayerIdBySocketId('socket-1')).toBe('p1')
    })

    it('없는 소켓 ID면 null', () => {
      expect(sm.getPlayerIdBySocketId('unknown')).toBeNull()
    })
  })
})
