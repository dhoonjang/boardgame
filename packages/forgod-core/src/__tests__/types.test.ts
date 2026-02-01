import { describe, it, expect } from 'vitest'
import {
  coordToKey,
  keyToCoord,
  serializeBoard,
  deserializeBoard,
  type HexCoord,
  type HexTile,
  type HexBoard,
} from '../types'

describe('types', () => {
  describe('coordToKey', () => {
    it('좌표를 문자열 키로 변환한다', () => {
      expect(coordToKey({ q: 0, r: 0 })).toBe('0,0')
      expect(coordToKey({ q: 1, r: -1 })).toBe('1,-1')
      expect(coordToKey({ q: -3, r: 5 })).toBe('-3,5')
    })
  })

  describe('keyToCoord', () => {
    it('문자열 키를 좌표로 변환한다', () => {
      expect(keyToCoord('0,0')).toEqual({ q: 0, r: 0 })
      expect(keyToCoord('1,-1')).toEqual({ q: 1, r: -1 })
      expect(keyToCoord('-3,5')).toEqual({ q: -3, r: 5 })
    })
  })

  describe('coordToKey와 keyToCoord', () => {
    it('변환이 역연산이다', () => {
      const coords: HexCoord[] = [
        { q: 0, r: 0 },
        { q: 5, r: -3 },
        { q: -2, r: 7 },
      ]

      for (const coord of coords) {
        expect(keyToCoord(coordToKey(coord))).toEqual(coord)
      }
    })
  })

  describe('serializeBoard / deserializeBoard', () => {
    it('보드를 직렬화하고 역직렬화한다', () => {
      const tiles: HexTile[] = [
        { coord: { q: 0, r: 0 }, type: 'temple' },
        { coord: { q: 1, r: 0 }, type: 'village', villageClass: 'warrior' },
        { coord: { q: -1, r: 1 }, type: 'mountain' },
      ]

      const board: HexBoard = new Map()
      for (const tile of tiles) {
        board.set(coordToKey(tile.coord), tile)
      }

      const serialized = serializeBoard(board)
      expect(serialized).toHaveLength(3)

      const deserialized = deserializeBoard(serialized)
      expect(deserialized.size).toBe(3)
      expect(deserialized.get('0,0')?.type).toBe('temple')
      expect(deserialized.get('1,0')?.villageClass).toBe('warrior')
      expect(deserialized.get('-1,1')?.type).toBe('mountain')
    })

    it('빈 보드를 처리한다', () => {
      const board: HexBoard = new Map()
      const serialized = serializeBoard(board)
      expect(serialized).toHaveLength(0)

      const deserialized = deserializeBoard([])
      expect(deserialized.size).toBe(0)
    })
  })
})
