// SVG icon definitions for tile types

interface TileIconProps {
  x: number
  y: number
  size: number
}

export function PlainIcon({ x, y, size }: TileIconProps) {
  const s = size * 0.25
  return (
    <g transform={`translate(${x},${y})`}>
      <line x1={-s * 0.5} y1={s * 0.2} x2={s * 0.5} y2={s * 0.2} stroke="#8B7355" strokeWidth={1} opacity={0.5} />
      <line x1={-s * 0.3} y1={s * 0.5} x2={s * 0.3} y2={s * 0.5} stroke="#8B7355" strokeWidth={1} opacity={0.4} />
    </g>
  )
}

export function VillageIcon({ x, y, size }: TileIconProps) {
  const s = size * 0.3
  return (
    <g transform={`translate(${x},${y})`}>
      <polygon points={`0,${-s} ${s},${s * 0.3} ${-s},${s * 0.3}`} fill="#5C3D2E" opacity={0.7} />
      <rect x={-s * 0.4} y={s * 0.3} width={s * 0.8} height={s * 0.5} fill="#7A5438" opacity={0.7} />
    </g>
  )
}

export function MountainIcon({ x, y, size }: TileIconProps) {
  const s = size * 0.35
  return (
    <g transform={`translate(${x},${y})`}>
      <polygon points={`0,${-s} ${s},${s * 0.6} ${-s},${s * 0.6}`} fill="#555" opacity={0.6} />
      <polygon points={`0,${-s} ${s * 0.3},${-s * 0.3} ${-s * 0.3},${-s * 0.3}`} fill="#DDD" opacity={0.5} />
    </g>
  )
}

export function LakeIcon({ x, y, size }: TileIconProps) {
  const s = size * 0.25
  return (
    <g transform={`translate(${x},${y})`}>
      <path d={`M${-s},0 Q${-s * 0.5},${-s * 0.4} 0,0 Q${s * 0.5},${s * 0.4} ${s},0`} fill="none" stroke="#3A7CA5" strokeWidth={1.5} opacity={0.6} />
      <path d={`M${-s * 0.7},${s * 0.5} Q${-s * 0.2},${s * 0.1} ${s * 0.3},${s * 0.5}`} fill="none" stroke="#3A7CA5" strokeWidth={1} opacity={0.4} />
    </g>
  )
}

export function HillIcon({ x, y, size }: TileIconProps) {
  const s = size * 0.3
  return (
    <g transform={`translate(${x},${y})`}>
      <ellipse cx={0} cy={s * 0.2} rx={s} ry={s * 0.5} fill="#7A6040" opacity={0.5} />
      <ellipse cx={s * 0.4} cy={-s * 0.1} rx={s * 0.6} ry={s * 0.35} fill="#8A7050" opacity={0.4} />
    </g>
  )
}

export function SwampIcon({ x, y, size }: TileIconProps) {
  const s = size * 0.25
  return (
    <g transform={`translate(${x},${y})`}>
      <circle cx={-s * 0.3} cy={0} r={s * 0.15} fill="#3A5A30" opacity={0.5} />
      <circle cx={s * 0.3} cy={s * 0.2} r={s * 0.12} fill="#3A5A30" opacity={0.4} />
      <line x1={0} y1={-s * 0.6} x2={0} y2={s * 0.3} stroke="#4A6A40" strokeWidth={1.5} opacity={0.5} />
      <line x1={0} y1={-s * 0.5} x2={s * 0.3} y2={-s * 0.7} stroke="#4A6A40" strokeWidth={1} opacity={0.4} />
    </g>
  )
}

export function FireIcon({ x, y, size }: TileIconProps) {
  const s = size * 0.3
  return (
    <g transform={`translate(${x},${y})`}>
      <path d={`M0,${-s} Q${s * 0.5},${-s * 0.3} ${s * 0.3},${s * 0.3} Q${s * 0.1},${s * 0.6} 0,${s * 0.4} Q${-s * 0.1},${s * 0.6} ${-s * 0.3},${s * 0.3} Q${-s * 0.5},${-s * 0.3} 0,${-s}`} fill="#D94F30" opacity={0.6} />
      <path d={`M0,${-s * 0.4} Q${s * 0.2},0 ${s * 0.1},${s * 0.3} Q0,${s * 0.4} ${-s * 0.1},${s * 0.3} Q${-s * 0.2},0 0,${-s * 0.4}`} fill="#FFB020" opacity={0.5} />
    </g>
  )
}

export function TempleIcon({ x, y, size }: TileIconProps) {
  const s = size * 0.3
  return (
    <g transform={`translate(${x},${y})`}>
      <polygon points={`0,${-s * 0.8} ${s * 0.8},${-s * 0.1} ${s * 0.5},${s * 0.6} ${-s * 0.5},${s * 0.6} ${-s * 0.8},${-s * 0.1}`} fill="#D4AF37" opacity={0.6} />
      <circle cx={0} cy={0} r={s * 0.2} fill="#FFF8E0" opacity={0.7} />
    </g>
  )
}

export function CastleIcon({ x, y, size }: TileIconProps) {
  const s = size * 0.3
  return (
    <g transform={`translate(${x},${y})`}>
      <rect x={-s * 0.6} y={-s * 0.2} width={s * 1.2} height={s * 0.8} fill="#4A2A5A" opacity={0.6} />
      <rect x={-s * 0.7} y={-s * 0.7} width={s * 0.3} height={s * 0.5} fill="#4A2A5A" opacity={0.6} />
      <rect x={s * 0.4} y={-s * 0.7} width={s * 0.3} height={s * 0.5} fill="#4A2A5A" opacity={0.6} />
      <polygon points={`${-s * 0.1},${-s * 0.8} ${s * 0.1},${-s * 0.8} 0,${-s}`} fill="#6B4D7A" opacity={0.5} />
    </g>
  )
}

export function MonsterIcon({ x, y, size }: TileIconProps) {
  const s = size * 0.3
  return (
    <g transform={`translate(${x},${y})`}>
      <circle cx={0} cy={0} r={s * 0.6} fill="#6B2050" opacity={0.5} />
      <circle cx={-s * 0.2} cy={-s * 0.15} r={s * 0.12} fill="#FF4444" opacity={0.6} />
      <circle cx={s * 0.2} cy={-s * 0.15} r={s * 0.12} fill="#FF4444" opacity={0.6} />
    </g>
  )
}

const TILE_ICON_MAP: Record<string, React.FC<TileIconProps>> = {
  plain: PlainIcon,
  village: VillageIcon,
  mountain: MountainIcon,
  lake: LakeIcon,
  hill: HillIcon,
  swamp: SwampIcon,
  fire: FireIcon,
  temple: TempleIcon,
  castle: CastleIcon,
  monster: MonsterIcon,
}

export function getTileIcon(type: string): React.FC<TileIconProps> | null {
  return TILE_ICON_MAP[type] ?? null
}
