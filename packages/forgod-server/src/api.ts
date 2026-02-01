import { Hono } from 'hono'
import { SessionManager } from './session'
import { CreateGameSchema, GameActionSchema } from './schemas/action'
import { HeroClassQuerySchema, RevelationSourceQuerySchema } from './schemas/static-data'
import type { GameAction, Player, Stats, HeroClass } from '@forgod/core'
import { ALL_SKILLS, SKILLS_BY_CLASS, MONSTERS, REVELATIONS } from '@forgod/core'

// 세션 매니저 인스턴스
export let sessionManager = new SessionManager()

// 테스트용: 세션 매니저 리셋
export function resetSessionManager() {
  sessionManager = new SessionManager()
}

// Hono 앱 생성
export const app = new Hono()

// 에러 응답 헬퍼
function errorResponse(message: string, code?: string, details?: unknown) {
  return {
    error: message,
    ...(code ? { code } : {}),
    ...(details !== undefined ? { details } : {}),
  }
}

// 플레이어 레벨 계산 (가장 높은 능력치 수치)
function getPlayerLevel(stats: Stats): number {
  return Math.max(
    stats.strength[0] + stats.strength[1],
    stats.dexterity[0] + stats.dexterity[1],
    stats.intelligence[0] + stats.intelligence[1]
  )
}

// 플레이어 요약 정보 변환
function toPlayerSummary(player: Player) {
  return {
    id: player.id,
    name: player.name,
    heroClass: player.heroClass,
    state: player.state,
    health: player.health,
    maxHealth: player.maxHealth,
    position: player.position,
    level: getPlayerLevel(player.stats),
    isDead: player.isDead,
    hasDemonSword: player.hasDemonSword,
  }
}

// ===== 게임 관리 API =====

// POST /api/games - 게임 생성
app.post('/api/games', async (c) => {
  const body = await c.req.json()

  // 요청 검증
  const parseResult = CreateGameSchema.safeParse(body)
  if (!parseResult.success) {
    return c.json(
      errorResponse('Invalid request body', 'VALIDATION_ERROR', parseResult.error.issues),
      400
    )
  }

  const { players } = parseResult.data

  // 게임 생성
  const result = sessionManager.createGame(players)

  return c.json(result, 201)
})

// GET /api/games - 게임 목록
app.get('/api/games', (c) => {
  const games = sessionManager.listGames()
  return c.json({ games })
})

// GET /api/games/:gameId - 게임 상태 조회
app.get('/api/games/:gameId', (c) => {
  const { gameId } = c.req.param()
  const gameState = sessionManager.getGame(gameId)

  if (!gameState) {
    return c.json(errorResponse('Game not found', 'NOT_FOUND'), 404)
  }

  return c.json({ gameState })
})

// DELETE /api/games/:gameId - 게임 삭제
app.delete('/api/games/:gameId', (c) => {
  const { gameId } = c.req.param()
  const deleted = sessionManager.deleteGame(gameId)

  if (!deleted) {
    return c.json(errorResponse('Game not found', 'NOT_FOUND'), 404)
  }

  return c.json({ success: true, message: 'Game deleted' })
})

// ===== 게임 플레이 API =====

// POST /api/games/:gameId/actions - 액션 실행
app.post('/api/games/:gameId/actions', async (c) => {
  const { gameId } = c.req.param()
  const gameState = sessionManager.getGame(gameId)

  if (!gameState) {
    return c.json(errorResponse('Game not found', 'NOT_FOUND'), 404)
  }

  const body = await c.req.json()

  // 액션 검증
  const parseResult = GameActionSchema.safeParse(body)
  if (!parseResult.success) {
    return c.json(
      errorResponse('Invalid action', 'VALIDATION_ERROR', parseResult.error.issues),
      400
    )
  }

  const action = parseResult.data as GameAction

  // 액션 실행
  const engine = sessionManager.getEngine()
  const result = engine.executeAction(gameState, action)

  // 게임 상태 업데이트
  if (result.success) {
    sessionManager.updateGame(gameId, result.newState)
  }

  return c.json({
    success: result.success,
    gameState: result.newState,
    message: result.message,
    events: result.events,
  })
})

