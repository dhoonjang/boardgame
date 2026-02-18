// ─── 기본 타입 ───

export type Card = 1 | 2 | 3 | 4 | 5 | 6 | 7 | 8 | 9 | 10

export type GamePhase =
  | 'waiting'    // 상대 입장 대기
  | 'betting'    // 베팅 단계
  | 'showdown'   // 쇼다운 (카드 공개)
  | 'round_end'  // 라운드 종료
  | 'game_over'  // 게임 종료

export interface Player {
  id: string
  name: string
  chips: number
  card: Card | null
  currentBet: number      // 이번 라운드 누적 베팅
  hasFolded: boolean
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
  isNewDeck: boolean          // 이번 라운드에 덱이 새로 섞였는지
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
  penalty?: number  // 10 폴드 패널티 금액
}

// ─── 액션 ───

export type GameAction =
  | { type: 'START_ROUND' }
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
  deckRemaining: number   // 덱에 남은 카드 수
  isNewDeck: boolean      // 이번 라운드에 덱이 새로 섞였는지
  winner: string | null
  isDraw: boolean
  roundHistory: RoundResult[]
}

// ─── AI 캐릭터 정보 (클라이언트용) ───

export interface AICharacterInfo {
  id: string
  name: string
  description: string
  difficulty: 'easy' | 'normal' | 'hard'
  avatarUrl: string
}

// ─── AI 표정 (소켓 이벤트에서 사용) ───

export type AIExpression =
  | 'poker_face' | 'confident' | 'nervous'
  | 'smirking' | 'surprised' | 'thinking' | 'taunting'
  | 'laughing' | 'angry' | 'disappointed' | 'pleased'
  | 'shocked' | 'cold' | 'sweating' | 'mocking'
  | 'bewildered' | 'scheming' | 'relieved' | 'devastated' | 'respect'

// ─── Shuffler (테스트용 DI) ───

export interface Shuffler {
  shuffle<T>(array: T[]): T[]
}

// ─── 소켓 이벤트 타입 ───

export interface ClientEvents {
  'create-game': (data: { player: { id: string; name: string } }) => void
  'create-ai-game': (data: { player: { id: string; name: string }; characterId?: string }) => void
  'join-game': (data: { gameId: string; player: { id: string; name: string } }) => void
  'game-action': (data: { action: GameAction }) => void
  'player-chat': (data: { message: string }) => void
  'leave-game': () => void
}

export interface ServerEvents {
  'game-created': (data: { gameId: string }) => void
  'game-state': (data: { playerView: PlayerView }) => void
  'valid-actions': (data: { actions: ValidAction[] }) => void
  'action-result': (data: { success: boolean; message: string; events: GameEvent[] }) => void
  'opponent-joined': (data: { opponentName: string; characterId?: string }) => void
  'opponent-left': () => void
  'ai-state': (data: { expression: AIExpression; message: string | null; characterId?: string }) => void
  'player-message': (data: { senderName: string; message: string }) => void
  'show-round-result': (data: { roundResult: RoundResult }) => void
  'show-game-over': () => void
  'error': (data: { message: string }) => void
}
