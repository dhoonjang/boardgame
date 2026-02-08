// 직업 타입
export type HeroClass = 'warrior' | 'rogue' | 'mage'

// 상태 타입
export type HeroState = 'holy' | 'corrupt'

// 타일 타입
export type TileType = 'plain' | 'village' | 'mountain' | 'lake' | 'hill' | 'swamp' | 'fire' | 'temple' | 'castle' | 'monster'

// 계시 주체
export type RevelationSource = 'angel' | 'demon'

// 플레이어 턴 페이즈 (이동 → 액션)
export type PlayerTurnPhase = 'move' | 'action'

// 턴 엔트리: 플레이어 ID 또는 'monster'
export type TurnEntry = string | 'monster'

// ===== 6각형 좌표계 (Axial Coordinates) =====
// q: 열 방향, r: 행 방향
// 6개의 인접 방향: (1,0), (1,-1), (0,-1), (-1,0), (-1,1), (0,1)

export interface HexCoord {
  q: number  // 열 (column)
  r: number  // 행 (row)
}

// 6각형 방향 (시계방향, 오른쪽부터)
export type HexDirection = 0 | 1 | 2 | 3 | 4 | 5

// 6각형 타일
export interface HexTile {
  coord: HexCoord
  type: TileType
  villageClass?: HeroClass // 마을인 경우 직업
  monsterId?: string       // 몬스터 타일인 경우 ID
  monsterName?: string     // 몬스터 타일인 경우 이름
}

// 6각형 보드 (Map으로 저장)
export type HexBoard = Map<string, HexTile>

// 좌표를 키로 변환
export function coordToKey(coord: HexCoord): string {
  return `${coord.q},${coord.r}`
}

// 키를 좌표로 변환
export function keyToCoord(key: string): HexCoord {
  const [q, r] = key.split(',').map(Number)
  return { q, r }
}

// ===== 기존 타입들 =====

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
  position: HexCoord
  revelations: Revelation[]           // 보유 중인 계시 카드
  completedRevelations: Revelation[]  // 완료한 계시 카드
  monsterEssence: number
  devilScore: number                  // 마왕 점수
  faithScore: number                  // 신앙 점수
  hasDemonSword: boolean              // 마검 보유 여부
  knowsDemonSwordPosition: boolean    // 마검 위치 인지 여부 (타락 상태로 마왕성 진입 시 획득)
  isDead: boolean
  deathTurnsRemaining: number
  skillCooldowns: Record<string, number>
  usedSkillCost: number            // 이번 턴에 사용한 스킬 비용 합계
  // 턴 관련 (플레이어별로 관리)
  turnPhase: PlayerTurnPhase      // 현재 턴 페이즈 (move/action)
  remainingMovement: number | null // 남은 이동력 (null이면 아직 주사위 안 굴림)
  leftoverMovement: number         // 다음 라운드 턴 순서 결정용
  turnCompleted: boolean           // 이번 라운드 턴 완료 여부
  // 버프/상태 필드
  ironStanceActive: boolean        // 무적 태세 활성 (피해를 힘 수치만큼 감소)
  poisonActive: boolean            // 독 바르기 활성 (다음 기본공격에 소모)
  isStealthed: boolean             // 은신 활성 (모든 피해 면역)
  isEnhanced: boolean              // 스킬 강화 활성 (다음 1회 스킬에 소모)
  isBound: boolean                 // 속박 (다음 턴 이동 불가, 이후 해제)
  traps: HexCoord[]                // 그림자 함정 위치 (최대 3개)
  hasUsedBasicAttack: boolean      // 이번 턴 기본공격 사용 여부
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

// 계시 카드 보상
export interface RevelationReward {
  devilScore?: number       // 마왕 점수
  faithScore?: number       // 신앙 점수
  corruptScore?: number     // 타락 점수
  extraRevelations?: number // 추가로 뽑을 수 있는 계시 카드 수
}

// 계시 카드
export interface Revelation {
  id: string
  name: string
  source: RevelationSource
  task: string
  reward: RevelationReward
  isGameEnd: boolean
}

// 몬스터
export interface Monster {
  id: string
  name: string
  position: HexCoord
  health: number
  maxHealth: number
  diceIndices: number[] // 사용하는 주사위 인덱스 (2~6개)
  isDead: boolean
}

