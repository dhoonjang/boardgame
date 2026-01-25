import type { HexCoord } from '@forgod/core'
import { axialToPixel } from '../utils/hexUtils'

interface MonsterTokenProps {
  position: HexCoord
  health: number
  maxHealth: number
  isDead: boolean
  size: number
  index: number
  totalMonsters: number
}

export default function MonsterToken({
  position,
  health,
  maxHealth,
  isDead,
  size,
  index,
  totalMonsters,
}: MonsterTokenProps) {
  const { x, y } = axialToPixel(position, size)
  const tokenSize = size * 0.25

  // 같은 타일에 여러 몬스터가 있을 경우 오프셋 적용
  const angleOffset = (2 * Math.PI * index) / totalMonsters + Math.PI / 4
  const offsetRadius = totalMonsters > 1 ? size * 0.3 : 0
  const offsetX = Math.cos(angleOffset) * offsetRadius
  const offsetY = Math.sin(angleOffset) * offsetRadius

  if (isDead) return null

  return (
    <g>
      {/* 몬스터 토큰 (사각형) */}
      <rect
        x={x + offsetX - tokenSize}
        y={y + offsetY - tokenSize}
        width={tokenSize * 2}
        height={tokenSize * 2}
        fill="#7c3aed"
        stroke="#fff"
        strokeWidth="2"
        rx="3"
      />
      {/* 몬스터 아이콘 */}
      <text
        x={x + offsetX}
        y={y + offsetY}
        textAnchor="middle"
        dominantBaseline="middle"
        fontSize={tokenSize * 1.2}
      >
        {'\ud83d\udc7e'}
      </text>
      {/* HP 바 */}
      <rect
        x={x + offsetX - tokenSize}
        y={y + offsetY + tokenSize + 2}
        width={tokenSize * 2}
        height={4}
        fill="#374151"
        rx="2"
      />
      <rect
        x={x + offsetX - tokenSize}
        y={y + offsetY + tokenSize + 2}
        width={(tokenSize * 2 * health) / maxHealth}
        height={4}
        fill="#ef4444"
        rx="2"
      />
    </g>
  )
}
