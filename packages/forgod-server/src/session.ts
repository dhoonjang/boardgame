import { GameEngine, GameState, CreateGameOptions } from '@forgod/core'
import { saveGame, loadGame, listActiveGames, deleteGame as dbDeleteGame } from './database'

/**
 * 게임 세션 관리자
 *
 * 여러 게임 세션을 관리하고 게임 엔진과 상호작용합니다.
 * Supabase를 통해 게임 상태를 영구 저장합니다.
 */
export class SessionManager {
  private cache: Map<string, GameSession> = new Map()
  private engine: GameEngine

  constructor() {
    this.engine = new GameEngine()
  }

  /**
   * 새 게임 세션을 생성합니다.
   */
  async createSession(options: CreateGameOptions): Promise<GameSession> {
    const gameState = this.engine.createGame(options)
    const session: GameSession = {
      id: gameState.id,
      state: gameState,
      createdAt: new Date(),
      lastActionAt: new Date(),
    }

    // DB에 저장
    await saveGame(gameState)

    // 캐시에 저장
    this.cache.set(session.id, session)

    return session
  }

  /**
   * 세션을 조회합니다.
   */
  async getSession(sessionId: string): Promise<GameSession | null> {
    // 캐시에서 먼저 확인
    const cached = this.cache.get(sessionId)
    if (cached) {
      return cached
    }

    // DB에서 조회
    const state = await loadGame(sessionId)
    if (!state) {
      return null
    }

    // 캐시에 저장
    const session: GameSession = {
      id: state.id,
      state,
      createdAt: new Date(), // DB에서 가져오면 정확한 시간 없음
      lastActionAt: new Date(),
    }
    this.cache.set(session.id, session)

    return session
  }

  /**
   * 모든 활성 세션을 조회합니다.
   */
  async getAllSessions(): Promise<GameSession[]> {
    const games = await listActiveGames()

    return games.map(game => ({
      id: game.id,
      state: game.state,
      createdAt: new Date(game.createdAt),
      lastActionAt: new Date(game.updatedAt),
    }))
  }

  /**
   * 세션에 액션을 실행합니다.
   * @param sessionId 세션 ID
   * @param action 실행할 액션
   * @param playerId 액션을 수행하는 플레이어 ID (없으면 현재 턴 플레이어)
   */
  async executeAction(
    sessionId: string,
    action: Parameters<GameEngine['executeAction']>[1],
    playerId?: string
  ): Promise<ReturnType<GameEngine['executeAction']> | { success: false; error: string }> {
    const session = await this.getSession(sessionId)
    if (!session) {
      return { success: false, error: '세션을 찾을 수 없습니다.' }
    }

    const result = this.engine.executeAction(session.state, action, playerId)
    if (result.success) {
      session.state = result.newState
      session.lastActionAt = new Date()

      // DB에 저장
      await saveGame(result.newState)

      // 캐시 업데이트
      this.cache.set(session.id, session)
    }
    return result
  }

  /**
   * 세션의 유효한 액션을 조회합니다.
   * @param sessionId 세션 ID
   * @param playerId 액션을 조회할 플레이어 ID (없으면 현재 턴 플레이어)
   */
  async getValidActions(sessionId: string, playerId?: string) {
    const session = await this.getSession(sessionId)
    if (!session) {
      return []
    }
    return this.engine.getValidActions(session.state, playerId)
  }

  /**
   * 세션을 삭제합니다.
   */
  async deleteSession(sessionId: string): Promise<boolean> {
    // 캐시에서 삭제
    this.cache.delete(sessionId)

    // DB에서 삭제 (상태 변경)
    return await dbDeleteGame(sessionId)
  }

  /**
   * 캐시를 초기화합니다.
   */
  clearCache(): void {
    this.cache.clear()
  }
}

export interface GameSession {
  id: string
  state: GameState
  createdAt: Date
  lastActionAt: Date
}

// 싱글톤 인스턴스
export const sessionManager = new SessionManager()
