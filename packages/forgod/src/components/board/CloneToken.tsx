import { memo } from 'react'
import type { CloneInfo, Player } from '@forgod/core'
import { axialToPixel } from '../../utils/hexUtils'

interface CloneTokenProps {
  clone: CloneInfo
  owner: Player | undefined
  size: number
}

function CloneTokenComponent({ clone, owner, size }: CloneTokenProps) {
  const { x, y } = axialToPixel(clone.position, size)
  const r = size * 0.2

  return (
    <g opacity={0.5}>
      <circle cx={x} cy={y} r={r} fill="#2980B9" stroke="#6AAFEF" strokeWidth={1} strokeDasharray="3 2" />
      <circle cx={x} cy={y - r * 0.35} r={r * 0.08} fill="#A8D0F5" opacity={0.8} />
      <line x1={x} y1={y - r * 0.35} x2={x} y2={y + r * 0.25} stroke="#F5E6C8" strokeWidth={r * 0.05} />
      {owner && (
        <text
          x={x} y={y + r + size * 0.12}
          textAnchor="middle"
          fontSize={size * 0.13}
          fill="#6AAFEF"
          fontFamily="'Crimson Text', serif"
          style={{ pointerEvents: 'none' }}
        >
          {owner.name.charAt(0)}
        </text>
      )}
    </g>
  )
}

export default memo(CloneTokenComponent)
