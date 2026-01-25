import type { HexCoord } from '@forgod/core'

// 타일 타입별 색상 매핑
export const TILE_COLORS: Record<string, string> = {
  plain: '#8b7355',    // 평지 (갈색)
  village: '#48bb78',  // 마을 (초록)
  mountain: '#4a4a4a', // 산 (진한 회색)
  lake: '#2d8ac7',     // 호수 (파랑)
  hill: '#7a6b5a',     // 언덕 (갈색 + 회색)
  swamp: '#4a6741',    // 늪 (어두운 초록)
  fire: '#d94f30',     // 화염 (주황빨강)
  temple: '#ffd700',   // 신전 (금색)
  castle: '#5c3d6e',   // 마왕성 (어두운 보라)
  monster: '#6b2d5c',  // 몬스터 스폰 (자주색)
}

// 직업별 색상
export const CLASS_COLORS: Record<string, string> = {
  warrior: '#ef4444', // 빨강
  rogue: '#22c55e',   // 초록
  mage: '#3b82f6',    // 파랑
}

/**
 * Axial 좌표를 화면(픽셀) 좌표로 변환 (flat-top hexagon)
 */
export function axialToPixel(coord: HexCoord, size: number): { x: number; y: number } {
  const x = size * (3/2 * coord.q)
  const y = size * (Math.sqrt(3)/2 * coord.q + Math.sqrt(3) * coord.r)
  return { x, y }
}

/**
 * 헥사곤의 6개 꼭지점 좌표 계산 (flat-top)
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
 * 보드의 바운딩 박스 계산
 */
export function calculateBoardBounds(
  tiles: Array<{ coord: HexCoord }>,
  size: number
): { minX: number; minY: number; maxX: number; maxY: number; width: number; height: number } {
  if (tiles.length === 0) {
    return { minX: 0, minY: 0, maxX: 100, maxY: 100, width: 100, height: 100 }
  }

  let minX = Infinity
  let minY = Infinity
  let maxX = -Infinity
  let maxY = -Infinity

  for (const tile of tiles) {
    const { x, y } = axialToPixel(tile.coord, size)
    minX = Math.min(minX, x - size)
    minY = Math.min(minY, y - size)
    maxX = Math.max(maxX, x + size)
    maxY = Math.max(maxY, y + size)
  }

  return {
    minX,
    minY,
    maxX,
    maxY,
    width: maxX - minX,
    height: maxY - minY,
  }
}
