import type { HexCoord, HeroClass } from '@forgod/core'
import { axialToPixel, getHexCorners, TILE_COLORS } from '../utils/hexUtils'

interface HexTileProps {
  coord: HexCoord
  type: string
  villageClass?: HeroClass
  monsterName?: string
  size: number
  showCoords?: boolean
}

// 직업별 마을 색상
const VILLAGE_COLORS: Record<string, string> = {
  warrior: '#b45454',  // 붉은빛
  rogue: '#4a9e6a',    // 초록빛
  mage: '#5478b0',     // 푸른빛
}

export default function HexTile({ coord, type, villageClass, monsterName, size, showCoords = false }: HexTileProps) {
  const { x, y } = axialToPixel(coord, size)
  const points = getHexCorners(x, y, size * 0.95) // 약간 작게 해서 간격 생성

  // 마을인 경우 직업별 색상 사용
  const fillColor = type === 'village' && villageClass
    ? VILLAGE_COLORS[villageClass]
    : TILE_COLORS[type] || TILE_COLORS.plain

  return (
    <g>
      <polygon
        points={points}
        fill={fillColor}
        stroke="#1e293b"
        strokeWidth="2"
        opacity={0.9}
      />
      {/* 마을 아이콘 */}
      {type === 'village' && (
        <text
          x={x}
          y={y - size * 0.1}
          textAnchor="middle"
          dominantBaseline="middle"
          fontSize={size * 0.5}
        >
          🏠
        </text>
      )}
      {/* 타일 타입 이모지/아이콘 */}
      {type !== 'plain' && type !== 'village' && type !== 'monster' && (
        <text
          x={x}
          y={y - size * 0.15}
          textAnchor="middle"
          dominantBaseline="middle"
          fontSize={size * 0.4}
        >
          {getTileIcon(type)}
        </text>
      )}
      {/* 몬스터 타일 - 이름 표시 */}
      {type === 'monster' && monsterName && (
        <text
          x={x}
          y={y}
          textAnchor="middle"
          dominantBaseline="middle"
          fill="white"
          fontSize={size * 0.32}
          fontWeight="bold"
        >
          {monsterName}
        </text>
      )}
      {/* 좌표 표시 */}
      {showCoords && (
        <text
          x={x}
          y={y + size * 0.35}
          textAnchor="middle"
          dominantBaseline="middle"
          fill="rgba(255,255,255,0.5)"
          fontSize={size * 0.25}
        >
          {coord.q},{coord.r}
        </text>
      )}
    </g>
  )
}

function getTileIcon(type: string): string {
  switch (type) {
    case 'mountain': return '⛰️'
    case 'lake': return '🌊'
    case 'hill': return '🏔️'
    case 'swamp': return '🌿'
    case 'fire': return '🔥'
    case 'temple': return '⛪'
    case 'castle': return '🏰'
    case 'monster': return '💀'
    default: return ''
  }
}
