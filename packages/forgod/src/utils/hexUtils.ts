import type { HexCoord, HexTile, TileType } from '@forgod/core'
import { TERRAIN_MOVEMENT_COST, getNeighbors } from '@forgod/core'
import { colors } from '../styles/theme'

const HILL_MINIMUM_MOVEMENT = 3

export const TILE_COLORS: Record<string, string> = {
  plain: colors.tile.plain,
  village: colors.tile.village,
  mountain: colors.tile.mountain,
  lake: colors.tile.lake,
  hill: colors.tile.hill,
  swamp: colors.tile.swamp,
  fire: colors.tile.fire,
  temple: colors.tile.temple,
  castle: colors.tile.castle,
  monster: colors.tile.monster,
}

export const CLASS_COLORS: Record<string, string> = {
  warrior: colors.warrior,
  rogue: colors.rogue,
  mage: colors.mage,
}

export const STATE_COLORS: Record<string, string> = {
  holy: colors.holy,
  corrupt: colors.corrupt,
}

/**
 * Axial -> pixel (flat-top hexagon)
 */
export function axialToPixel(coord: HexCoord, size: number): { x: number; y: number } {
  const x = size * (3 / 2 * coord.q)
  const y = size * (Math.sqrt(3) / 2 * coord.q + Math.sqrt(3) * coord.r)
  return { x, y }
}

/**
 * Pixel -> axial (flat-top hexagon, rounded)
 */
export function pixelToAxial(px: number, py: number, size: number): HexCoord {
  const q = (2 / 3 * px) / size
  const r = (-1 / 3 * px + Math.sqrt(3) / 3 * py) / size
  return hexRound(q, r)
}

function hexRound(qf: number, rf: number): HexCoord {
  const sf = -qf - rf
  let q = Math.round(qf)
  let r = Math.round(rf)
  const s = Math.round(sf)
  const qDiff = Math.abs(q - qf)
  const rDiff = Math.abs(r - rf)
  const sDiff = Math.abs(s - sf)
  if (qDiff > rDiff && qDiff > sDiff) {
    q = -r - s
  } else if (rDiff > sDiff) {
    r = -q - s
  }
  return { q, r }
}

/**
 * Hexagon 6 corners (flat-top)
 */
export function getHexCorners(centerX: number, centerY: number, size: number): string {
  const corners: string[] = []
  for (let i = 0; i < 6; i++) {
    const angle = (Math.PI / 180) * (60 * i)
    const x = centerX + size * Math.cos(angle)
    const y = centerY + size * Math.sin(angle)
    corners.push(`${x},${y}`)
  }
  return corners.join(' ')
}

/**
 * Board bounding box
 */
export function calculateBoardBounds(
  tiles: Array<{ coord: HexCoord }>,
  size: number
): { minX: number; minY: number; maxX: number; maxY: number; width: number; height: number } {
  if (tiles.length === 0) {
    return { minX: 0, minY: 0, maxX: 100, maxY: 100, width: 100, height: 100 }
  }
  let minX = Infinity, minY = Infinity, maxX = -Infinity, maxY = -Infinity
  for (const tile of tiles) {
    const { x, y } = axialToPixel(tile.coord, size)
    minX = Math.min(minX, x - size)
    minY = Math.min(minY, y - size)
    maxX = Math.max(maxX, x + size)
    maxY = Math.max(maxY, y + size)
  }
  return { minX, minY, maxX, maxY, width: maxX - minX, height: maxY - minY }
}

/**
 * Hex distance
 */
export function hexDistance(a: HexCoord, b: HexCoord): number {
  return Math.max(
    Math.abs(a.q - b.q),
    Math.abs(a.r - b.r),
    Math.abs((a.q + a.r) - (b.q + b.r))
  )
}

export function coordKey(c: HexCoord): string {
  return `${c.q},${c.r}`
}

function buildTileMap(tiles: HexTile[]): Map<string, HexTile> {
  const map = new Map<string, HexTile>()
  for (const tile of tiles) map.set(coordKey(tile.coord), tile)
  return map
}

function canEnterTile(
  tile: HexTile,
  remaining: number,
  isCorrupt: boolean,
  hasDemonSword: boolean,
  avoidFire?: boolean,
  occupiedKeys?: Set<string>,
): { ok: boolean; cost: number } {
  const moveCost = TERRAIN_MOVEMENT_COST[tile.type as TileType]
  if (moveCost === 'blocked') return { ok: false, cost: 0 }
  if (occupiedKeys && occupiedKeys.has(coordKey(tile.coord))) return { ok: false, cost: 0 }
  if (tile.type === 'temple' && isCorrupt && !hasDemonSword) return { ok: false, cost: 0 }
  if (moveCost === 'all' && remaining < HILL_MINIMUM_MOVEMENT) return { ok: false, cost: 0 }
  if (avoidFire && tile.type === 'fire' && !isCorrupt) return { ok: false, cost: 0 }
  const actualCost = moveCost === 'all' ? remaining : moveCost
  if (remaining < actualCost) return { ok: false, cost: 0 }
  return { ok: true, cost: actualCost }
}

