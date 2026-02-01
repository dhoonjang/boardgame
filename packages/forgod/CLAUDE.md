# For God Web - 개발 가이드

This file provides guidance to Claude Code (claude.ai/code) when working with forgod package.

> For God 웹 애플리케이션. forgod-server API를 활용하여 브라우저에서 보드게임을 플레이합니다.

## 프로젝트 개요

- **플레이 방식**: 로컬 멀티플레이어 (핫시트) - 한 기기에서 여러 명이 번갈아 플레이
- **서버 연동**: forgod-server HTTP API를 통해 게임 상태 관리
- **상태 관리**: Zustand (서버가 진실의 원천, 낙관적 업데이트 지양)

## 기술 스택

| 기술 | 버전 | 용도 |
|------|------|------|
| React | 18.3 | UI 라이브러리 |
| Vite | 5.4 | 개발 서버 & 빌드 |
| TypeScript | 5.7 | 타입 안전성 |
| React Router | 6.22 | 클라이언트 라우팅 |
| Zustand | 4.5 | 상태 관리 |
| Tailwind CSS | 3.4 | 스타일링 |
| @forgod/core | workspace | 게임 타입 & 상수 |

---

## 명령어

```bash
# 개발 서버 시작 (Vite HMR)
pnpm dev

# 프로덕션 빌드
pnpm build

# 빌드 결과물 미리보기
pnpm preview

# 린트 실행
pnpm lint
```

**환경 변수** (`.env` 또는 `.env.local`):
```bash
VITE_API_URL=http://localhost:3001  # forgod-server 주소 (기본값)
```

---

## 프로젝트 구조

```
packages/forgod/
├── src/
│   ├── api/
│   │   └── client.ts           # forgod-server API 클라이언트
│   ├── store/
│   │   └── gameStore.ts        # Zustand 게임 상태 스토어
│   ├── pages/
│   │   ├── HomePage.tsx        # 홈 (게임 소개)
│   │   ├── NewGamePage.tsx     # 게임 생성 (플레이어 설정)
│   │   └── GamePage.tsx        # 게임 플레이 화면
│   ├── components/
│   │   ├── HexBoard.tsx        # SVG 헥사곤 보드 (메인 컴포넌트)
│   │   ├── HexTile.tsx         # 개별 헥사곤 타일
│   │   ├── PlayerToken.tsx     # 플레이어 토큰
│   │   └── MonsterToken.tsx    # 몬스터 토큰
│   ├── utils/
│   │   └── hexUtils.ts         # 헥사곤 좌표 → 픽셀 변환 유틸리티
│   ├── App.tsx                 # React Router 설정
│   ├── main.tsx                # 진입점
│   └── index.css               # Tailwind 전역 스타일
├── tailwind.config.ts          # Tailwind 설정 (게임 테마 색상)
├── vite.config.ts
└── package.json
```

---

## 라우팅

| 경로 | 페이지 | 설명 |
|------|--------|------|
| `/` | HomePage | 게임 소개, 직업 안내, 시작 버튼 |
| `/game/new` | NewGamePage | 플레이어 수, 이름, 직업 선택 |
| `/game/:gameId` | GamePage | 게임 보드, 액션 패널, 플레이어 정보 |

---

## API 클라이언트 (`src/api/client.ts`)

### 설계 원칙
- forgod-server API와 1:1 매핑
- 타입 안전한 요청/응답
- 에러는 응답 객체의 `success: false`로 표현

### 주요 함수

```typescript
import api from './api/client'

// 게임 생성
const result = await api.createGame({
  players: [
    { id: 'player-1', name: '플레이어 1', heroClass: 'warrior' },
    { id: 'player-2', name: '플레이어 2', heroClass: 'mage' },
    { id: 'player-3', name: '플레이어 3', heroClass: 'rogue' },
  ]
})
// result: { success: true, gameId: 'abc123', ... }

// 게임 상태 조회
const state = await api.getGameState(gameId, playerId)

// 가능한 액션 조회
const actions = await api.getValidActions(gameId, playerId)

// 액션 실행
const result = await api.executeAction(gameId, playerId, { type: 'ROLL_MOVE_DICE' })
```

