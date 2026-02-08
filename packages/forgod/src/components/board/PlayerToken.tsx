import { memo } from 'react'
import { motion } from 'framer-motion'
import type { Player } from '@forgod/core'
import { axialToPixel, CLASS_COLORS, STATE_COLORS, getTokenOffset } from '../../utils/hexUtils'

interface PlayerTokenProps {
  player: Player
  size: number
  index: number
  total: number
  isCurrentTurn: boolean
  targetable?: boolean
  targetColor?: string
  onClick?: () => void
}

// Class weapon icons as SVG paths
const CLASS_ICONS: Record<string, (s: number) => JSX.Element> = {
  warrior: (s) => (
    <g>
      <line x1={0} y1={-s * 0.35} x2={0} y2={s * 0.2} stroke="#F5E6C8" strokeWidth={s * 0.08} strokeLinecap="round" />
      <line x1={-s * 0.15} y1={-s * 0.1} x2={s * 0.15} y2={-s * 0.1} stroke="#F5E6C8" strokeWidth={s * 0.06} strokeLinecap="round" />
    </g>
  ),
  rogue: (s) => (
    <g>
      <line x1={-s * 0.08} y1={-s * 0.3} x2={s * 0.08} y2={s * 0.15} stroke="#F5E6C8" strokeWidth={s * 0.06} strokeLinecap="round" />
      <line x1={s * 0.08} y1={-s * 0.3} x2={-s * 0.08} y2={s * 0.15} stroke="#F5E6C8" strokeWidth={s * 0.06} strokeLinecap="round" />
    </g>
  ),
  mage: (s) => (
    <g>
      <line x1={0} y1={-s * 0.35} x2={0} y2={s * 0.25} stroke="#F5E6C8" strokeWidth={s * 0.05} strokeLinecap="round" />
      <circle cx={0} cy={-s * 0.35} r={s * 0.08} fill="#A8D0F5" opacity={0.8} />
    </g>
  ),
}

function PlayerTokenComponent({ player, size, index, total, isCurrentTurn, targetable, targetColor, onClick }: PlayerTokenProps) {
  const { x, y } = axialToPixel(player.position, size)
  const { dx, dy } = getTokenOffset(index, total, size * 0.3)
  const r = size * 0.28
  const classColor = CLASS_COLORS[player.heroClass]
  const stateColor = STATE_COLORS[player.state]

  return (
    <motion.g
      animate={{ x: x + dx, y: y + dy }}
      transition={{ type: 'spring', stiffness: 200, damping: 25 }}
      onClick={(e) => { e.stopPropagation(); onClick?.() }}
      style={{ cursor: onClick ? 'pointer' : 'default' }}
    >
      {/* Targetable indicator */}
      {targetable && (
        <circle r={r + 5} fill="none" stroke={targetColor || '#C0392B'} strokeWidth={2.5} opacity={0.8}>
          <animate attributeName="r" values={`${r + 4};${r + 8};${r + 4}`} dur="1s" repeatCount="indefinite" />
          <animate attributeName="opacity" values="0.9;0.4;0.9" dur="1s" repeatCount="indefinite" />
        </circle>
      )}

      {/* Current turn indicator */}
      {isCurrentTurn && !targetable && (
        <circle r={r + 4} fill="none" stroke={stateColor} strokeWidth={2} opacity={0.7}>
          <animate attributeName="r" values={`${r + 3};${r + 6};${r + 3}`} dur="2s" repeatCount="indefinite" />
          <animate attributeName="opacity" values="0.7;0.3;0.7" dur="2s" repeatCount="indefinite" />
        </circle>
      )}

      {/* State ring */}
      <circle r={r + 1.5} fill="none" stroke={stateColor} strokeWidth={1.5} opacity={0.6} />

      {/* Main body */}
      <circle r={r} fill={classColor} opacity={player.isDead ? 0.4 : 0.9} />

      {/* Class icon */}
      {!player.isDead && CLASS_ICONS[player.heroClass]?.(r)}

      {/* Dead X */}
      {player.isDead && (
        <g>
          <line x1={-r * 0.4} y1={-r * 0.4} x2={r * 0.4} y2={r * 0.4} stroke="#FF4444" strokeWidth={2} />
          <line x1={r * 0.4} y1={-r * 0.4} x2={-r * 0.4} y2={r * 0.4} stroke="#FF4444" strokeWidth={2} />
        </g>
      )}

      {/* Buff indicators */}
      {player.isStealthed && (
        <circle r={r} fill="none" stroke="#667788" strokeWidth={1} strokeDasharray="3 2" opacity={0.8} />
      )}
      {player.ironStanceActive && (
        <circle r={r + 3} fill="none" stroke="#6688CC" strokeWidth={1.5} opacity={0.5} />
      )}
      {player.hasDemonSword && (
        <g transform={`translate(${r * 0.6}, ${-r * 0.6})`}>
          <line x1={0} y1={-4} x2={0} y2={4} stroke="#C9A84C" strokeWidth={1.5} />
          <line x1={-2} y1={-1} x2={2} y2={-1} stroke="#C9A84C" strokeWidth={1} />
        </g>
      )}

      {/* Player initial */}
      <text
        y={r + size * 0.18}
        textAnchor="middle"
        fontSize={size * 0.18}
        fill="#F5E6C8"
        fontFamily="'Crimson Text', serif"
        fontWeight="bold"
        style={{ pointerEvents: 'none' }}
      >
        {player.name.charAt(0)}
      </text>
    </motion.g>
  )
}

export default memo(PlayerTokenComponent)
