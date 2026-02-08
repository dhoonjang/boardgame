import { memo } from 'react'
import type { HexTile as HexTileType, HeroClass } from '@forgod/core'
import { axialToPixel, getHexCorners, TILE_COLORS, CLASS_COLORS } from '../../utils/hexUtils'
import { getTileIcon } from './TileIcons'

interface HexTileProps {
  tile: HexTileType
  size: number
  highlighted?: boolean
  highlightColor?: string
  onClick?: () => void
  hovered?: boolean
}

function getVillageColor(villageClass?: HeroClass): string {
  if (!villageClass) return TILE_COLORS.village
  const classColor = CLASS_COLORS[villageClass]
  return classColor || TILE_COLORS.village
}

function HexTileComponent({ tile, size, highlighted, highlightColor, onClick, hovered }: HexTileProps) {
  const { x, y } = axialToPixel(tile.coord, size)
  const points = getHexCorners(x, y, size)
  const baseColor = tile.type === 'village'
    ? getVillageColor(tile.villageClass)
    : TILE_COLORS[tile.type] || TILE_COLORS.plain

  const TileIcon = getTileIcon(tile.type)

  return (
    <g
      onClick={onClick}
      style={{ cursor: onClick ? 'pointer' : 'default' }}
    >
      {/* Base hex */}
      <polygon
        points={points}
        fill={baseColor}
        stroke="#5C3D2E"
        strokeWidth={1.2}
        opacity={0.85}
      />
      {/* Highlight border */}
      {highlighted && (
        <polygon
          points={points}
          fill="none"
          stroke={highlightColor || '#C9A84C'}
          strokeWidth={2.5}
          opacity={0.9}
        />
      )}
      {/* Hover overlay */}
      {hovered && (
        <polygon
          points={points}
          fill="#FFF"
          opacity={0.15}
          strokeWidth={0}
        />
      )}
      {/* Tile icon */}
      {TileIcon && <TileIcon x={x} y={y} size={size} />}
      {/* Monster name label */}
      {tile.monsterName && (
        <text
          x={x}
          y={y + size * 0.55}
          textAnchor="middle"
          fontSize={size * 0.2}
          fill="#F5E6C8"
          fontFamily="'Crimson Text', serif"
          fontWeight="bold"
          style={{ pointerEvents: 'none' }}
        >
          {tile.monsterName}
        </text>
      )}
    </g>
  )
}

export default memo(HexTileComponent)
