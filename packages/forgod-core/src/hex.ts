import type { HexCoord, HexDirection, HexBoard, HexTile, TileType } from './types'
import { coordToKey } from './types'

// 6개의 인접 방향 (시계방향, 오른쪽부터)
// 방향 0: 오른쪽, 1: 오른쪽 아래, 2: 왼쪽 아래, 3: 왼쪽, 4: 왼쪽 위, 5: 오른쪽 위
export const HEX_DIRECTIONS: readonly HexCoord[] = [
  { q: 1, r: 0 },   // 0: 오른쪽
  { q: 1, r: -1 },  // 1: 오른쪽 위
  { q: 0, r: -1 },  // 2: 왼쪽 위
  { q: -1, r: 0 },  // 3: 왼쪽
  { q: -1, r: 1 },  // 4: 왼쪽 아래
  { q: 0, r: 1 },   // 5. 오른쪽 아래
]

/**
 * 두 좌표가 같은지 비교
 */
export function coordEquals(a: HexCoord, b: HexCoord): boolean {
  return a.q === b.q && a.r === b.r
}

/**
 * 특정 방향의 인접 좌표 반환
 */
export function getNeighbor(coord: HexCoord, direction: HexDirection): HexCoord {
  const d = HEX_DIRECTIONS[direction]
  return { q: coord.q + d.q, r: coord.r + d.r }
}

/**
 * 두 인접 좌표 사이의 방향 반환 (인접하지 않으면 null)
 */
export function getDirection(from: HexCoord, to: HexCoord): HexDirection | null {
  const dq = to.q - from.q
  const dr = to.r - from.r

  for (let i = 0; i < HEX_DIRECTIONS.length; i++) {
    const d = HEX_DIRECTIONS[i]
    if (d.q === dq && d.r === dr) {
      return i as HexDirection
    }
  }

  return null
}

/**
 * 특정 방향으로 한 칸 이동한 좌표 반환
 */
export function moveInDirection(coord: HexCoord, direction: HexDirection): HexCoord {
  const d = HEX_DIRECTIONS[direction]
  return { q: coord.q + d.q, r: coord.r + d.r }
}

/**
 * 모든 인접 좌표 반환
 */
export function getNeighbors(coord: HexCoord): HexCoord[] {
  return HEX_DIRECTIONS.map(d => ({
    q: coord.q + d.q,
    r: coord.r + d.r,
  }))
}

/**
 * 두 좌표 사이의 거리 계산 (hex 단위)
 * Axial 좌표에서 거리 = (|q1-q2| + |q1-q2+r1-r2| + |r1-r2|) / 2
 */
export function getDistance(a: HexCoord, b: HexCoord): number {
  const dq = a.q - b.q
  const dr = a.r - b.r
  return (Math.abs(dq) + Math.abs(dq + dr) + Math.abs(dr)) / 2
}

/**
 * 특정 거리 내의 모든 좌표 반환
 */
export function getCoordsInRange(center: HexCoord, range: number): HexCoord[] {
  const results: HexCoord[] = []
  for (let q = -range; q <= range; q++) {
    for (let r = Math.max(-range, -q - range); r <= Math.min(range, -q + range); r++) {
      results.push({ q: center.q + q, r: center.r + r })
    }
  }
  return results
}

/**
 * 특정 거리에 있는 좌표들만 반환 (링 형태)
 */
export function getCoordsAtDistance(center: HexCoord, distance: number): HexCoord[] {
  if (distance === 0) return [center]

  const results: HexCoord[] = []
  let current: HexCoord = { q: center.q + distance, r: center.r }

  for (let i = 0; i < 6; i++) {
    for (let j = 0; j < distance; j++) {
      results.push(current)
      current = getNeighbor(current, ((i + 2) % 6) as HexDirection)
    }
  }

  return results
}

/**
 * 두 좌표 사이의 직선 경로 반환 (Bresenham's line algorithm for hex)
 */
export function getLineBetween(a: HexCoord, b: HexCoord): HexCoord[] {
  const distance = getDistance(a, b)
  if (distance === 0) return [a]

  const results: HexCoord[] = []
  for (let i = 0; i <= distance; i++) {
    const t = distance === 0 ? 0 : i / distance
    const q = a.q + (b.q - a.q) * t
    const r = a.r + (b.r - a.r) * t
    results.push(hexRound({ q, r }))
  }

  return results
}

/**
 * 실수 좌표를 가장 가까운 hex 좌표로 반올림
 */
export function hexRound(coord: { q: number; r: number }): HexCoord {
  const s = -coord.q - coord.r
  let rq = Math.round(coord.q)
  let rr = Math.round(coord.r)
  const rs = Math.round(s)

  const qDiff = Math.abs(rq - coord.q)
  const rDiff = Math.abs(rr - coord.r)
  const sDiff = Math.abs(rs - s)

  if (qDiff > rDiff && qDiff > sDiff) {
    rq = -rr - rs
  } else if (rDiff > sDiff) {
    rr = -rq - rs
  }

  return { q: rq, r: rr }
}

/**
 * 보드에서 특정 좌표의 타일 가져오기
 */
export function getTile(board: HexBoard, coord: HexCoord): HexTile | undefined {
  return board.get(coordToKey(coord))
}

/**
 * 보드에서 특정 좌표가 유효한지 확인
 */
export function isValidCoord(board: HexBoard, coord: HexCoord): boolean {
  return board.has(coordToKey(coord))
}

/**
 * 보드에서 이동 가능한 인접 좌표 반환
 */
export function getWalkableNeighbors(
  board: HexBoard,
  coord: HexCoord,
  blockedTypes: TileType[] = ['mountain', 'lake']
): HexCoord[] {
  return getNeighbors(coord).filter(neighbor => {
    const tile = getTile(board, neighbor)
    return tile && !blockedTypes.includes(tile.type)
  })
}

/**
 * BFS로 특정 거리 내 이동 가능한 모든 좌표 찾기
 */
export function getReachableCoords(
  board: HexBoard,
  start: HexCoord,
  maxDistance: number,
  blockedTypes: TileType[] = ['mountain', 'lake']
): Map<string, number> {
  const distances = new Map<string, number>()
  const queue: Array<{ coord: HexCoord; distance: number }> = [{ coord: start, distance: 0 }]

  distances.set(coordToKey(start), 0)

  while (queue.length > 0) {
    const { coord, distance } = queue.shift()!

    if (distance >= maxDistance) continue

    for (const neighbor of getWalkableNeighbors(board, coord, blockedTypes)) {
      const key = coordToKey(neighbor)
      if (!distances.has(key)) {
        distances.set(key, distance + 1)
        queue.push({ coord: neighbor, distance: distance + 1 })
      }
    }
  }

  return distances
}

/**
 * 6각형 보드 생성 (반지름 기반)
 * radius가 2면 중앙 포함 총 19개 타일
 */
export function createHexBoard(radius: number, defaultType: TileType = 'plain'): HexBoard {
  const board = new Map<string, HexTile>()

  for (let q = -radius; q <= radius; q++) {
    const r1 = Math.max(-radius, -q - radius)
    const r2 = Math.min(radius, -q + radius)
    for (let r = r1; r <= r2; r++) {
      const coord = { q, r }
      board.set(coordToKey(coord), {
        coord,
        type: defaultType,
      })
    }
  }

  return board
}