// GET /api/games/:gameId/valid-actions - 유효한 액션 조회
app.get('/api/games/:gameId/valid-actions', (c) => {
  const { gameId } = c.req.param()
  const gameState = sessionManager.getGame(gameId)

  if (!gameState) {
    return c.json(errorResponse('Game not found', 'NOT_FOUND'), 404)
  }

  const engine = sessionManager.getEngine()
  const currentPlayer = engine.getCurrentPlayer(gameState)
  const validActions = engine.getValidActions(gameState)

  return c.json({
    validActions,
    currentPlayerId: currentPlayer?.id ?? null,
    turnPhase: currentPlayer?.turnPhase ?? null,
    isMonsterTurn: currentPlayer === null,
  })
})

// GET /api/games/:gameId/current-turn - 현재 턴 정보
app.get('/api/games/:gameId/current-turn', (c) => {
  const { gameId } = c.req.param()
  const gameState = sessionManager.getGame(gameId)

  if (!gameState) {
    return c.json(errorResponse('Game not found', 'NOT_FOUND'), 404)
  }

  const engine = sessionManager.getEngine()
  const currentTurnEntry = engine.getCurrentTurnEntry(gameState)
  const currentPlayer = engine.getCurrentPlayer(gameState)

  return c.json({
    currentTurnEntry,
    currentPlayer: currentPlayer
      ? {
          id: currentPlayer.id,
          name: currentPlayer.name,
          heroClass: currentPlayer.heroClass,
          turnPhase: currentPlayer.turnPhase,
        }
      : null,
    roundNumber: gameState.roundNumber,
    currentTurnIndex: gameState.currentTurnIndex,
    roundTurnOrder: gameState.roundTurnOrder,
  })
})

// ===== 플레이어 정보 API =====

// GET /api/games/:gameId/players - 플레이어 목록
app.get('/api/games/:gameId/players', (c) => {
  const { gameId } = c.req.param()
  const gameState = sessionManager.getGame(gameId)

  if (!gameState) {
    return c.json(errorResponse('Game not found', 'NOT_FOUND'), 404)
  }

  const players = gameState.players.map(toPlayerSummary)

  return c.json({ players })
})

// GET /api/games/:gameId/players/:playerId - 플레이어 상세 정보
app.get('/api/games/:gameId/players/:playerId', (c) => {
  const { gameId, playerId } = c.req.param()
  const gameState = sessionManager.getGame(gameId)

  if (!gameState) {
    return c.json(errorResponse('Game not found', 'NOT_FOUND'), 404)
  }

  const player = gameState.players.find((p) => p.id === playerId)

  if (!player) {
    return c.json(errorResponse('Player not found', 'NOT_FOUND'), 404)
  }

  return c.json({ player })
})

// ===== 정적 데이터 API =====

// GET /api/skills - 스킬 목록
app.get('/api/skills', (c) => {
  const query = c.req.query()

  // heroClass 쿼리 파라미터 검증
  const parseResult = HeroClassQuerySchema.safeParse(query)
  if (!parseResult.success) {
    return c.json(
      errorResponse('Invalid query parameter', 'VALIDATION_ERROR', parseResult.error.issues),
      400
    )
  }

  const { heroClass } = parseResult.data

  // 필터링 적용
  const skills = heroClass ? SKILLS_BY_CLASS[heroClass as HeroClass] : ALL_SKILLS

  return c.json({ skills })
})

// GET /api/monsters - 몬스터 목록
app.get('/api/monsters', (c) => {
  return c.json({ monsters: MONSTERS })
})

// GET /api/revelations - 계시 목록
app.get('/api/revelations', (c) => {
  const query = c.req.query()

  // source 쿼리 파라미터 검증
  const parseResult = RevelationSourceQuerySchema.safeParse(query)
  if (!parseResult.success) {
    return c.json(
      errorResponse('Invalid query parameter', 'VALIDATION_ERROR', parseResult.error.issues),
      400
    )
  }

  const { source } = parseResult.data

  // 필터링 적용
  const revelations = source ? REVELATIONS.filter((r) => r.source === source) : REVELATIONS

  return c.json({ revelations })
})

export default app
