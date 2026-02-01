import type { HeroClass, HexCoord, HexTile } from '@forgod/core'
import { GAME_BOARD } from '@forgod/core'
import { axialToPixel, calculateBoardBounds } from '../utils/hexUtils'
import HexTileComponent from './HexTile'
import PlayerToken from './PlayerToken'

interface PlayerData {
  id: string
  name: string
  heroClass: HeroClass
  position: HexCoord
  isDead: boolean
}

interface MonsterData {
  id: string
  name: string
  health: number
  maxHealth: number
  isDead: boolean
}

interface HexBoardProps {
  tiles: HexTile[]
  players: PlayerData[]
  monsters: MonsterData[]
  currentPlayerId: string | null
  showCoords?: boolean
  useDevBoard?: boolean  // true면 서버 데이터 대신 로컬 GAME_BOARD 사용 (HMR 지원)
}

export default function HexBoard({
  tiles,
  players,
  monsters,
  currentPlayerId,
  showCoords = false,
  useDevBoard = false,  // 기본값 false로 서버 데이터 사용
}: HexBoardProps) {
  // 개발 모드에서는 로컬 GAME_BOARD 사용 (수정 시 즉시 반영)
  const boardTiles = useDevBoard ? GAME_BOARD : tiles
  const size = 40 // 헥스 타일 크기
  const padding = 20

  // 보드 바운딩 박스 계산
  const bounds = calculateBoardBounds(boardTiles, size)
  const viewBox = `${bounds.minX - padding} ${bounds.minY - padding} ${bounds.width + padding * 2} ${bounds.height + padding * 2}`

  // 같은 위치의 플레이어 그룹화
  const playersByPosition = groupByPosition(players)

  // 몬스터 ID로 몬스터 데이터 찾기
  const monstersById = new Map(monsters.map(m => [m.id, m]))

  return (
    <svg
      viewBox={viewBox}
      className="w-full h-full"
      style={{ maxHeight: '100%' }}
    >
      {/* 배경 */}
      <rect
        x={bounds.minX - padding}
        y={bounds.minY - padding}
        width={bounds.width + padding * 2}
        height={bounds.height + padding * 2}
        fill="#0f172a"
      />

      {/* 타일 렌더링 */}
      {boardTiles.map(tile => (
        <HexTileComponent
          key={`${tile.coord.q},${tile.coord.r}`}
          coord={tile.coord}
          type={tile.type}
          villageClass={tile.villageClass}
          monsterName={tile.monsterName}
          size={size}
          showCoords={showCoords}
        />
      ))}

      {/* 몬스터 HP 바 렌더링 */}
      {boardTiles
        .filter(tile => tile.type === 'monster' && (tile as any).monsterId)
        .map(tile => {
          const monsterId = (tile as any).monsterId as string
          const monster = monstersById.get(monsterId)
          if (!monster || monster.isDead) return null
          const { x, y } = axialToPixel(tile.coord, size)
          const barWidth = size * 0.8
          const barHeight = 6
          const hpRatio = monster.health / monster.maxHealth

          return (
            <g key={`monster-hp-${monsterId}`}>
              {/* HP 바 배경 */}
              <rect
                x={x - barWidth / 2}
                y={y + size * 0.35}
                width={barWidth}
                height={barHeight}
                fill="#374151"
                rx="2"
              />
              {/* HP 바 */}
              <rect
                x={x - barWidth / 2}
                y={y + size * 0.35}
                width={barWidth * hpRatio}
                height={barHeight}
                fill={hpRatio > 0.5 ? '#22c55e' : hpRatio > 0.25 ? '#eab308' : '#ef4444'}
                rx="2"
              />
              {/* HP 텍스트 */}
              <text
                x={x}
                y={y + size * 0.55}
                textAnchor="middle"
                dominantBaseline="middle"
                fill="white"
                fontSize={size * 0.2}
              >
                {monster.health}/{monster.maxHealth}
              </text>
            </g>
          )
        })}

      {/* 플레이어 렌더링 */}
      {Object.values(playersByPosition).map(playersAtPos =>
        playersAtPos.map((player, idx) => (
          <PlayerToken
            key={player.id}
            position={player.position}
            heroClass={player.heroClass}
            name={player.name}
            isCurrentTurn={player.id === currentPlayerId}
            isDead={player.isDead}
            size={size}
            index={idx}
            totalPlayers={playersAtPos.length}
          />
        ))
      )}
    </svg>
  )
}

function groupByPosition<T extends { position: HexCoord }>(items: T[]): Record<string, T[]> {
  const groups: Record<string, T[]> = {}
  for (const item of items) {
    const key = `${item.position.q},${item.position.r}`
    if (!groups[key]) {
      groups[key] = []
    }
    groups[key].push(item)
  }
  return groups
}