/**
 * BFS: 현재 이동력으로 도달 가능한 모든 타일 계산
 */
export function getReachableTiles(
  start: HexCoord,
  remainingMovement: number,
  tiles: HexTile[],
  isCorrupt: boolean,
  hasDemonSword: boolean,
  occupiedPositions?: HexCoord[],
): HexCoord[] {
  const tileMap = buildTileMap(tiles)
  const occupiedKeys = occupiedPositions
    ? new Set(occupiedPositions.map(coordKey))
    : undefined
  const best = new Map<string, number>()
  best.set(coordKey(start), remainingMovement)
  const reachable: HexCoord[] = []
  const queue: Array<{ pos: HexCoord; remaining: number }> = [{ pos: start, remaining: remainingMovement }]

  while (queue.length > 0) {
    const { pos, remaining } = queue.shift()!
    for (const neighbor of getNeighbors(pos)) {
      const key = coordKey(neighbor)
      const tile = tileMap.get(key)
      if (!tile) continue
      const { ok, cost } = canEnterTile(tile, remaining, isCorrupt, hasDemonSword, false, occupiedKeys)
      if (!ok) continue
      const newRemaining = remaining - cost
      if (best.has(key) && best.get(key)! >= newRemaining) continue
      best.set(key, newRemaining)
      reachable.push(neighbor)
      if (newRemaining > 0) {
        queue.push({ pos: neighbor, remaining: newRemaining })
      }
    }
  }
  return reachable
}

/**
 * BFS pathfinding: start에서 target까지의 경로를 반환
 * avoidFire가 true면 화염 타일을 피하려고 시도 (도달 불가능하면 null 반환)
 */
export function findMovePath(
  start: HexCoord,
  target: HexCoord,
  remainingMovement: number,
  tiles: HexTile[],
  isCorrupt: boolean,
  hasDemonSword: boolean,
  avoidFire: boolean = false,
  occupiedPositions?: HexCoord[],
): HexCoord[] | null {
  const tileMap = buildTileMap(tiles)
  const occupiedKeys = occupiedPositions
    ? new Set(occupiedPositions.map(coordKey))
    : undefined
  const targetKey = coordKey(target)
  const startKey = coordKey(start)
  if (startKey === targetKey) return []

  const best = new Map<string, number>()
  best.set(startKey, remainingMovement)
  const parent = new Map<string, HexCoord>()
  const queue: Array<{ pos: HexCoord; remaining: number }> = [{ pos: start, remaining: remainingMovement }]

  while (queue.length > 0) {
    const { pos, remaining } = queue.shift()!
    for (const neighbor of getNeighbors(pos)) {
      const key = coordKey(neighbor)
      const tile = tileMap.get(key)
      if (!tile) continue
      const { ok, cost } = canEnterTile(tile, remaining, isCorrupt, hasDemonSword, avoidFire, occupiedKeys)
      if (!ok) continue
      const newRemaining = remaining - cost
      if (best.has(key) && best.get(key)! >= newRemaining) continue
      best.set(key, newRemaining)
      parent.set(key, pos)
      if (newRemaining > 0) {
        queue.push({ pos: neighbor, remaining: newRemaining })
      }
    }
  }

  if (!parent.has(targetKey)) return null
  const path: HexCoord[] = []
  let cur = target
  while (coordKey(cur) !== startKey) {
    path.unshift(cur)
    cur = parent.get(coordKey(cur))!
  }
  return path
}

/**
 * 경로 내 화염 타일 수 계산
 */
export function countFireOnPath(
  path: HexCoord[],
  tiles: HexTile[],
  isCorrupt: boolean,
): number {
  if (isCorrupt) return 0
  const tileMap = buildTileMap(tiles)
  return path.filter(c => tileMap.get(coordKey(c))?.type === 'fire').length
}

/**
 * Multiple tokens on same tile: circular arrangement
 */
export function getTokenOffset(index: number, total: number, radius: number): { dx: number; dy: number } {
  if (total <= 1) return { dx: 0, dy: 0 }
  const angle = (2 * Math.PI * index) / total - Math.PI / 2
  return {
    dx: radius * Math.cos(angle),
    dy: radius * Math.sin(angle),
  }
}
