---
description: 새 GameAction variant를 추가합니다. types.ts → engine → Zod schema → 테스트 순서로 진행.
allowed-tools: Read, Edit, Write, Grep, Glob, Bash
---

# /add-action

새로운 GameAction variant를 추가하는 워크플로우를 진행합니다.

## 대상 게임: $ARGUMENTS

인자가 없으면 사용자에게 게임을 선택하도록 요청합니다.

## 사전 확인

사용자에게 다음 정보를 확인합니다:
- 액션 이름 (예: `DRAW_DEMON_SWORD`)
- 액션 파라미터 (예: `{ targetId: string }`)
- 어느 턴 페이즈에서 사용 가능한지 (move / action / 모두)
- 액션의 동작 설명

## 워크플로우

### 1단계: CLAUDE.md 확인
- `packages/<game>-core/CLAUDE.md`를 읽어 기존 액션 패턴을 파악합니다.

### 2단계: types.ts에 액션 타입 추가
- `packages/<game>-core/src/types.ts`의 GameAction 유니온 타입에 새 variant 추가
- 필요한 인터페이스/타입도 함께 정의

```typescript
// 예시 패턴
| { type: 'NEW_ACTION'; param1: string; param2: number }
```

### 3단계: 엔진에 핸들러 추가
- `packages/<game>-core/src/engine/game-engine.ts`의 `processAction()` switch문에 case 추가
- 복잡한 로직은 별도 함수로 분리 (기존 패턴 참고)

### 4단계: Zod 스키마 추가
- `packages/<game>-server/src/schemas/action.ts`에 새 액션의 Zod 스키마 추가
- 기존 스키마 패턴을 따름

### 5단계: 테스트 작성
- `packages/<game>-core/src/__tests__/`에 새 액션 테스트 추가
- 성공 케이스, 실패 케이스(잘못된 페이즈, 권한 없음 등) 모두 포함
- `pnpm --filter @<game>/core test` 실행

### 6단계: 빌드 검증
- `pnpm --filter @<game>/core build`
- `pnpm --filter @<game>/server build` (서버가 있는 경우)

### 7단계: CLAUDE.md 업데이트
- 새 액션을 CLAUDE.md의 적절한 섹션에 문서화

## 체크리스트

- [ ] types.ts에 GameAction variant 추가
- [ ] game-engine.ts processAction()에 case 추가
- [ ] Zod 스키마 추가 (서버가 있는 경우)
- [ ] 테스트 작성 및 통과 확인
- [ ] 빌드 성공 확인
- [ ] CLAUDE.md 업데이트
