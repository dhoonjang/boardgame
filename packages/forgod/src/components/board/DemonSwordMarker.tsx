import { memo } from 'react'
import type { HexCoord } from '@forgod/core'
import { axialToPixel } from '../../utils/hexUtils'

interface DemonSwordMarkerProps {
  position: HexCoord
  size: number
  visible: boolean
}

function DemonSwordMarkerComponent({ position, size, visible }: DemonSwordMarkerProps) {
  if (!visible) return null
  const { x, y } = axialToPixel(position, size)
  const s = size * 0.25

  return (
    <g>
      {/* Glow pulse */}
      <circle cx={x} cy={y} r={s * 1.5} fill="#C9A84C" opacity={0.15}>
        <animate attributeName="r" values={`${s * 1.2};${s * 2};${s * 1.2}`} dur="2s" repeatCount="indefinite" />
        <animate attributeName="opacity" values="0.15;0.05;0.15" dur="2s" repeatCount="indefinite" />
      </circle>
      {/* Sword icon */}
      <g transform={`translate(${x},${y})`}>
        <line x1={0} y1={-s * 0.8} x2={0} y2={s * 0.6} stroke="#C9A84C" strokeWidth={2} strokeLinecap="round" />
        <line x1={-s * 0.3} y1={-s * 0.1} x2={s * 0.3} y2={-s * 0.1} stroke="#C9A84C" strokeWidth={1.5} strokeLinecap="round" />
        <circle cx={0} cy={s * 0.6} r={s * 0.1} fill="#C9A84C" />
      </g>
    </g>
  )
}

export default memo(DemonSwordMarkerComponent)
