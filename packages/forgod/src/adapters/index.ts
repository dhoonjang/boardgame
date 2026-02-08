import type { GameAdapter } from './types'
import { localAdapter } from './local-adapter'
import { serverAdapter } from './server-adapter'

export type AdapterMode = 'local' | 'server'

export function createAdapter(mode: AdapterMode): GameAdapter {
  return mode === 'local' ? localAdapter : serverAdapter
}

export type { GameAdapter, CreateGameParams, ActionResult } from './types'
