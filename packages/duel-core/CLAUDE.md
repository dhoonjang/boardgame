# Bluff Duel Core - 개발 가이드

> 블러프 듀얼: 인디언 포커 스타일 2인 전용 카드 게임

## 프로젝트 구조

```
packages/duel-core/
├── src/
│   ├── types.ts        # 모든 타입 정의 (소켓 이벤트 포함)
│   ├── constants.ts    # 게임 상수
│   ├── index.ts        # 모듈 export
│   └── engine/
│       ├── game-engine.ts  # 메인 게임 엔진
│       ├── abilities.ts    # 특수 능력 (Peek/Swap)
│       ├── betting.ts      # 베팅 로직 (Raise/Call/Fold)
│       └── showdown.ts     # 쇼다운 (카드 비교)
```

---

## 게임 규칙

### 기본 설정
- **2인 전용**: 정확히 2명
- **칩**: 각 20칩 시작
- **덱**: 1~10 카드 각 1장 (총 10장), 매 라운드 리셋
- **라운드**: 최대 5라운드 (라운드당 카드 2장 소모)

### 라운드 진행
1. **앤티**: 양쪽 자동 1칩씩 팟에
2. **딜링**: 각 1장 배분 → **상대 카드만 보임** (인디언 포커 핵심)
3. **능력 단계**: 선 플레이어부터
   - **엿보기(Peek)**: 자기 카드 확인 (게임당 3회)
   - **교체(Swap)**: 카드 버리고 덱에서 새 카드 (게임당 3회)
   - **건너뛰기**: 능력 미사용
4. **베팅 단계**: 선 플레이어부터 교대
   - **레이즈**: 칩 추가 (최소 1칩)
   - **콜**: 상대 베팅 맞추기 (동일하면 체크)
   - **폴드**: 포기 (팟 상실)
5. **쇼다운**: 양쪽 콜 시 카드 공개 → 높은 카드 승리

### 승리 조건
- 상대 칩 0 → 즉시 승리
- 5라운드 종료 후 칩 많은 쪽 승리
- 동률 → 무승부

### 선 플레이어
- 1라운드: 플레이어 0 (인덱스 0)
- 이후: 매 라운드 교체

---

## 핵심 타입

### GamePhase
`'waiting' | 'ability' | 'betting' | 'showdown' | 'round_end' | 'game_over'`

### GameAction
```typescript
| { type: 'START_ROUND' }
| { type: 'PEEK' }
| { type: 'SWAP' }
| { type: 'SKIP_ABILITY' }
| { type: 'RAISE'; amount: number }
| { type: 'CALL' }
| { type: 'FOLD' }
```

### PlayerView
서버→클라이언트 뷰. **내 카드는 peek 시에만, 상대 카드는 항상 보임.**

---

## 엔진 패턴

```typescript
const engine = new GameEngine({ shuffler }) // Shuffler DI
const state = engine.createGame({ id, name })
const state2 = engine.joinGame(state, { id, name })
const result = engine.executeAction(state, action, playerId?)
const view = engine.getPlayerView(state, playerId)
const actions = engine.getValidActions(state, playerId?)
```

---

## 소켓 이벤트 타입

`ClientEvents`, `ServerEvents`는 core에 정의 → 서버/클라이언트 공유.

---

## 테스트

```bash
pnpm --filter @duel/core test
```

- `MockShuffler`: 카드 순서 제어
- `createTestGame()`: 2인 게임 생성
- `startRoundWithCards()`: 특정 카드 배치로 라운드 시작
- `skipAbilityPhase()`: 능력 단계 건너뛰기
