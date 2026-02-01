# For God Server - 개발 가이드

This file provides guidance to Claude Code (claude.ai/code) when working with forgod-server package.

> For God 게임의 HTTP API 서버. forgod-core 게임 엔진을 웹 API로 제공합니다.

## 프로젝트 구조

```
packages/forgod-server/
├── src/
│   ├── index.ts           # 진입점, 서버 시작
│   ├── api.ts             # Hono 라우터 정의
│   ├── session.ts         # 게임 세션 관리 (인메모리)
│   ├── schemas/
│   │   ├── action.ts      # Zod 게임 액션 스키마
│   │   └── static-data.ts # Zod 정적 데이터 쿼리 스키마
│   └── __tests__/
│       ├── api.test.ts        # API 엔드포인트 테스트
│       ├── session.test.ts    # 세션 관리 테스트
│       ├── schemas.test.ts    # 스키마 검증 테스트
│       └── static-data.test.ts # 정적 데이터 API 테스트
├── package.json
├── tsconfig.json
├── vitest.config.ts
└── CLAUDE.md
```

## 기술 스택

- **프레임워크**: Hono (경량 웹 프레임워크)
- **런타임**: Node.js (@hono/node-server)
- **검증**: Zod
- **빌드**: tsup
- **테스트**: Vitest

---

## 명령어

```bash
# 개발 (watch 모드)
pnpm dev

# 빌드
pnpm build

# 서버 시작
pnpm start

# 테스트 실행
pnpm test

# 테스트 watch 모드
pnpm test:watch
```

---

## 구현 현황

### Phase 1: 기본 기능 ✅
1. [x] 게임 생성/조회/삭제
2. [x] 인메모리 세션 관리
3. [x] 액션 실행 (forgod-core 연동)
4. [x] 유효한 액션 조회

### Phase 2: 정보 API ✅
1. [x] 플레이어 정보 조회 (목록, 상세)
2. [x] 정적 데이터 (스킬, 몬스터, 계시 정의)

---

## HTTP API 엔드포인트

### 게임 관리

| 메서드 | 경로 | 설명 | 상태 |
|--------|------|------|------|
| POST | `/api/games` | 게임 생성 | ✅ |
| GET | `/api/games` | 게임 목록 조회 | ✅ |
| GET | `/api/games/:gameId` | 게임 상태 조회 | ✅ |
| DELETE | `/api/games/:gameId` | 게임 삭제 | ✅ |

#### POST /api/games - 게임 생성

**Request Body:**
```typescript
{
  players: {
    id: string
    name: string
    heroClass: 'warrior' | 'rogue' | 'mage'
  }[]  // 3~6명
}
```

**Response (201):**
```typescript
{
  gameId: string
  gameState: GameState
}
```

#### GET /api/games - 게임 목록

**Response (200):**
```typescript
{
  games: {
    gameId: string
    playerCount: number
    roundNumber: number
    createdAt: string
  }[]
}
```

#### GET /api/games/:gameId - 게임 상태 조회

**Response (200):**
```typescript
{
  gameState: GameState
}
```

---

### 게임 플레이

| 메서드 | 경로 | 설명 | 상태 |
|--------|------|------|------|
| POST | `/api/games/:gameId/actions` | 액션 실행 | ✅ |
| GET | `/api/games/:gameId/valid-actions` | 유효한 액션 조회 | ✅ |
| GET | `/api/games/:gameId/current-turn` | 현재 턴 정보 | ✅ |

#### POST /api/games/:gameId/actions - 액션 실행

**Request Body:** GameAction (11가지 중 하나)

```typescript
// 1. 이동 주사위 굴리기
{ type: 'ROLL_MOVE_DICE' }

// 2. 이동
{ type: 'MOVE', position: { q: number, r: number } }

// 3. 이동 페이즈 종료
{ type: 'END_MOVE_PHASE' }

// 4. 턴 종료
{ type: 'END_TURN' }

// 5. 기본 공격
{ type: 'BASIC_ATTACK', targetId: string }

// 6. 스킬 사용
{ type: 'USE_SKILL', skillId: string, targetId?: string, position?: HexCoord }

// 7. 능력치 주사위 굴리기
{ type: 'ROLL_STAT_DICE', stat: 'strength' | 'dexterity' | 'intelligence' }

// 8. 계시 완료
{ type: 'COMPLETE_REVELATION', revelationId: string }

// 9. 타락 주사위 적용
{ type: 'APPLY_CORRUPT_DICE', stat: 'strength' | 'dexterity' | 'intelligence' }

// 10. 신성 선택 (부활 시)
{ type: 'CHOOSE_HOLY' }

// 11. 마검 뽑기
{ type: 'DRAW_DEMON_SWORD' }
```

**Response (200):**
```typescript
{
  success: boolean
  gameState: GameState
  message: string
  events: GameEvent[]
}
```

#### GET /api/games/:gameId/valid-actions - 유효한 액션 조회

**Response (200):**
```typescript
{
  validActions: ValidAction[]
  currentPlayerId: string | null
  turnPhase: 'move' | 'action' | null
  isMonsterTurn: boolean
}
```

