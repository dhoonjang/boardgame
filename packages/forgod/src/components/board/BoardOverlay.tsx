import { memo } from 'react'
import type { HexCoord } from '@forgod/core'
import { axialToPixel, getHexCorners } from '../../utils/hexUtils'

interface BoardOverlayProps {
  tiles: HexCoord[]
  size: number
  color?: string
  opacity?: number
  dashed?: boolean
}

function BoardOverlay({ tiles, size, color = '#C9A84C', opacity = 0.3, dashed }: BoardOverlayProps) {
  return (
    <g>
      {tiles.map((coord) => {
        const { x, y } = axialToPixel(coord, size)
        const points = getHexCorners(x, y, size)
        return (
          <polygon
            key={`${coord.q},${coord.r}`}
            points={points}
            fill="none"
            stroke={color}
            strokeWidth={dashed ? 1.5 : 2}
            strokeDasharray={dashed ? '4 3' : undefined}
            opacity={opacity}
          />
        )
      })}
    </g>
  )
}

export default memo(BoardOverlay)
