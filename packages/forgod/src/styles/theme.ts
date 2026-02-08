// Retro Board Game Design Tokens

export const colors = {
  // Core palette
  parchment: '#F5E6C8',
  parchmentLight: '#FAF0DC',
  parchmentDark: '#E8D5B0',
  woodDark: '#5C3D2E',
  woodMedium: '#7A5438',
  woodLight: '#A0724E',
  gold: '#C9A84C',
  goldLight: '#E0C878',
  goldDark: '#A08030',
  ink: '#2C1810',
  inkLight: '#4A3628',
  inkFaded: '#8B7355',

  // Tile colors (retro palette)
  tile: {
    plain: '#C4A882',
    village: '#7DAF6B',
    mountain: '#6B6B6B',
    lake: '#5B8FA8',
    hill: '#A89070',
    swamp: '#5A7A52',
    fire: '#C85A3A',
    temple: '#D4AF37',
    castle: '#6B4D7A',
    monster: '#8B3A62',
  },

  // Class colors
  warrior: '#C0392B',
  warriorLight: '#E74C3C',
  rogue: '#27AE60',
  rogueLight: '#2ECC71',
  mage: '#2980B9',
  mageLight: '#3498DB',

  // State colors
  holy: '#4A90D9',
  holyLight: '#6AAFEF',
  holyGlow: '#A8D0F5',
  corrupt: '#8E44AD',
  corruptLight: '#A569BD',
  corruptGlow: '#D4A5E8',

  // Status
  health: '#E74C3C',
  healthBg: '#4A2020',
  damage: '#FF4444',
  heal: '#44DD44',
  shield: '#6688CC',
  poison: '#88CC44',
  stealth: '#667788',
  bound: '#996644',
} as const

export const fonts = {
  heading: "'Crimson Text', Georgia, serif",
  body: "'Inter', system-ui, sans-serif",
} as const

export const CLASS_LABELS: Record<string, string> = {
  warrior: '전사',
  rogue: '도적',
  mage: '법사',
}

export const STATE_LABELS: Record<string, string> = {
  holy: '신성',
  corrupt: '타락',
}

export const TILE_LABELS: Record<string, string> = {
  plain: '평지',
  village: '마을',
  mountain: '산',
  lake: '호수',
  hill: '언덕',
  swamp: '늪',
  fire: '화염',
  temple: '신전',
  castle: '마왕성',
  monster: '몬스터',
}