// 몬스터 라운드 버프
export interface MonsterRoundBuffs {
  golemBasicAttackImmune: boolean   // 골렘 sum=12 기본공격 면역 (다음 라운드까지)
  meteorImmune: boolean             // 리치 sum>=15 메테오 면역 (다음 라운드까지)
  fireTileDisabled: boolean         // 발록 사망 시 화염 비활성 (부활 시 해제)
}

// 분신 정보
export interface CloneInfo {
  playerId: string
  position: HexCoord
}

// 게임 상태 (직렬화 가능한 형태)
export interface GameState {
  id: string
  players: Player[]
  roundNumber: number
  roundTurnOrder: TurnEntry[]     // 이번 라운드의 턴 순서 (플레이어 ID들 + 마지막에 'monster')
  currentTurnIndex: number        // 현재 턴 인덱스 (roundTurnOrder 내 위치)
  board: SerializedHexBoard       // JSON 직렬화를 위해 배열로 저장
  monsters: Monster[]
  monsterDice: number[]           // 6개의 몬스터 주사위
  revelationDeck: Revelation[]
  demonSwordPosition: HexCoord | null  // 마검 위치 (null이면 누군가 획득함)
  clones: CloneInfo[]             // 법사 분신 목록
  monsterRoundBuffs: MonsterRoundBuffs  // 몬스터 라운드 버프
}

// 직렬화된 보드 (JSON 저장용)
export type SerializedHexBoard = HexTile[]

// 보드 직렬화/역직렬화
export function serializeBoard(board: HexBoard): SerializedHexBoard {
  return Array.from(board.values())
}

export function deserializeBoard(tiles: SerializedHexBoard): HexBoard {
  const board = new Map<string, HexTile>()
  for (const tile of tiles) {
    board.set(coordToKey(tile.coord), tile)
  }
  return board
}

// 액션 타입
export type GameAction =
  | { type: 'ROLL_MOVE_DICE' }
  | { type: 'MOVE'; position: HexCoord }
  | { type: 'END_MOVE_PHASE' }  // 이동 페이즈 종료 → action 페이즈로 전환
  | { type: 'END_TURN' }        // action 페이즈에서 턴 종료
  | { type: 'BASIC_ATTACK'; targetId: string }
  | { type: 'USE_SKILL'; skillId: string; targetId?: string; position?: HexCoord }
  | { type: 'ROLL_STAT_DICE'; stat: keyof Stats }
  | { type: 'COMPLETE_REVELATION'; revelationId: string }
  | { type: 'APPLY_CORRUPT_DICE'; stat: keyof Stats }  // 타락 주사위 능력치에 적용
  | { type: 'CHOOSE_HOLY' }  // 부활 시 신성 선택
  | { type: 'DRAW_DEMON_SWORD' }  // 마검 뽑기
  | { type: 'CHOOSE_CORRUPTION'; accept: boolean }  // 타락 용사 처치 후 타락 여부 선택
  | { type: 'CHOOSE_ESCAPE_TILE'; position: HexCoord }  // 산/호수 탈출 시 목적지 선택

// 액션 결과
export interface ActionResult {
  success: boolean
  newState: GameState
  message: string
  events: GameEvent[]
}

// 게임 이벤트
export type GameEvent =
  | { type: 'PLAYER_MOVED'; playerId: string; from: HexCoord; to: HexCoord }
  | { type: 'PLAYER_ATTACKED'; attackerId: string; targetId: string; damage: number }
  | { type: 'PLAYER_DIED'; playerId: string }
  | { type: 'PLAYER_RESPAWNED'; playerId: string }
  | { type: 'MONSTER_DIED'; monsterId: string }
  | { type: 'REVELATION_COMPLETED'; playerId: string; revelationId: string }
  | { type: 'STAT_UPGRADED'; playerId: string; stat: keyof Stats; newValue: number }
  | { type: 'GAME_OVER'; winnerId: string }

// 유효한 액션
export interface ValidAction {
  action: GameAction
  description: string
}

// 주사위 굴림 인터페이스 (테스트에서 주입 가능)
export interface DiceRoller {
  roll1d6(): number
  roll2d6(): [number, number]
}

// 기본 주사위 굴림 구현
export const defaultDiceRoller: DiceRoller = {
  roll1d6(): number {
    return Math.floor(Math.random() * 6) + 1
  },
  roll2d6(): [number, number] {
    return [this.roll1d6(), this.roll1d6()]
  },
}