### 현재 엔드포인트 매핑

| 함수 | 메서드 | 경로 | 참고 |
|------|--------|------|------|
| `createGame` | POST | `/api/games` | 3~6명 필수 |
| `listGames` | GET | `/api/games` | |
| `getGameState` | GET | `/api/games/:gameId` | playerId 쿼리 지원 |
| `deleteGame` | DELETE | `/api/games/:gameId` | |
| `getValidActions` | GET | `/api/games/:gameId/valid-actions` | playerId 쿼리 선택적 |
| `executeAction` | POST | `/api/games/:gameId/actions` | playerId 쿼리 선택적 |

---

## Zustand 스토어 (`src/store/gameStore.ts`)

### 설계 원칙
- **서버가 진실의 원천**: API 응답을 그대로 저장
- **낙관적 업데이트 지양**: 액션 실행 후 항상 서버에서 상태 새로고침
- **단일 스토어**: 모든 게임 관련 상태를 하나의 스토어에서 관리

### 상태 구조

```typescript
interface GameStore {
  // 식별자
  gameId: string | null
  playerId: string | null  // 현재 기기에서 조작하는 플레이어

  // UI 상태
  isLoading: boolean
  error: string | null

  // 게임 데이터
  roundNumber: number
  currentPhase: string       // 'move' | 'action' | 'monster'
  currentPlayerId: string | null
  players: PlayerState[]
  monsters: MonsterState[]
  board: HexTileState[]
  validActions: ValidAction[]

  // 액션
  createGame(players, myPlayerId): Promise<void>
  loadGame(gameId, playerId): Promise<void>
  refreshGameState(): Promise<void>
  executeAction(action): Promise<void>
  resetGame(): void
}
```

### 사용 예시

```tsx
import { useGameStore } from './store/gameStore'

function GamePage() {
  const {
    players,
    validActions,
    executeAction,
    isLoading,
  } = useGameStore()

  return (
    <div>
      {validActions.map(va => (
        <button
          key={va.index}
          onClick={() => executeAction(va.action)}
          disabled={isLoading}
        >
          {va.description}
        </button>
      ))}
    </div>
  )
}
```

---

## 컴포넌트 가이드

### GamePage 구조

```
GamePage
├── Header (라운드, 페이즈 표시)
├── Grid (2열 레이아웃)
│   ├── HexBoard (게임 보드)
│   │   ├── HexTile (타일들)
│   │   ├── PlayerToken (플레이어)
│   │   └── Monster HP Bars
│   └── Sidebar
│       ├── CurrentPlayerInfo (현재 턴 플레이어)
│       ├── ActionPanel (가능한 액션 버튼들)
│       └── PlayerList (모든 플레이어 요약)
```

### HexBoard 컴포넌트

- **SVG 기반** 렌더링 (확대/축소 용이)
- **Flat-top 헥사곤** 좌표계 사용
- **개발 모드 지원**: `useDevBoard` prop으로 로컬 GAME_BOARD 사용 (HMR 즉시 반영)

```tsx
<HexBoard
  tiles={board}
  players={players}
  monsters={monsters}
  currentPlayerId={currentPlayerId}
  showCoords={true}       // 좌표 표시 (디버깅용)
  useDevBoard={true}      // 로컬 GAME_BOARD 사용
/>
```

### 헥사곤 좌표 변환 (`utils/hexUtils.ts`)

```typescript
import { axialToPixel, getHexCorners } from './utils/hexUtils'

// Axial 좌표 → 픽셀 좌표
const { x, y } = axialToPixel({ q: 3, r: -2 }, size)

// 헥사곤 꼭지점 (SVG polygon용)
const points = getHexCorners(x, y, size)
```

---

## 게임 플레이 흐름 (핫시트 멀티플레이어)