#### GET /api/games/:gameId/current-turn - 현재 턴 정보

**Response (200):**
```typescript
{
  currentTurnEntry: string | 'monster'
  currentPlayer: {
    id: string
    name: string
    heroClass: HeroClass
    turnPhase: 'move' | 'action'
  } | null
  roundNumber: number
  currentTurnIndex: number
  roundTurnOrder: (string | 'monster')[]
}
```

---

### 플레이어 정보

| 메서드 | 경로 | 설명 | 상태 |
|--------|------|------|------|
| GET | `/api/games/:gameId/players` | 플레이어 목록 | ✅ |
| GET | `/api/games/:gameId/players/:playerId` | 플레이어 상세 | ✅ |

#### GET /api/games/:gameId/players - 플레이어 목록

**Response (200):**
```typescript
{
  players: {
    id: string
    name: string
    heroClass: 'warrior' | 'rogue' | 'mage'
    state: 'holy' | 'corrupt'
    health: number
    maxHealth: number
    position: { q: number, r: number }
    level: number
    isDead: boolean
    hasDemonSword: boolean
  }[]
}
```

#### GET /api/games/:gameId/players/:playerId - 플레이어 상세

**Response (200):**
```typescript
{
  player: Player  // forgod-core Player 타입 전체
}
```

---

### 정적 데이터

| 메서드 | 경로 | 설명 | 상태 |
|--------|------|------|------|
| GET | `/api/skills` | 스킬 목록 | ✅ |
| GET | `/api/monsters` | 몬스터 목록 | ✅ |
| GET | `/api/revelations` | 계시 목록 | ✅ |

#### GET /api/skills - 스킬 목록

**Query Parameters:**
- `heroClass` (optional): `warrior` | `rogue` | `mage` - 직업별 필터링

**Response (200):**
```typescript
{
  skills: Skill[]  // forgod-core Skill 타입
}
```

#### GET /api/monsters - 몬스터 목록

**Response (200):**
```typescript
{
  monsters: MonsterDefinition[]  // forgod-core MonsterDefinition 타입
}
```

#### GET /api/revelations - 계시 목록

**Query Parameters:**
- `source` (optional): `angel` | `demon` - 계시 출처 필터링

**Response (200):**
```typescript
{
  revelations: Revelation[]  // forgod-core Revelation 타입
}
```

---

## 에러 처리

### HTTP 상태 코드

| 코드 | 의미 |
|------|------|
| 200 | 성공 |
| 201 | 생성 성공 |
| 400 | 잘못된 요청 (유효하지 않은 액션 등) |
| 404 | 게임을 찾을 수 없음 |
| 500 | 서버 내부 오류 |

### 에러 응답 형식

```typescript
{
  error: string
  code?: string
  details?: unknown
}
```

---

## 세션 관리

### SessionManager 클래스

```typescript
class SessionManager {
  createGame(players: PlayerInit[]): { gameId: string, gameState: GameState }
  getGame(gameId: string): GameState | null
  updateGame(gameId: string, gameState: GameState): boolean
  deleteGame(gameId: string): boolean
  listGames(): GameSummary[]
  getEngine(): GameEngine
}
```

### 게임 ID 생성
- 6자리 영숫자 랜덤 생성 (예: `a1b2c3`)
- 중복 방지 로직 포함

---

## Zod 스키마

### 주요 스키마

```typescript
// schemas/action.ts

export const HexCoordSchema = z.object({
  q: z.number(),
  r: z.number(),
})

export const PlayerInitSchema = z.object({
  id: z.string(),
  name: z.string(),
  heroClass: z.enum(['warrior', 'rogue', 'mage']),
})

export const CreateGameSchema = z.object({
  players: z.array(PlayerInitSchema).min(3).max(6),
})

export const StatSchema = z.enum(['strength', 'dexterity', 'intelligence'])

export const GameActionSchema = z.discriminatedUnion('type', [...])
```

---

## forgod-core 연동

### GameEngine 사용

```typescript
import { GameEngine } from '@forgod/core'

// SessionManager 내부에서 엔진 인스턴스 관리
const engine = new GameEngine()

// 게임 생성
const gameState = engine.createGame({ players: [...] })

// 액션 실행
const result = engine.executeAction(gameState, action)
// result: { success, newState, message, events }

// 유효 액션 조회
const validActions = engine.getValidActions(gameState)

// 현재 턴 플레이어
const currentPlayer = engine.getCurrentPlayer(gameState)

// 현재 턴 엔트리
const turnEntry = engine.getCurrentTurnEntry(gameState)
```

---

## 테스트

### 테스트 구조

- `session.test.ts`: SessionManager 단위 테스트
- `schemas.test.ts`: Zod 스키마 검증 테스트
- `api.test.ts`: API 엔드포인트 통합 테스트 (게임 관리, 플레이어 정보)
- `static-data.test.ts`: 정적 데이터 API 테스트 (스킬, 몬스터, 계시)

### 테스트 실행

```bash
# 모든 테스트 실행
pnpm test

# watch 모드
pnpm test:watch
```
