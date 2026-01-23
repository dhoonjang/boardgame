// 직업 타입
export type HeroClass = 'warrior' | 'rogue' | 'mage'

// 상태 타입
export type HeroState = 'holy' | 'corrupt'

// 타일 타입
export type TileType = 'plain' | 'village' | 'mountain' | 'lake' | 'hill' | 'swamp' | 'fire' | 'temple' | 'castle'

// 아이템 종류
export type ItemType = 'weapon' | 'armor' | 'boots'

// 계시 주체
export type RevelationSource = 'angel' | 'demon'

// 능력치
export interface Stats {
  strength: [number, number]  // 힘 주사위 2개
  dexterity: [number, number] // 민첩 주사위 2개
  intelligence: [number, number] // 지능 주사위 2개
}

// 플레이어
export interface Player {
  id: string
  name: string
  heroClass: HeroClass
  state: HeroState
  stats: Stats
  corruptDice: number | null // 타락 주사위 (null이면 없음)
  corruptDiceTarget: keyof Stats | null // 타락 주사위가 적용된 능력치
  health: number
  maxHealth: number
  position: { x: number; y: number }
  items: Item[]
  revelations: Revelation[]
  monsterEssence: number
  isDead: boolean
  deathTurnsRemaining: number
  skillCooldowns: Record<string, number>
}

// 스킬
export interface Skill {
  id: string
  name: string
  description: string
  cost: number
  cooldown: number
  heroClass: HeroClass
}

// 아이템
export interface Item {
  id: string
  name: string
  description: string
  type: ItemType
  heroClass: HeroClass | 'all' | 'cursed'
}

// 계시 카드
export interface Revelation {
  id: string
  name: string
  source: RevelationSource
  task: string
  reward: string
  isVictory: boolean
}

// 타일
export interface Tile {
  x: number
  y: number
  type: TileType
  villageClass?: HeroClass // 마을인 경우 직업
}

// 몬스터
export interface Monster {
  id: string
  name: string
  position: { x: number; y: number }
  health: number
  maxHealth: number
  diceIndices: [number, number] // 사용하는 주사위 인덱스
  isDead: boolean
}

// 게임 상태
export interface GameState {
  id: string
  players: Player[]
  currentPlayerIndex: number
  currentPhase: 'move' | 'action' | 'monster'
  roundNumber: number
  firstPlayerIndex: number
  board: Tile[][]
  monsters: Monster[]
  monsterDice: number[] // 6개의 몬스터 주사위
  availableItems: Item[]
  revelationDeck: Revelation[]
}

// 액션 타입
export type GameAction =
  | { type: 'ROLL_MOVE_DICE' }
  | { type: 'MOVE'; position: { x: number; y: number } }
  | { type: 'BASIC_ATTACK'; targetId: string }
  | { type: 'USE_SKILL'; skillId: string; targetId?: string; position?: { x: number; y: number } }
  | { type: 'ROLL_STAT_DICE'; stat: keyof Stats }
  | { type: 'END_TURN' }
  | { type: 'COMPLETE_REVELATION'; revelationId: string }