```
1. 게임 생성 (NewGamePage)
   └─ 3~6명 플레이어 설정 (이름, 직업)
   └─ 첫 번째 플레이어를 myPlayerId로 설정

2. 게임 시작 (GamePage)
   └─ loadGame()으로 초기 상태 로드

3. 플레이어 턴
   └─ 현재 턴 플레이어의 validActions 표시
   └─ 버튼 클릭 → executeAction() 호출
   └─ 서버에서 상태 새로고침

4. 턴 종료
   └─ END_TURN 액션 실행
   └─ 다음 플레이어 턴으로 전환
   └─ (물리적으로 기기를 다음 플레이어에게 전달)

5. 라운드 종료
   └─ 모든 플레이어 턴 완료 후
   └─ 몬스터 턴 자동 진행
   └─ 새 라운드 시작
```

---

## 스타일링 가이드

### Tailwind 테마 색상

```typescript
// tailwind.config.ts에 정의된 커스텀 색상

// 상태 색상
holy: { 50, 100, 500, 600, 700 }     // 신성 (파란색 계열)
corrupt: { 50, 100, 500, 600, 700 }  // 타락 (보라색 계열)

// 직업 색상
warrior: { 500, 600 }  // 전사 (빨강)
rogue: { 500, 600 }    // 도적 (초록)
mage: { 500, 600 }     // 법사 (파랑)
```

### 사용 예시

```tsx
// 상태에 따른 스타일
<div className={player.state === 'holy' ? 'text-holy-500' : 'text-corrupt-500'}>
  {player.state === 'holy' ? '신성' : '타락'}
</div>

// 직업에 따른 스타일
<span className="text-warrior-500">[전사]</span>
<span className="text-rogue-500">[도적]</span>
<span className="text-mage-500">[법사]</span>
```

### 타일 색상 (`hexUtils.ts`)

```typescript
const TILE_COLORS = {
  plain: '#8b7355',    // 평지
  village: '#48bb78',  // 마을
  mountain: '#4a4a4a', // 산
  lake: '#2d8ac7',     // 호수
  hill: '#7a6b5a',     // 언덕
  swamp: '#4a6741',    // 늪
  fire: '#d94f30',     // 화염
  temple: '#ffd700',   // 신전
  castle: '#5c3d6e',   // 마왕성
  monster: '#6b2d5c',  // 몬스터 타일
}
```

---

## 개발 팁

### 1. 서버와 함께 실행

```bash
# 터미널 1: 서버 실행
pnpm forgod:server:dev

# 터미널 2: 클라이언트 실행
pnpm forgod:dev
```

### 2. 보드 수정 시 HMR 활용

`HexBoard`의 `useDevBoard={true}` (기본값)을 사용하면 `@forgod/core`의 `GAME_BOARD`를 직접 참조하여 보드 수정 시 즉시 반영됩니다.

### 3. 좌표 디버깅

```tsx
<HexBoard showCoords={true} />
```

### 4. API 응답 확인

개발자 도구 Network 탭에서 `/api/games/*` 요청을 확인하여 서버 응답 구조를 파악하세요.

### 5. 타입 재사용

`@forgod/core`에서 타입을 가져와 사용:
```typescript
import type { GameAction, HeroClass, HexCoord, TileType, Stats } from '@forgod/core'
```

---

## 향후 개선 사항

### 미구현 기능
- [ ] 게임 목록 페이지 (로비)
- [ ] 정적 데이터 캐싱 스토어 (스킬, 몬스터, 계시)
- [ ] 플레이어 상세 패널 (스킬, 계시, 능력치 표시)
- [ ] 이동 가능 타일 하이라이트
- [ ] 공격 대상 선택 UI
- [ ] 스킬 사용 UI
- [ ] 몬스터 턴 애니메이션
- [ ] 게임 이벤트 로그

### UI/UX 개선
- [ ] 반응형 레이아웃 (모바일 지원)
- [ ] 드래그로 보드 이동/확대
- [ ] 사운드 효과
- [ ] 승리/패배 모달
