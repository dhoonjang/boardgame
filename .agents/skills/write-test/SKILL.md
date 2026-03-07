---
description: 프로젝트 패턴(MockDiceRoller, test-helpers 등)에 맞는 테스트를 작성합니다.
allowed-tools: Read, Edit, Write, Grep, Glob, Bash
---

# /write-test

프로젝트의 기존 테스트 패턴에 맞춰 테스트를 작성합니다.

## 대상: $ARGUMENTS

인자 형식:
- `forgod <기능명>` → forgod-core의 해당 기능 테스트 작성
- 인자가 없으면 사용자에게 테스트 대상을 요청

## 워크플로우

### 1단계: 기존 패턴 파악
- `packages/<game>-core/src/__tests__/test-helpers.ts`를 읽어 헬퍼 함수들을 파악합니다.
- 기존 테스트 파일들의 패턴을 참고합니다.

### 2단계: 대상 코드 분석
- 테스트할 소스 코드를 읽고 테스트 케이스를 설계합니다.

### 3단계: 테스트 작성
- 기존 패턴에 맞춰 테스트를 작성합니다.
- `pnpm --filter @<game>/core test` 실행하여 확인합니다.

## 프로젝트 테스트 패턴 (forgod 기준)

### 테스트 프레임워크
- **Vitest** 사용 (`describe`, `it`, `expect`)

### MockDiceRoller 사용법
```typescript
import { MockDiceRoller } from './test-helpers'

const diceRoller = new MockDiceRoller()

// 다음 주사위 결과 설정 (순서대로 소비됨)
diceRoller.setNextRolls([4, 3, 6, 1])

// 큐가 비었을 때 기본값 설정
diceRoller.setDefaultValue(3)

// 큐 초기화
diceRoller.clear()
```

### 헬퍼 함수들
```typescript
import {
  skipToActionPhase,     // 이동 주사위 굴리고 action 페이즈로 이동
  completeTurn,          // 현재 턴 완료 (skip + END_TURN)
  advanceToPlayerTurn,   // 특정 플레이어 턴까지 스킵
  movePlayerToPosition,  // 목표 위치로 이동 (여러 턴 가능)
  executeLethalAttack,   // 반복 공격으로 처치
  gatherMonsterEssence,  // 몬스터 정수 획득
  upgradePlayerStat,     // 능력치 업그레이드
  corruptPlayer,         // 플레이어 타락시키기
  acquireDemonSword,     // 마검 획득
} from './test-helpers'
```

### 게임 초기화 패턴
```typescript
import { GameEngine } from '../engine/game-engine'

const diceRoller = new MockDiceRoller()
const engine = new GameEngine(diceRoller)

// 게임 생성 시 주사위 설정 필요 (초기 능력치용 주사위 6개 × 플레이어 수)
diceRoller.setNextRolls([3, 3, 3, 3, 3, 3, /* ... */])
const state = engine.createGame(['player1', 'player2', 'player3'], {
  playerNames: { player1: 'Alice', player2: 'Bob', player3: 'Charlie' },
  heroClasses: { player1: 'warrior', player2: 'rogue', player3: 'mage' },
})
```

### 테스트 구조 예시
```typescript
describe('기능명', () => {
  let engine: GameEngine
  let diceRoller: MockDiceRoller
  let state: GameState

  beforeEach(() => {
    diceRoller = new MockDiceRoller()
    engine = new GameEngine(diceRoller)
    diceRoller.setDefaultValue(3)
    // 게임 초기화...
  })

  it('정상 동작 케이스', () => {
    // ...
  })

  it('실패 케이스', () => {
    // ...
  })
})
```

## 규칙

- 항상 `MockDiceRoller`를 사용하여 결정론적 테스트를 작성합니다.
- 헬퍼 함수를 적극 활용합니다.
- 성공/실패 케이스를 모두 포함합니다.
- 작성 후 반드시 테스트를 실행하여 통과를 확인합니다.
