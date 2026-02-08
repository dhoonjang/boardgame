// ─── 기본 타입 ───

export type Card = 1 | 2 | 3 | 4 | 5 | 6 | 7 | 8 | 9 | 10

export type GamePhase =
  | 'waiting'    // 상대 입장 대기
  | 'ability'    // 능력 단계 (Peek/Swap)
  | 'betting'    // 베팅 단계
  | 'showdown'   // 쇼다운 (카드 공개)
  | 'round_end'  // 라운드 종료
  | 'game_over'  // 게임 종료

export interface Player {
  id: string
  name: string
  chips: number
  card: Card | null
  swapCount: number       // 남은 교체 횟수
  currentBet: number      // 이번 라운드 누적 베팅
  hasFolded: boolean
  hasUsedAbility: boolean // 이번 라운드에 능력 사용 완료했는지
}

export interface GameState {
  id: string
  players: [Player, Player]
  deck: Card[]
  discardPile: Card[]
  pot: number
  phase: GamePhase
  roundNumber: number
  maxRounds: number
  currentPlayerIndex: number  // 현재 행동할 플레이어 (0 or 1)
  firstPlayerIndex: number    // 이번 라운드 선 플레이어 (0 or 1)
  lastRaisePlayerIndex: number | null  // 마지막으로 레이즈한 플레이어
  winner: string | null       // 게임 승자 playerId (null = 미정 or 무승부)
  isDraw: boolean
  roundHistory: RoundResult[]
}

export interface RoundResult {
  roundNumber: number
  player0Card: Card
  player1Card: Card
  winner: string | null  // playerId, null = 무승부
  potWon: number
  foldedPlayerId: string | null
  player0ChipChange: number  // player0의 이번 라운드 칩 변화 (+/-)
  player1ChipChange: number  // player1의 이번 라운드 칩 변화 (+/-)
}

// ─── 액션 ───

export type GameAction =
  | { type: 'START_ROUND' }
  | { type: 'SWAP' }
  | { type: 'SKIP_ABILITY' }
  | { type: 'RAISE'; amount: number }
  | { type: 'CALL' }
  | { type: 'FOLD' }

export type GameActionType = GameAction['type']

export interface GameEvent {
  type: string
  playerId?: string
  message: string
  data?: Record<string, unknown>
}

export interface ActionResult {
  success: boolean
  newState: GameState
  message: string
  events: GameEvent[]
}

// ─── 유효 액션 ───

export interface ValidAction {
  type: GameActionType
  description: string
  minAmount?: number
  maxAmount?: number
}

// ─── PlayerView (클라이언트에게 전송되는 뷰) ───

export interface PlayerViewPlayer {
  id: string
  name: string
  chips: number
  currentBet: number
  hasFolded: boolean
  hasUsedAbility: boolean
  swapCount: number
}

export interface PlayerView {
  gameId: string
  phase: GamePhase
  roundNumber: number
  maxRounds: number
  pot: number
  currentPlayerIndex: number
  firstPlayerIndex: number
  myIndex: number
  opponentCard: Card | null // 상대 카드: 인디언 포커 핵심 — 항상 보임
  me: PlayerViewPlayer
  opponent: PlayerViewPlayer
  winner: string | null
  isDraw: boolean
  roundHistory: RoundResult[]
  deckRemaining: number
}

// ─── AI 페르소나 정보 (클라이언트용) ───

export interface AIPersonalityInfo {
  name: string
  description: string
}

// ─── AI 표정 (소켓 이벤트에서 사용) ───

export type AIExpression =
  | 'poker_face' | 'confident' | 'nervous'
  | 'smirking' | 'surprised' | 'thinking' | 'taunting'
  | 'laughing' | 'angry' | 'disappointed' | 'pleased'
  | 'shocked' | 'cold' | 'sweating' | 'mocking'

// ─── Shuffler (테스트용 DI) ───

export interface Shuffler {
  shuffle<T>(array: T[]): T[]
}

// ─── 소켓 이벤트 타입 ───

export interface ClientEvents {
  'create-game': (data: { player: { id: string; name: string } }) => void
  'create-ai-game': (data: { player: { id: string; name: string }; personalityName?: string }) => void
  'join-game': (data: { gameId: string; player: { id: string; name: string } }) => void
  'game-action': (data: { action: GameAction }) => void
  'leave-game': () => void
}

export interface ServerEvents {
  'game-created': (data: { gameId: string }) => void
  'game-state': (data: { playerView: PlayerView }) => void
  'valid-actions': (data: { actions: ValidAction[] }) => void
  'action-result': (data: { success: boolean; message: string; events: GameEvent[] }) => void
  'opponent-joined': (data: { opponentName: string }) => void
  'opponent-left': () => void
  'ai-state': (data: { expression: AIExpression; message: string | null }) => void
  'error': (data: { message: string }) => void
}
