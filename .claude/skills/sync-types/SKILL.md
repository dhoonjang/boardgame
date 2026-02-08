---
description: core 타입 변경 후 서버/UI 전체 동기화 및 빌드 검증을 수행합니다.
allowed-tools: Read, Edit, Write, Grep, Glob, Bash
---

# /sync-types

core 패키지의 타입 변경 사항을 서버와 UI에 동기화합니다.

## 대상 게임: $ARGUMENTS

인자가 없으면 사용자에게 게임을 선택하도록 요청합니다.

## 워크플로우

### 1단계: 변경 사항 파악
- `packages/<game>-core/src/types.ts`의 최근 변경 사항을 확인합니다.
- 변경된 타입/인터페이스를 나열합니다.

### 2단계: 서버 Zod 스키마 동기화
- `packages/<game>-server/src/schemas/action.ts`를 읽고 types.ts와 비교합니다.
- 불일치하는 부분을 수정합니다:
  - 새로 추가된 GameAction variant → Zod 스키마 추가
  - 변경된 필드 → Zod 스키마 업데이트
  - 삭제된 variant → Zod 스키마 제거

### 3단계: 서버 API 핸들러 확인
- `packages/<game>-server/src/api.ts`에서 타입 관련 코드를 확인합니다.
- 응답 형식이 변경된 경우 업데이트합니다.

### 4단계: UI 스토어 확인
- `packages/<game>/src/store/` 내 파일들을 확인합니다.
- core 타입을 사용하는 부분이 변경에 맞게 업데이트되었는지 확인합니다.

### 5단계: UI 컴포넌트 확인
- `packages/<game>/src/components/` 내 파일들을 확인합니다.
- core 타입을 직접 참조하는 컴포넌트를 업데이트합니다.

### 6단계: 빌드 검증
```bash
pnpm --filter @<game>/core build
pnpm --filter @<game>/server build   # 서버가 있는 경우
pnpm --filter <game> build           # UI
```

### 7단계: 테스트 실행
```bash
pnpm --filter @<game>/core test
pnpm --filter @<game>/server test    # 서버 테스트가 있는 경우
```

## 규칙

- 타입 변경의 영향 범위를 빠짐없이 확인합니다.
- 빌드와 테스트가 모두 통과해야 동기화가 완료된 것입니다.
- 동기화 과정에서 발견된 불일치는 즉시 수정합니다.
