import { describe, it, expect } from 'vitest'
import {
  HEX_DIRECTIONS,
  coordEquals,
  getNeighbor,
  getDirection,
  moveInDirection,
  getNeighbors,
  getDistance,
  getCoordsInRange,
  getCoordsAtDistance,
  getLineBetween,
  hexRound,
  getTile,
  isValidCoord,
  getWalkableNeighbors,
  getReachableCoords,
  createHexBoard,
} from '../hex'
import { coordToKey, type HexCoord, type HexBoard, type HexTile } from '../types'

describe('hex', () => {
  describe('HEX_DIRECTIONS', () => {
    it('6개의 방향을 가진다', () => {
      expect(HEX_DIRECTIONS).toHaveLength(6)
    })
  })

  describe('coordEquals', () => {
    it('같은 좌표면 true를 반환한다', () => {
      expect(coordEquals({ q: 0, r: 0 }, { q: 0, r: 0 })).toBe(true)
      expect(coordEquals({ q: 3, r: -2 }, { q: 3, r: -2 })).toBe(true)
    })

    it('다른 좌표면 false를 반환한다', () => {
      expect(coordEquals({ q: 0, r: 0 }, { q: 0, r: 1 })).toBe(false)
      expect(coordEquals({ q: 1, r: 0 }, { q: 0, r: 0 })).toBe(false)
    })
  })

  describe('getNeighbor', () => {
    it('각 방향의 인접 좌표를 반환한다', () => {
      const center: HexCoord = { q: 0, r: 0 }

      // 방향 0: 오른쪽
      expect(getNeighbor(center, 0)).toEqual({ q: 1, r: 0 })
      // 방향 1: 오른쪽 위
      expect(getNeighbor(center, 1)).toEqual({ q: 1, r: -1 })
      // 방향 3: 왼쪽
      expect(getNeighbor(center, 3)).toEqual({ q: -1, r: 0 })
    })
  })

  describe('getDirection', () => {
    it('인접한 두 좌표 사이의 방향을 반환한다', () => {
      const center: HexCoord = { q: 0, r: 0 }

      expect(getDirection(center, { q: 1, r: 0 })).toBe(0)  // 오른쪽
      expect(getDirection(center, { q: 1, r: -1 })).toBe(1) // 오른쪽 위
      expect(getDirection(center, { q: -1, r: 0 })).toBe(3) // 왼쪽
    })

    it('인접하지 않은 좌표면 null을 반환한다', () => {
      const center: HexCoord = { q: 0, r: 0 }

      expect(getDirection(center, { q: 2, r: 0 })).toBe(null)
      expect(getDirection(center, { q: 0, r: 0 })).toBe(null)
    })
  })

  describe('moveInDirection', () => {
    it('주어진 방향으로 이동한 좌표를 반환한다', () => {
      const start: HexCoord = { q: 2, r: 3 }

      expect(moveInDirection(start, 0)).toEqual({ q: 3, r: 3 })
      expect(moveInDirection(start, 3)).toEqual({ q: 1, r: 3 })
    })
  })

  describe('getNeighbors', () => {
    it('6개의 인접 좌표를 반환한다', () => {
      const neighbors = getNeighbors({ q: 0, r: 0 })

      expect(neighbors).toHaveLength(6)
      expect(neighbors).toContainEqual({ q: 1, r: 0 })
      expect(neighbors).toContainEqual({ q: -1, r: 0 })
      expect(neighbors).toContainEqual({ q: 0, r: 1 })
      expect(neighbors).toContainEqual({ q: 0, r: -1 })
    })
  })

  describe('getDistance', () => {
    it('같은 좌표의 거리는 0이다', () => {
      expect(getDistance({ q: 0, r: 0 }, { q: 0, r: 0 })).toBe(0)
      expect(getDistance({ q: 3, r: -2 }, { q: 3, r: -2 })).toBe(0)
    })

    it('인접 좌표의 거리는 1이다', () => {
      const center: HexCoord = { q: 0, r: 0 }

      for (const neighbor of getNeighbors(center)) {
        expect(getDistance(center, neighbor)).toBe(1)
      }
    })

    it('거리를 올바르게 계산한다', () => {
      expect(getDistance({ q: 0, r: 0 }, { q: 2, r: 0 })).toBe(2)
      expect(getDistance({ q: 0, r: 0 }, { q: 2, r: -2 })).toBe(2)
      expect(getDistance({ q: 0, r: 0 }, { q: 3, r: -1 })).toBe(3)
    })
  })

  describe('getCoordsInRange', () => {
    it('범위 0은 중심만 포함한다', () => {
      const coords = getCoordsInRange({ q: 0, r: 0 }, 0)
      expect(coords).toHaveLength(1)
      expect(coords[0]).toEqual({ q: 0, r: 0 })
    })

    it('범위 1은 7개 좌표를 포함한다 (중심 + 6 인접)', () => {
      const coords = getCoordsInRange({ q: 0, r: 0 }, 1)
      expect(coords).toHaveLength(7)
    })

    it('범위 2는 19개 좌표를 포함한다', () => {
      const coords = getCoordsInRange({ q: 0, r: 0 }, 2)
      expect(coords).toHaveLength(19)
    })
  })

  describe('getCoordsAtDistance', () => {
    it('거리 0은 중심만 반환한다', () => {
      const coords = getCoordsAtDistance({ q: 0, r: 0 }, 0)
      expect(coords).toHaveLength(1)
      expect(coords[0]).toEqual({ q: 0, r: 0 })
    })

    it('거리 1은 6개 좌표를 반환한다', () => {
      const coords = getCoordsAtDistance({ q: 0, r: 0 }, 1)
      expect(coords).toHaveLength(6)
    })

    it('거리 2는 12개 좌표를 반환한다', () => {
      const coords = getCoordsAtDistance({ q: 0, r: 0 }, 2)
      expect(coords).toHaveLength(12)
    })
  })

  describe('getLineBetween', () => {
    it('같은 좌표면 해당 좌표만 반환한다', () => {
      const line = getLineBetween({ q: 0, r: 0 }, { q: 0, r: 0 })
      expect(line).toHaveLength(1)
      expect(line[0]).toEqual({ q: 0, r: 0 })
    })

    it('인접 좌표 사이의 선은 2개 좌표를 포함한다', () => {
      const line = getLineBetween({ q: 0, r: 0 }, { q: 1, r: 0 })
      expect(line).toHaveLength(2)
    })

    it('거리 3인 좌표 사이의 선은 4개 좌표를 포함한다', () => {
      const line = getLineBetween({ q: 0, r: 0 }, { q: 3, r: 0 })
      expect(line).toHaveLength(4)
    })
  })

  describe('hexRound', () => {
    it('정수 좌표를 그대로 반환한다', () => {
      expect(hexRound({ q: 0, r: 0 })).toEqual({ q: 0, r: 0 })
      expect(hexRound({ q: 3, r: -2 })).toEqual({ q: 3, r: -2 })
    })

    it('실수 좌표를 가장 가까운 hex 좌표로 반올림한다', () => {
      expect(hexRound({ q: 0.3, r: 0.1 })).toEqual({ q: 0, r: 0 })
      expect(hexRound({ q: 0.6, r: 0.1 })).toEqual({ q: 1, r: 0 })
    })
  })

  describe('createHexBoard', () => {
    it('주어진 반지름의 육각형 보드를 생성한다', () => {
      const board = createHexBoard(1)
      expect(board.size).toBe(7) // 1 + 6

      const board2 = createHexBoard(2)
      expect(board2.size).toBe(19) // 1 + 6 + 12
    })

    it('기본 타입으로 타일을 생성한다', () => {
      const board = createHexBoard(1, 'village')
      const tile = board.get('0,0')
      expect(tile?.type).toBe('village')
    })
  })

  describe('getTile', () => {
    it('존재하는 타일을 반환한다', () => {
      const board = createHexBoard(1)
      const tile = getTile(board, { q: 0, r: 0 })
      expect(tile).toBeDefined()
      expect(tile?.coord).toEqual({ q: 0, r: 0 })
    })

    it('존재하지 않는 좌표는 undefined를 반환한다', () => {
      const board = createHexBoard(1)
      const tile = getTile(board, { q: 10, r: 10 })
      expect(tile).toBeUndefined()
    })
  })

  describe('isValidCoord', () => {
    it('보드에 존재하는 좌표면 true를 반환한다', () => {
      const board = createHexBoard(1)
      expect(isValidCoord(board, { q: 0, r: 0 })).toBe(true)
      expect(isValidCoord(board, { q: 1, r: 0 })).toBe(true)
    })

    it('보드에 존재하지 않는 좌표면 false를 반환한다', () => {
      const board = createHexBoard(1)
      expect(isValidCoord(board, { q: 5, r: 5 })).toBe(false)
    })
  })

  describe('getWalkableNeighbors', () => {
    it('이동 가능한 인접 좌표를 반환한다', () => {
      const board: HexBoard = new Map()
      board.set('0,0', { coord: { q: 0, r: 0 }, type: 'plain' })
      board.set('1,0', { coord: { q: 1, r: 0 }, type: 'plain' })
      board.set('-1,0', { coord: { q: -1, r: 0 }, type: 'mountain' })
      board.set('0,1', { coord: { q: 0, r: 1 }, type: 'lake' })

      const walkable = getWalkableNeighbors(board, { q: 0, r: 0 })
      expect(walkable).toHaveLength(1)
      expect(walkable[0]).toEqual({ q: 1, r: 0 })
    })
  })

  describe('getReachableCoords', () => {
    it('이동력 내 도달 가능한 좌표를 반환한다', () => {
      const board = createHexBoard(3)
      const reachable = getReachableCoords(board, { q: 0, r: 0 }, 2)

      // 시작점 포함
      expect(reachable.has('0,0')).toBe(true)
      expect(reachable.get('0,0')).toBe(0)

      // 인접 좌표는 거리 1
      expect(reachable.get('1,0')).toBe(1)
    })

    it('장애물을 우회한다', () => {
      const board: HexBoard = new Map()
      board.set('0,0', { coord: { q: 0, r: 0 }, type: 'plain' })
      board.set('1,0', { coord: { q: 1, r: 0 }, type: 'mountain' })
      board.set('2,0', { coord: { q: 2, r: 0 }, type: 'plain' })
      board.set('0,1', { coord: { q: 0, r: 1 }, type: 'plain' })
      board.set('1,1', { coord: { q: 1, r: 1 }, type: 'plain' })

      const reachable = getReachableCoords(board, { q: 0, r: 0 }, 3)

      // 산악은 도달 불가
      expect(reachable.has('1,0')).toBe(false)
    })
  })
})
