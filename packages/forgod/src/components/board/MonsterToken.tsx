import { memo } from 'react'
import type { Monster } from '@forgod/core'
import { axialToPixel } from '../../utils/hexUtils'

interface MonsterTokenProps {
  monster: Monster
  size: number
  targetable?: boolean
  targetColor?: string
}

function MonsterTokenComponent({ monster, size, targetable, targetColor }: MonsterTokenProps) {
  if (monster.isDead) return null
  const { x, y } = axialToPixel(monster.position, size)
  const r = size * 0.35
  const hpPct = monster.health / monster.maxHealth

  return (
    <g>
      {/* Targetable indicator */}
      {targetable && (
        <rect
          x={x - r - 4} y={y - r - 4}
          width={(r + 4) * 2} height={(r + 4) * 2}
          rx={6}
          fill="none"
          stroke={targetColor || '#C0392B'}
          strokeWidth={2.5}
          opacity={0.8}
        >
          <animate attributeName="opacity" values="0.9;0.4;0.9" dur="1s" repeatCount="indefinite" />
        </rect>
      )}

      {/* Monster body */}
      <rect
        x={x - r} y={y - r}
        width={r * 2} height={r * 2}
        rx={4}
        fill="#6B2050"
        opacity={0.85}
        stroke="#4A1030"
        strokeWidth={1.5}
      />
      {/* Monster icon */}
      <text
        x={x} y={y + r * 0.15}
        textAnchor="middle"
        fontSize={r * 1.1}
        style={{ pointerEvents: 'none' }}
      >
        {getMonsterEmoji(monster.id)}
      </text>

      {/* HP bar background */}
      <rect
        x={x - r} y={y + r + 2}
        width={r * 2} height={4}
        rx={2}
        fill="#2C1810"
        opacity={0.6}
      />
      {/* HP bar fill */}
      <rect
        x={x - r} y={y + r + 2}
        width={r * 2 * hpPct} height={4}
        rx={2}
        fill={hpPct > 0.5 ? '#27AE60' : hpPct > 0.25 ? '#C9A84C' : '#C0392B'}
      />
      {/* HP text */}
      <text
        x={x} y={y + r + 14}
        textAnchor="middle"
        fontSize={size * 0.15}
        fill="#F5E6C8"
        fontFamily="Inter, sans-serif"
        fontWeight="600"
        style={{ pointerEvents: 'none' }}
      >
        {monster.health}/{monster.maxHealth}
      </text>
    </g>
  )
}

function getMonsterEmoji(id: string): string {
  const map: Record<string, string> = {
    harpy: '\u{1F985}',     // eagle
    grindylow: '\u{1F419}', // octopus
    lich: '\u{1F480}',      // skull
    troll: '\u{1F9CC}',     // troll
    hydra: '\u{1F409}',     // dragon
    golem: '\u{1FAA8}',     // rock
    balrog: '\u{1F525}',    // fire
  }
  return map[id] || '\u{1F47E}'
}

export default memo(MonsterTokenComponent)
