import type { HexCoord, HeroClass } from '@forgod/core'
import { axialToPixel, CLASS_COLORS } from '../utils/hexUtils'

interface PlayerTokenProps {
  position: HexCoord
  heroClass: HeroClass
  name: string
  isCurrentTurn: boolean
  isDead: boolean
  size: number
  index: number
  totalPlayers: number
}

export default function PlayerToken({
  position,
  heroClass,
  name,
  isCurrentTurn,
  isDead,
  size,
  index,
  totalPlayers,
}: PlayerTokenProps) {
  const { x, y } = axialToPixel(position, size)
  const tokenSize = size * 0.3

  // 같은 타일에 여러 플레이어가 있을 경우 오프셋 적용
  const angleOffset = (2 * Math.PI * index) / totalPlayers
  const offsetRadius = totalPlayers > 1 ? size * 0.25 : 0
  const offsetX = Math.cos(angleOffset) * offsetRadius
  const offsetY = Math.sin(angleOffset) * offsetRadius

  const fillColor = CLASS_COLORS[heroClass] || '#888'

  return (
    <g opacity={isDead ? 0.4 : 1}>
      {/* 현재 턴 하이라이트 */}
      {isCurrentTurn && (
        <circle
          cx={x + offsetX}
          cy={y + offsetY}
          r={tokenSize + 4}
          fill="none"
          stroke="#ffd700"
          strokeWidth="3"
          className="animate-pulse"
        >
          <animate
            attributeName="r"
            values={`${tokenSize + 4};${tokenSize + 8};${tokenSize + 4}`}
            dur="1.5s"
            repeatCount="indefinite"
          />
        </circle>
      )}
      {/* 플레이어 토큰 (원형) */}
      <circle
        cx={x + offsetX}
        cy={y + offsetY}
        r={tokenSize}
        fill={fillColor}
        stroke="#fff"
        strokeWidth="2"
      />
      {/* 플레이어 이름 첫 글자 */}
      <text
        x={x + offsetX}
        y={y + offsetY}
        textAnchor="middle"
        dominantBaseline="middle"
        fill="white"
        fontSize={tokenSize * 1.2}
        fontWeight="bold"
      >
        {name.charAt(0)}
      </text>
      {/* 사망 표시 */}
      {isDead && (
        <text
          x={x + offsetX}
          y={y + offsetY - tokenSize - 5}
          textAnchor="middle"
          fill="#ef4444"
          fontSize={tokenSize * 0.8}
        >
          X
        </text>
      )}
    </g>
  )
}
