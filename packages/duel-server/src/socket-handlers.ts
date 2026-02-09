import type { Server, Socket } from 'socket.io'
import type { GameAction } from './game'
import { SessionManager } from './session'
import { GameActionSchema } from './schemas/action'
import { AIPlayer, AI_PLAYER_ID } from './ai/player'

// gameId → AIPlayer 매핑
const aiPlayers = new Map<string, AIPlayer>()

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

    // ─── create-ai-game ───
    socket.on('create-ai-game', (data: { player: { id: string; name: string }; personalityName?: string }) => {
      const { player, personalityName } = data

      if (!player?.id || !player?.name) {
        socket.emit('error', { message: '유효하지 않은 플레이어 정보입니다.' })
        return
      }

      // 1. 게임 생성
      const { gameId, gameState } = sessionManager.createGame(player.id, player.name, socket.id)
      socket.join(gameId)
      sessionManager.markAsAIGame(gameId)

      socket.emit('game-created', { gameId })

      // 2. AI 플레이어 생성 및 참가
      const aiPlayer = new AIPlayer(gameId, io, socket.id, sessionManager, personalityName)
      aiPlayers.set(gameId, aiPlayer)

      // AI를 게임에 참가 (socketId 없이 직접 상태 업데이트)
      const joinedState = sessionManager.getEngine().joinGame(gameState, {
        id: AI_PLAYER_ID,
        name: aiPlayer.name,
      })
      sessionManager.updateGame(gameId, joinedState)

      // 3. human에게 상태 전송
      const engine = sessionManager.getEngine()
      const view = engine.getPlayerView(joinedState, player.id)
      socket.emit('game-state', { playerView: view })
      socket.emit('valid-actions', { actions: engine.getValidActions(joinedState, player.id) })
      socket.emit('opponent-joined', { opponentName: aiPlayer.name })

      console.log(`[AI Game] 게임 ${gameId} 생성 — AI 성격: ${aiPlayer.name}`)
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

      const isAI = sessionManager.isAIGame(gameId)

      // 양쪽에게 각각의 PlayerView 전송 (AI 소켓은 건너뜀)
      for (const [pid, socketId] of room.players) {
        const view = engine.getPlayerView(result.newState, pid)
        io.to(socketId).emit('game-state', { playerView: view })
        io.to(socketId).emit('valid-actions', { actions: engine.getValidActions(result.newState, pid) })
      }

      // AI 게임이면 AI에게 통보
      if (isAI) {
        const aiPlayer = aiPlayers.get(gameId)
        if (aiPlayer) {
          const humanActionStr = action.type === 'RAISE'
            ? `RAISE ${(action as any).amount}`
            : action.type

          aiPlayer.onStateChanged(result.newState, humanActionStr)
        }
      }
    })

    // ─── player-chat ───
    socket.on('player-chat', (data: { message: string }) => {
      const gameInfo = sessionManager.getGameBySocketId(socket.id)
      if (!gameInfo || !sessionManager.isAIGame(gameInfo.gameId)) return

      const aiPlayer = aiPlayers.get(gameInfo.gameId)
      if (aiPlayer) {
        aiPlayer.handlePlayerChat(data.message)
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

  // AI 게임이면 AI 정리 및 방 전체 삭제
  if (sessionManager.isAIGame(gameId)) {
    const aiPlayer = aiPlayers.get(gameId)
    if (aiPlayer) {
      aiPlayer.dispose()
      aiPlayers.delete(gameId)
    }
    sessionManager.removeGame(gameId)
    socket.leave(gameId)
    return
  }

  const room = sessionManager.getRoom(gameId)
  if (room) {
    // 남은 플레이어에게 상대 퇴장 알림
    for (const [, socketId] of room.players) {
      io.to(socketId).emit('opponent-left')
    }
  }

  socket.leave(gameId)
}
