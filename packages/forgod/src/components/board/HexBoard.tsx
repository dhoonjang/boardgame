import { useRef, useState, useCallback, useMemo } from 'react'
import { useGesture } from '@use-gesture/react'
import { GAME_BOARD } from '@forgod/core'
import type { HexTile as HexTileType, Player, Monster, CloneInfo, HexCoord } from '@forgod/core'
import { calculateBoardBounds, pixelToAxial, coordKey } from '../../utils/hexUtils'
import { useGameStore } from '../../store/gameStore'
import HexTile from './HexTile'
import BoardOverlay from './BoardOverlay'
import PlayerToken from './PlayerToken'
import MonsterToken from './MonsterToken'
import CloneToken from './CloneToken'
import DemonSwordMarker from './DemonSwordMarker'

const HEX_SIZE = 28

interface HexBoardProps {
  tiles?: HexTileType[]
  players: Player[]
  monsters: Monster[]
  clones?: CloneInfo[]
  demonSwordPosition?: HexCoord | null
  currentPlayerId: string | null
  onTileClick?: (coord: HexCoord) => void
  onPlayerClick?: (playerId: string) => void
  onMonsterClick?: (monsterId: string) => void
}

export default function HexBoard({
  tiles: propTiles,
  players,
  monsters,
  clones = [],
  demonSwordPosition,
  currentPlayerId,
  onTileClick,
  onPlayerClick,
  onMonsterClick,
}: HexBoardProps) {
  const containerRef = useRef<HTMLDivElement>(null)
  const [zoom, setZoom] = useState(1)
  const [pan, setPan] = useState({ x: 0, y: 0 })
  const [_hoveredTile] = useState<string | null>(null)

  const { highlightedTiles, interactionMode, validActions } = useGameStore()

  const tiles = propTiles ?? GAME_BOARD
  const bounds = useMemo(() => calculateBoardBounds(tiles, HEX_SIZE), [tiles])
  const padding = 40
  const viewBox = `${bounds.minX - padding} ${bounds.minY - padding} ${bounds.width + padding * 2} ${bounds.height + padding * 2}`

  // Highlight set for O(1) lookup
  const highlightSet = useMemo(() => {
    const s = new Set<string>()
    highlightedTiles.forEach(t => s.add(coordKey(t)))
    return s
  }, [highlightedTiles])

  // Targetable entity IDs based on interaction mode
  const targetableIds = useMemo(() => {
    const ids = new Set<string>()
    if (interactionMode === 'attack') {
      for (const va of validActions) {
        if (va.action.type === 'BASIC_ATTACK') {
          ids.add((va.action as { targetId: string }).targetId)
        }
      }
    } else if (interactionMode === 'skill_target') {
      // 모든 살아있는 엔티티 (자기 자신 제외) - 엔진이 유효성 검증
      for (const p of players) {
        if (p.id !== currentPlayerId && !p.isDead) ids.add(p.id)
      }
      for (const m of monsters) {
        if (!m.isDead) ids.add(m.id)
      }
    }
    return ids
  }, [interactionMode, validActions, players, monsters, currentPlayerId])

  // Group players by position
  const playersByPos = useMemo(() => {
    const map = new Map<string, Player[]>()
    for (const p of players) {
      const key = coordKey(p.position)
      const arr = map.get(key) || []
      arr.push(p)
      map.set(key, arr)
    }
    return map
  }, [players])

  // Whether current player knows demon sword position
  const showDemonSword = useMemo(() => {
    if (!demonSwordPosition) return false
    const cp = players.find(p => p.id === currentPlayerId)
    return cp?.knowsDemonSwordPosition ?? false
  }, [demonSwordPosition, currentPlayerId, players])

  // Gesture handling
  useGesture(
    {
      onDrag: ({ delta: [dx, dy] }) => {
        setPan(prev => ({ x: prev.x + dx, y: prev.y + dy }))
      },
      onPinch: ({ offset: [s] }) => {
        setZoom(Math.max(0.3, Math.min(3, s)))
      },
      onWheel: ({ delta: [, dy] }) => {
        setZoom(prev => Math.max(0.3, Math.min(3, prev - dy * 0.001)))
      },
    },
    {
      target: containerRef,
      drag: { filterTaps: true },
      pinch: { scaleBounds: { min: 0.3, max: 3 } },
    }
  )

  const handleSvgClick = useCallback((e: React.MouseEvent<SVGSVGElement>) => {
    if (!onTileClick || interactionMode === 'none') return
    const svg = e.currentTarget
    const ctm = svg.getScreenCTM()
    if (!ctm) return
    const svgPoint = svg.createSVGPoint()
    svgPoint.x = e.clientX
    svgPoint.y = e.clientY
    const transformed = svgPoint.matrixTransform(ctm.inverse())
    const coord = pixelToAxial(transformed.x, transformed.y, HEX_SIZE)
    const key = coordKey(coord)
    // Only fire if clicked on a valid tile
    const tileExists = tiles.some(t => coordKey(t.coord) === key)
    if (tileExists) {
      onTileClick(coord)
    }
  }, [onTileClick, interactionMode, tiles])

  const highlightColor = interactionMode === 'move' ? '#C9A84C'
    : interactionMode === 'attack' ? '#C0392B'
    : interactionMode === 'skill_target' ? '#8E44AD'
    : interactionMode === 'skill_position' ? '#2980B9'
    : interactionMode === 'escape_tile' ? '#27AE60'
    : '#C9A84C'

  return (
    <div
      ref={containerRef}
      className="w-full h-full overflow-hidden rounded-lg border-wood-frame bg-ink/30 touch-none"
    >
      <svg
        viewBox={viewBox}
        className="w-full h-full"
        style={{
          transform: `translate(${pan.x}px, ${pan.y}px) scale(${zoom})`,
          transformOrigin: 'center center',
        }}
        onClick={handleSvgClick}
      >
        {/* Layer 1: Tiles */}
        <g>
          {tiles.map(tile => {
            const key = coordKey(tile.coord)
            return (
              <HexTile
                key={key}
                tile={tile}
                size={HEX_SIZE}
                highlighted={highlightSet.has(key)}
                highlightColor={highlightColor}
                hovered={_hoveredTile === key}
              />
            )
          })}
        </g>

        {/* Layer 2: Highlight overlay (redundant with tile highlight, but useful for range display) */}
        {highlightedTiles.length > 0 && interactionMode !== 'none' && (
          <BoardOverlay tiles={highlightedTiles} size={HEX_SIZE} color={highlightColor} opacity={0.2} dashed />
        )}

        {/* Layer 3: Demon sword marker */}
        {demonSwordPosition && (
          <DemonSwordMarker position={demonSwordPosition} size={HEX_SIZE} visible={showDemonSword} />
        )}

        {/* Layer 4: Clone tokens */}
        {clones.map(clone => (
          <CloneToken
            key={`clone-${clone.playerId}`}
            clone={clone}
            owner={players.find(p => p.id === clone.playerId)}
            size={HEX_SIZE}
          />
        ))}

        {/* Layer 5: Monster tokens */}
        {monsters.map(monster => (
          <g
            key={monster.id}
            onClick={(e) => { e.stopPropagation(); onMonsterClick?.(monster.id) }}
            style={{ cursor: targetableIds.has(monster.id) ? 'pointer' : onMonsterClick ? 'pointer' : 'default' }}
          >
            <MonsterToken
              monster={monster}
              size={HEX_SIZE}
              targetable={targetableIds.has(monster.id)}
              targetColor={highlightColor}
            />
          </g>
        ))}

        {/* Layer 6: Player tokens */}
        {players.map(player => {
          const posKey = coordKey(player.position)
          const group = playersByPos.get(posKey) || [player]
          const idx = group.indexOf(player)
          return (
            <PlayerToken
              key={player.id}
              player={player}
              size={HEX_SIZE}
              index={idx}
              total={group.length}
              isCurrentTurn={player.id === currentPlayerId}
              targetable={targetableIds.has(player.id)}
              targetColor={highlightColor}
              onClick={onPlayerClick ? () => onPlayerClick(player.id) : undefined}
            />
          )
        })}
      </svg>
    </div>
  )
}
