# For God Core - 개발 가이드

> 3~6인용 전략 보드게임

## 프로젝트 구조

```
packages/forgod-core/
├── src/
│   ├── types.ts        # 모든 타입 정의
│   ├── constants.ts    # 게임 상수, 스킬, 몬스터, 보드 정의
│   ├── hex.ts          # 6각형 좌표계 유틸리티
│   ├── index.ts        # 모듈 export
│   └── engine/
│       ├── game-engine.ts  # 메인 게임 엔진
│       ├── combat.ts       # 전투 로직
│       ├── skills.ts       # 스킬 시스템
│       ├── revelations.ts  # 계시 카드 시스템
│       ├── monsters.ts     # 몬스터 로직
│       └── victory.ts      # 승리 조건
```

## 핵심 타입 구조

### GameState
```typescript
interface GameState {
  id: string
  players: Player[]
  roundNumber: number
  roundTurnOrder: TurnEntry[]  // 이번 라운드 턴 순서 (플레이어 ID들 + 마지막에 'monster')
  currentTurnIndex: number     // 현재 턴 인덱스 (roundTurnOrder 내 위치)
  board: SerializedHexBoard
  monsters: Monster[]
  monsterDice: number[]  // 6개
  revelationDeck: Revelation[]
}

// 턴 엔트리: 플레이어 ID 또는 'monster'
type TurnEntry = string | 'monster'
```

### Player
```typescript
interface Player {
  id: string
  name: string
  heroClass: 'warrior' | 'rogue' | 'mage'
  state: 'holy' | 'corrupt'
  stats: Stats  // strength, dexterity, intelligence (각각 [number, number])
  corruptDice: number | null
  corruptDiceTarget: keyof Stats | null
  health: number
  maxHealth: number
  position: HexCoord
  revelations: Revelation[]           // 보유 중인 계시 카드
  completedRevelations: Revelation[]  // 완료한 계시 카드
  monsterEssence: number
  devilScore: number                  // 마왕 점수
  faithScore: number                  // 신앙 점수
  isDead: boolean
  deathTurnsRemaining: number
  skillCooldowns: Record<string, number>
  usedSkillCost: number            // 이번 턴에 사용한 스킬 비용 합계
  // 턴 관련 (플레이어별로 관리)
  turnPhase: 'move' | 'action'
  remainingMovement: number | null
  leftoverMovement: number
  turnCompleted: boolean
}
```

### Monster
```typescript
interface Monster {
  id: string
  name: string
  position: HexCoord
  health: number
  maxHealth: number
  diceIndices: number[]  // 2~6개의 주사위 인덱스
  isDead: boolean
}
```

### Revelation (계시 카드)
```typescript
interface RevelationReward {
  devilScore?: number       // 마왕 점수
  faithScore?: number       // 신앙 점수
  corruptScore?: number     // 타락 점수
  extraRevelations?: number // 추가 계시 카드 수
}

interface Revelation {
  id: string
  name: string
  source: 'angel' | 'demon'
  task: string
  reward: RevelationReward
  isGameEnd: boolean
}
```

## 게임 흐름

### 라운드 구조
`roundTurnOrder` 배열에 이번 라운드의 전체 턴 순서가 저장됩니다.
- 배열 예시: `['player-1', 'player-2', 'player-3', 'monster']`
- `currentTurnIndex`가 현재 턴 위치를 가리킴

1. **플레이어 턴**: `roundTurnOrder[currentTurnIndex]`가 플레이어 ID인 경우
   - 각 플레이어: move → action 페이즈
   - 턴 종료 시 `currentTurnIndex++`
2. **몬스터 턴**: `roundTurnOrder[currentTurnIndex]`가 'monster'인 경우
   - 6개 주사위 굴림 → 작은 순 정렬 → diceIndices가 가리키는 주사위들 합산
   - 예: diceIndices = [0, 1] → 가장 작은 2개 주사위 합
3. **새 라운드 시작**
   - leftoverMovement 기반으로 새 턴 순서 결정 (높은 플레이어부터)
   - `roundTurnOrder` 재생성, `currentTurnIndex = 0`

