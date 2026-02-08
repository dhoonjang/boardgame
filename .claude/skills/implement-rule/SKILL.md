---
description: 게임 규칙 추가/변경의 전체 라이프사이클을 진행합니다. CLAUDE.md 확인 → 타입 → 로직 → 테스트 → 서버 동기화.
allowed-tools: Read, Edit, Write, Grep, Glob, Bash
---

# /implement-rule

게임 규칙을 추가하거나 변경하는 전체 워크플로우를 진행합니다.

## 대상 게임: $ARGUMENTS

인자가 없으면 사용자에게 게임을 선택하도록 요청합니다.

## 워크플로우

### 1단계: CLAUDE.md 확인
- `packages/<game>-core/CLAUDE.md`를 읽고 현재 규칙을 파악합니다.
- 사용자에게 추가/변경할 규칙을 확인합니다.

### 2단계: CLAUDE.md 업데이트
- 새로운 규칙을 먼저 `CLAUDE.md`에 문서화합니다.
- 기존 규칙과 충돌하는 부분이 있으면 사용자에게 확인합니다.

### 3단계: 타입 정의 (필요 시)
- `packages/<game>-core/src/types.ts`에 필요한 타입을 추가/수정합니다.
- 새로운 필드, 인터페이스, 유니온 타입 등을 정의합니다.

### 4단계: 상수 정의 (필요 시)
- `packages/<game>-core/src/constants.ts`에 필요한 상수를 추가합니다.

### 5단계: 엔진 로직 구현
- `packages/<game>-core/src/engine/` 아래 적절한 파일에 로직을 구현합니다.
- 기존 패턴을 따라 구현합니다.

### 6단계: 테스트 작성
- `packages/<game>-core/src/__tests__/`에 테스트를 추가합니다.
- 기존 테스트 패턴(MockDiceRoller 등)을 따릅니다.
- `pnpm --filter @<game>/core test` 실행하여 확인합니다.

### 7단계: 서버 동기화 (필요 시)
- 타입이 변경된 경우:
  - `packages/<game>-server/src/schemas/action.ts` Zod 스키마 업데이트
  - `packages/<game>-server/src/api.ts` API 핸들러 업데이트

### 8단계: 빌드 검증
- `pnpm --filter @<game>/core build` 실행
- `pnpm --filter @<game>/server build` 실행 (서버가 있는 경우)

## 규칙

- CLAUDE.md를 **반드시 먼저** 읽고 업데이트합니다.
- 타입 변경 시 서버 스키마 동기화를 절대 빠뜨리지 않습니다.
- 테스트 없이 규칙을 구현하지 않습니다.
- 빌드가 성공하는지 반드시 확인합니다.
