import { GameEngine, type GameState } from './game'

export interface GameRoom {
  gameState: GameState
  players: Map<string, string>  // playerId → socketId
  createdAt: Date
}

export interface GameSummary {
  gameId: string
  playerCount: number
  phase: string
  roundNumber: number
  createdAt: Date
}

export class SessionManager {
  private games: Map<string, GameRoom> = new Map()
  private engine: GameEngine
  private socketToGame: Map<string, string> = new Map()  // socketId → gameId
  private aiGames: Set<string> = new Set()  // AI 게임인 gameId

  constructor() {
    this.engine = new GameEngine()
  }

  createGame(playerId: string, playerName: string, socketId: string): { gameId: string; gameState: GameState } {
    const gameState = this.engine.createGame({ id: playerId, name: playerName })
    const gameId = this.generateGameId()

    const players = new Map<string, string>()
    players.set(playerId, socketId)

    this.games.set(gameId, {
      gameState,
      players,
      createdAt: new Date(),
    })

    this.socketToGame.set(socketId, gameId)

    return { gameId, gameState }
  }

  joinGame(gameId: string, playerId: string, playerName: string, socketId: string): GameState | null {
    const room = this.games.get(gameId)
    if (!room) return null

    // 이미 2명이면 참가 불가
    if (room.players.size >= 2) return null

    const gameState = this.engine.joinGame(room.gameState, { id: playerId, name: playerName })

    room.gameState = gameState
    room.players.set(playerId, socketId)
    this.socketToGame.set(socketId, gameId)

    return gameState
  }

  getRoom(gameId: string): GameRoom | null {
    return this.games.get(gameId) ?? null
  }

  getGameBySocketId(socketId: string): { gameId: string; room: GameRoom } | null {
    const gameId = this.socketToGame.get(socketId)
    if (!gameId) return null
    const room = this.games.get(gameId)
    if (!room) return null
    return { gameId, room }
  }

  getPlayerIdBySocketId(socketId: string): string | null {
    const result = this.getGameBySocketId(socketId)
    if (!result) return null

    for (const [playerId, sid] of result.room.players) {
      if (sid === socketId) return playerId
    }
    return null
  }

  updateGame(gameId: string, gameState: GameState): boolean {
    const room = this.games.get(gameId)
    if (!room) return false
    room.gameState = gameState
    return true
  }

  removePlayer(socketId: string): { gameId: string; playerId: string } | null {
    const gameId = this.socketToGame.get(socketId)
    if (!gameId) return null

    const room = this.games.get(gameId)
    if (!room) return null

    let removedPlayerId: string | null = null
    for (const [playerId, sid] of room.players) {
      if (sid === socketId) {
        removedPlayerId = playerId
        room.players.delete(playerId)
        break
      }
    }

    this.socketToGame.delete(socketId)

    // 방에 아무도 없으면 삭제
    if (room.players.size === 0) {
      this.games.delete(gameId)
    }

    return removedPlayerId ? { gameId, playerId: removedPlayerId } : null
  }

  listGames(): GameSummary[] {
    const summaries: GameSummary[] = []
    for (const [gameId, room] of this.games) {
      summaries.push({
        gameId,
        playerCount: room.players.size,
        phase: room.gameState.phase,
        roundNumber: room.gameState.roundNumber,
        createdAt: room.createdAt,
      })
    }
    return summaries
  }

  isAIGame(gameId: string): boolean {
    return this.aiGames.has(gameId)
  }

  markAsAIGame(gameId: string): void {
    this.aiGames.add(gameId)
  }

  removeGame(gameId: string): void {
    this.games.delete(gameId)
    this.aiGames.delete(gameId)
  }

  getEngine(): GameEngine {
    return this.engine
  }

  private generateGameId(): string {
    const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789' // 혼동되는 문자 제외
    let id = ''
    for (let i = 0; i < 4; i++) {
      id += chars[Math.floor(Math.random() * chars.length)]
    }
    if (this.games.has(id)) {
      return this.generateGameId()
    }
    return id
  }
}