### 플레이어 턴
1. **move 페이즈**
   - ROLL_MOVE_DICE: 2d6 + 민첩 보너스
   - MOVE: 인접 타일로 이동 (지형별 비용 소모)
   - END_TURN: action 페이즈로 전환
2. **action 페이즈**
   - BASIC_ATTACK: 인접 대상 공격 (힘 수치만큼 피해)
   - USE_SKILL: 스킬 사용
   - ROLL_STAT_DICE: 능력치 업그레이드 (레벨만큼 정수 소모)
   - END_TURN: 턴 완료

### 능력치 업그레이드 규칙
- 비용: 현재 레벨(가장 높은 능력치) 만큼 몬스터 정수 소모
- 1d6 굴려서 낮은 주사위보다 높으면 업그레이드 성공

### 스킬 시스템
- **한 턴에 여러 스킬 사용 가능**: 사용한 스킬 비용의 총합이 지능을 넘지 않으면 됨
- `usedSkillCost`: 이번 턴에 사용한 스킬 비용 합계 (턴 종료 시 0으로 리셋)
- 스킬 사용 가능 조건: `usedSkillCost + skill.cost <= intelligence` && `skillCooldowns[skillId] === 0`
- 스킬 사용 시 즉시 `skillCooldowns`에 쿨다운 적용

## 체력 시스템
레벨(= 가장 높은 능력치, 타락 주사위 제외)과 직업에 따라 최대 체력이 결정됩니다.

| 직업 | Lv 2~4 | Lv 5~7 | Lv 8~10 | Lv 11 | Lv 12 |
|------|--------|--------|---------|-------|-------|
| 법사 | 20 | 20 | 30 | 40 | 50 |
| 도적 | 20 | 30 | 40 | 50 | 50 |
| 전사 | 30 | 30 | 40 | 50 | 50 |

```typescript
getMaxHealthByLevel(heroClass, level)  // 직업과 레벨로 최대 체력 조회
```

## 자원 시스템

### 몬스터 정수
- 획득: 몬스터에게 공격으로 가한 데미지만큼 획득
- 사용: 능력치 주사위 굴리기

### 제물 (동그라미●, 세모▲, 네모■)
- 획득: 몬스터 처치 시 획득
- 사용: 계시 수행

몬스터별 제물 드롭:
| 몬스터 | ● | ▲ | ■ |
|--------|---|---|---|
| 하피 | 1 | 1 | 0 |
| 그린딜로 | 0 | 1 | 1 |
| 리치 | 3 | 1 | 1 |
| 트롤 | 1 | 0 | 2 |
| 히드라 | 2 | 4 | 1 |
| 골렘 | 1 | 1 | 3 |
| 발록 | 3 | 3 | 3 |

## 지형 이동 비용
```typescript
TERRAIN_MOVEMENT_COST = {
  plain: 3,
  village: 3,
  swamp: 5,
  fire: 3,
  temple: 3,
  castle: 3,
  monster: 'blocked',
  hill: 'all',      // 남은 이동력 전부 소모
  mountain: 'blocked',
  lake: 'blocked',
}
```

## 제한 사항
- 타락 용사는 신전(temple) 진입 불가
- 신성 용사가 마왕성(castle) 진입 시 피해

## 승리 조건
**중요**: 승리 조건을 트리거한 플레이어와 실제 승자가 다를 수 있음!

1. **마왕 승리 트리거**: 타락 용사가 마검 획득 후 신전 진입
   - 실제 승자: (마왕 점수 - 신앙 점수)가 가장 높은 플레이어
2. **천사 승리 트리거**: 게임 종료 천사 계시 수행 (예: "마왕 처단" - 신앙 5점 이상 + 마왕성 진입)
   - 실제 승자: (신앙 점수 - 마왕 점수)가 가장 높은 플레이어
3. **계시 승리**: 승리 계시(isGameEnd=true) 완료 → 완료한 플레이어가 승리

## API 구조 (server)
- `GET /api/games/:gameId?playerId=xxx` - 게임 상태 조회
- `GET /api/games/:gameId/players/:playerId/actions` - 유효 액션 조회
- `POST /api/games/:gameId/players/:playerId/actions` - 액션 실행

모든 액션 API는 playerId가 필수이며, 자신의 턴이 아니면 에러 반환
