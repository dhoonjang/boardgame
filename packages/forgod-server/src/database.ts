import { createClient, SupabaseClient } from '@supabase/supabase-js'
import type { GameState } from '@forgod/core'

// 게임 레코드 타입
export interface GameRecord {
  id: string
  state: GameState
  status: 'active' | 'completed' | 'abandoned'
  created_at: string
  updated_at: string
}

let supabase: SupabaseClient | null = null
let useInMemory = false

// 인메모리 저장소 (DB 없이 테스트용)
const inMemoryStore = new Map<string, GameRecord>()

/**
 * Supabase 클라이언트 초기화
 */
export function initSupabase(): SupabaseClient | null {
  const supabaseUrl = process.env.SUPABASE_URL
  const supabaseKey = process.env.SUPABASE_ANON_KEY

  if (!supabaseUrl || !supabaseKey) {
    console.log('⚠️  Supabase credentials not found. Using in-memory storage.')
    useInMemory = true
    return null
  }

  supabase = createClient(supabaseUrl, supabaseKey)
  return supabase
}

/**
 * Supabase 클라이언트 가져오기
 */
export function getSupabase(): SupabaseClient | null {
  if (!supabase && !useInMemory) {
    return initSupabase()
  }
  return supabase
}

/**
 * 게임 저장
 */
export async function saveGame(gameState: GameState): Promise<void> {
  const db = getSupabase()

  if (!db) {
    // 인메모리 모드
    const now = new Date().toISOString()
    const existing = inMemoryStore.get(gameState.id)
    inMemoryStore.set(gameState.id, {
      id: gameState.id,
      state: gameState,
      status: 'active',
      created_at: existing?.created_at ?? now,
      updated_at: now,
    })
    return
  }

  const { error } = await db
    .from('games')
    .upsert({
      id: gameState.id,
      state: gameState as unknown,
      status: 'active',
      updated_at: new Date().toISOString(),
    })

  if (error) {
    throw new Error(`Failed to save game: ${error.message}`)
  }
}

/**
 * 게임 조회
 */
export async function loadGame(gameId: string): Promise<GameState | null> {
  const db = getSupabase()

  if (!db) {
    // 인메모리 모드
    const record = inMemoryStore.get(gameId)
    if (!record || record.status !== 'active') return null
    return record.state
  }

  const { data, error } = await db
    .from('games')
    .select('state')
    .eq('id', gameId)
    .single()

  if (error) {
    if (error.code === 'PGRST116') {
      // No rows returned
      return null
    }
    throw new Error(`Failed to load game: ${error.message}`)
  }

  return (data as { state: GameState })?.state ?? null
}

/**
 * 모든 활성 게임 조회
 */
export async function listActiveGames(): Promise<Array<{
  id: string
  state: GameState
  createdAt: string
  updatedAt: string
}>> {
  const db = getSupabase()

  if (!db) {
    // 인메모리 모드
    const games = Array.from(inMemoryStore.values())
      .filter(g => g.status === 'active')
      .sort((a, b) => b.updated_at.localeCompare(a.updated_at))
      .map(row => ({
        id: row.id,
        state: row.state,
        createdAt: row.created_at,
        updatedAt: row.updated_at,
      }))
    return games
  }

  const { data, error } = await db
    .from('games')
    .select('id, state, created_at, updated_at')
    .eq('status', 'active')
    .order('updated_at', { ascending: false })

  if (error) {
    throw new Error(`Failed to list games: ${error.message}`)
  }

  return ((data as GameRecord[]) ?? []).map(row => ({
    id: row.id,
    state: row.state,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  }))
}

/**
 * 게임 삭제 (상태를 abandoned로 변경)
 */
export async function deleteGame(gameId: string): Promise<boolean> {
  const db = getSupabase()

  if (!db) {
    // 인메모리 모드
    const record = inMemoryStore.get(gameId)
    if (!record || record.status !== 'active') return false
    record.status = 'abandoned'
    record.updated_at = new Date().toISOString()
    return true
  }

  const { error, count } = await db
    .from('games')
    .update({ status: 'abandoned', updated_at: new Date().toISOString() })
    .eq('id', gameId)
    .eq('status', 'active')

  if (error) {
    throw new Error(`Failed to delete game: ${error.message}`)
  }

  return (count ?? 0) > 0
}

/**
 * 게임 완료 처리
 */
export async function completeGame(gameId: string): Promise<void> {
  const db = getSupabase()

  if (!db) {
    // 인메모리 모드
    const record = inMemoryStore.get(gameId)
    if (record) {
      record.status = 'completed'
      record.updated_at = new Date().toISOString()
    }
    return
  }

  const { error } = await db
    .from('games')
    .update({ status: 'completed', updated_at: new Date().toISOString() })
    .eq('id', gameId)

  if (error) {
    throw new Error(`Failed to complete game: ${error.message}`)
  }
}
