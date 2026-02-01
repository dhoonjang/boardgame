import { GameEngine, type GameState, type CreateGameOptions } from '@forgod/core'

export interface GameSummary {
  gameId: string
  playerCount: number
  roundNumber: number
  createdAt: Date
}

interface StoredGame {
  gameState: GameState
  createdAt: Date
}

/**
 * 게임 세션 관리자
 * 인메모리로 게임 상태를 저장하고 관리합니다.
 */
export class SessionManager {
  private games: Map<string, StoredGame> = new Map()
  private engine: GameEngine

  constructor() {
    this.engine = new GameEngine()
  }

  /**
   * 새 게임을 생성합니다.
   */
  createGame(players: CreateGameOptions['players']): { gameId: string; gameState: GameState } {
    const gameState = this.engine.createGame({ players })
    const gameId = this.generateGameId()

    this.games.set(gameId, {
      gameState,
      createdAt: new Date(),
    })

    return { gameId, gameState }
  }

  /**
   * 게임 ID로 게임 상태를 조회합니다.
   */
  getGame(gameId: string): GameState | null {
    const stored = this.games.get(gameId)
    return stored?.gameState ?? null
  }

  /**
   * 게임 상태를 업데이트합니다.
   */
  updateGame(gameId: string, gameState: GameState): boolean {
    const stored = this.games.get(gameId)
    if (!stored) {
      return false
    }

    this.games.set(gameId, {
      ...stored,
      gameState,
    })

    return true
  }

  /**
   * 게임을 삭제합니다.
   */
  deleteGame(gameId: string): boolean {
    return this.games.delete(gameId)
  }

  /**
   * 모든 게임 목록을 조회합니다.
   */
  listGames(): GameSummary[] {
    const summaries: GameSummary[] = []

    for (const [gameId, stored] of this.games) {
      summaries.push({
        gameId,
        playerCount: stored.gameState.players.length,
        roundNumber: stored.gameState.roundNumber,
        createdAt: stored.createdAt,
      })
    }

    return summaries
  }

  /**
   * GameEngine 인스턴스를 반환합니다.
   * 액션 실행 등에 사용됩니다.
   */
  getEngine(): GameEngine {
    return this.engine
  }

  /**
   * 고유한 게임 ID를 생성합니다.
   */
  private generateGameId(): string {
    // 6자리 영숫자 ID 생성
    const chars = 'abcdefghijklmnopqrstuvwxyz0123456789'
    let id = ''
    for (let i = 0; i < 6; i++) {
      id += chars[Math.floor(Math.random() * chars.length)]
    }
    // 중복 방지
    if (this.games.has(id)) {
      return this.generateGameId()
    }
    return id
  }
}
