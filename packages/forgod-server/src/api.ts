#!/usr/bin/env node

import { serve } from '@hono/node-server'
import { Hono } from 'hono'
import { cors } from 'hono/cors'
import { z } from 'zod'
import { sessionManager } from './session.js'
import {
  createGame,
  createGameSchema,
  listGames,
  deleteGame,
  deleteGameSchema,
} from './tools/game-management.js'
import {
  getGameState,
  getGameStateSchema,
  getGameRules,
} from './tools/game-state.js'
import {
  getValidActions,
  getValidActionsSchema,
} from './tools/valid-actions.js'
import {
  executeAction,
  executeActionSchema,
} from './tools/execute-action.js'

const app = new Hono()

// CORS 설정
app.use('/*', cors({
  origin: ['http://localhost:5173', 'http://localhost:3000', 'http://localhost:4173'],
  allowMethods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
  allowHeaders: ['Content-Type'],
}))

// Health check
app.get('/', (c) => {
  return c.json({ status: 'ok', service: 'forgod-api' })
})

// ===== 게임 관리 =====

// 게임 생성
app.post('/api/games', async (c) => {
  try {
    const body = await c.req.json()
    const input = createGameSchema.parse(body)
    const result = await createGame(input)
    return c.json(result, 201)
  } catch (error) {
    if (error instanceof z.ZodError) {
      return c.json({ success: false, error: 'Invalid input', details: error.errors }, 400)
    }
    const message = error instanceof Error ? error.message : 'Unknown error'
    return c.json({ success: false, error: message }, 500)
  }
})

// 게임 목록 조회
app.get('/api/games', async (c) => {
  try {
    const result = await listGames()
    return c.json(result)
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Unknown error'
    return c.json({ success: false, error: message }, 500)
  }
})

// 게임 상태 조회
app.get('/api/games/:gameId', async (c) => {
  try {
    const gameId = c.req.param('gameId')
    const playerId = c.req.query('playerId')
    const input = getGameStateSchema.parse({ gameId, playerId })
    const result = await getGameState(input)
    if (!result.success) {
      return c.json(result, 404)
    }
    return c.json(result)
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Unknown error'
    return c.json({ success: false, error: message }, 500)
  }
})

// 게임 삭제
app.delete('/api/games/:gameId', async (c) => {
  try {
    const gameId = c.req.param('gameId')
    const input = deleteGameSchema.parse({ gameId })
    const result = await deleteGame(input)
    if (!result.success) {
      return c.json(result, 404)
    }
    return c.json(result)
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Unknown error'
    return c.json({ success: false, error: message }, 500)
  }
})

// ===== 게임 플레이 =====

// 가능한 액션 조회 (플레이어별)
app.get('/api/games/:gameId/players/:playerId/actions', async (c) => {
  try {
    const gameId = c.req.param('gameId')
    const playerId = c.req.param('playerId')
    const input = getValidActionsSchema.parse({ gameId, playerId })
    const result = await getValidActions(input)
    if (!result.success) {
      return c.json(result, 404)
    }
    return c.json(result)
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Unknown error'
    return c.json({ success: false, error: message }, 500)
  }
})

// 액션 실행 (플레이어별)
app.post('/api/games/:gameId/players/:playerId/actions', async (c) => {
  try {
    const gameId = c.req.param('gameId')
    const playerId = c.req.param('playerId')
    const body = await c.req.json()
    const input = executeActionSchema.parse({ gameId, playerId, action: body.action })
    const result = await executeAction(input)
    if (!result.success) {
      return c.json(result, 400)
    }
    return c.json(result)
  } catch (error) {
    if (error instanceof z.ZodError) {
      return c.json({ success: false, error: 'Invalid input', details: error.errors }, 400)
    }
    const message = error instanceof Error ? error.message : 'Unknown error'
    return c.json({ success: false, error: message }, 500)
  }
})

// ===== 기타 =====

// 게임 규칙 조회
app.get('/api/rules', (c) => {
  const result = getGameRules()
  return c.json(result)
})

// 서버 시작
const port = parseInt(process.env.PORT || '3001')

console.log(`🎮 Forgod API Server starting on port ${port}...`)

serve({
  fetch: app.fetch,
  port,
}, (info) => {
  console.log(`🎮 Forgod API Server running at http://localhost:${info.port}`)
})
