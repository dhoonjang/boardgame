import type { Server, Socket } from 'socket.io'
import type { GameAction } from '@duel/core'
import { SessionManager } from './session'
import { GameActionSchema } from './schemas/action'

export function registerSocketHandlers(io: Server, sessionManager: SessionManager): void {
  io.on('connection', (socket: Socket) => {
    console.log(`[Socket] 연결: ${socket.id}`)

    // ─── create-game ───
    socket.on('create-game', (data: { player: { id: string; name: string } }) => {
      const { player } = data

      if (!player?.id || !player?.name) {
        socket.emit('error', { message: '유효하지 않은 플레이어 정보입니다.' })
        return
      }

      const { gameId, gameState } = sessionManager.createGame(player.id, player.name, socket.id)
      socket.join(gameId)

      socket.emit('game-created', { gameId })

      const engine = sessionManager.getEngine()
      const view = engine.getPlayerView(gameState, player.id)
      socket.emit('game-state', { playerView: view })
      socket.emit('valid-actions', { actions: engine.getValidActions(gameState, player.id) })
    })

    // ─── join-game ───
    socket.on('join-game', (data: { gameId: string; player: { id: string; name: string } }) => {
      const { gameId, player } = data

      if (!gameId || !player?.id || !player?.name) {
        socket.emit('error', { message: '유효하지 않은 요청입니다.' })
        return
      }

      const gameState = sessionManager.joinGame(gameId, player.id, player.name, socket.id)
      if (!gameState) {
        socket.emit('error', { message: '게임에 참가할 수 없습니다.' })
        return
      }

      socket.join(gameId)

      const room = sessionManager.getRoom(gameId)!
      const engine = sessionManager.getEngine()

      // 양쪽에게 상태 전송
      for (const [playerId, socketId] of room.players) {
        const view = engine.getPlayerView(gameState, playerId)
        io.to(socketId).emit('game-state', { playerView: view })
        io.to(socketId).emit('valid-actions', { actions: engine.getValidActions(gameState, playerId) })

        // 상대 입장 알림
        if (socketId !== socket.id) {
          io.to(socketId).emit('opponent-joined', { opponentName: player.name })
        }
      }

      // 참가한 플레이어에게 상대 이름 알림
      const opponent = gameState.players.find(p => p.id !== player.id)
      if (opponent && opponent.id) {
        socket.emit('opponent-joined', { opponentName: opponent.name })
      }
    })

    // ─── game-action ───
    socket.on('game-action', (data: { action: GameAction }) => {
      const gameInfo = sessionManager.getGameBySocketId(socket.id)
      if (!gameInfo) {
        socket.emit('error', { message: '게임에 참여하지 않았습니다.' })
        return
      }

      const { gameId, room } = gameInfo

      // 액션 검증
      const parseResult = GameActionSchema.safeParse(data.action)
      if (!parseResult.success) {
        socket.emit('error', { message: '유효하지 않은 액션입니다.' })
        return
      }

      const action = parseResult.data as GameAction
      const playerId = sessionManager.getPlayerIdBySocketId(socket.id)
      if (!playerId) {
        socket.emit('error', { message: '플레이어 정보를 찾을 수 없습니다.' })
        return
      }

      const engine = sessionManager.getEngine()
      const result = engine.executeAction(room.gameState, action, playerId)

      // 결과를 요청한 소켓에 전송
      socket.emit('action-result', {
        success: result.success,
        message: result.message,
        events: result.events,
      })

      if (!result.success) return

      // 게임 상태 업데이트
      sessionManager.updateGame(gameId, result.newState)

      // 양쪽에게 각각의 PlayerView 전송
      for (const [pid, socketId] of room.players) {
        const view = engine.getPlayerView(result.newState, pid)
        io.to(socketId).emit('game-state', { playerView: view })
        io.to(socketId).emit('valid-actions', { actions: engine.getValidActions(result.newState, pid) })
      }
    })

    // ─── leave-game ───
    socket.on('leave-game', () => {
      handleDisconnect(socket, io, sessionManager)
    })

    // ─── disconnect ───
    socket.on('disconnect', () => {
      console.log(`[Socket] 연결 해제: ${socket.id}`)
      handleDisconnect(socket, io, sessionManager)
    })
  })
}

function handleDisconnect(socket: Socket, io: Server, sessionManager: SessionManager): void {
  const removed = sessionManager.removePlayer(socket.id)
  if (!removed) return

  const { gameId } = removed

  const room = sessionManager.getRoom(gameId)
  if (room) {
    // 남은 플레이어에게 상대 퇴장 알림
    for (const [, socketId] of room.players) {
      io.to(socketId).emit('opponent-left')
    }
  }

  socket.leave(gameId)
}
