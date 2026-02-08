---
description: 새 보드게임의 3개 패키지(core, server, UI)를 스캐폴딩합니다.
allowed-tools: Read, Edit, Write, Grep, Glob, Bash
---

# /add-game

새 보드게임을 위한 패키지 구조를 생성합니다.

## 게임 이름: $ARGUMENTS

인자가 없으면 사용자에게 게임 이름(영문 소문자)을 요청합니다.

## 사전 확인

사용자에게 다음 정보를 확인합니다:
- 게임 이름 (영문 소문자, 예: `forgod`)
- 간단한 게임 설명
- 플레이어 수
- 서버 패키지 필요 여부

## 워크플로우

### 1단계: core 패키지 생성
`packages/<game>-core/` 구조:

```
<game>-core/
├── package.json
├── tsconfig.json
├── tsup.config.ts
├── CLAUDE.md           # 게임 규칙 문서
├── src/
│   ├── types.ts        # 타입 정의
│   ├── constants.ts    # 게임 상수
│   ├── index.ts        # export
│   ├── engine/
│   │   └── game-engine.ts
│   └── __tests__/
│       ├── test-helpers.ts
│       └── game-engine.test.ts
```

- forgod-core의 package.json, tsconfig.json, tsup.config.ts를 참고하여 생성
- 패키지명: `@<game>/core`

### 2단계: 서버 패키지 생성 (선택)
`packages/<game>-server/` 구조:

```
<game>-server/
├── package.json
├── tsconfig.json
├── src/
│   ├── index.ts        # Hono 서버
│   ├── api.ts          # API 라우트
│   ├── session.ts      # 세션 관리
│   └── schemas/
│       └── action.ts   # Zod 스키마
```

- forgod-server를 참고하여 생성
- 패키지명: `@<game>/server`

### 3단계: UI 패키지 생성
`packages/<game>/` 구조:

```
<game>/
├── package.json
├── tsconfig.json
├── tsconfig.app.json
├── tsconfig.node.json
├── vite.config.ts
├── tailwind.config.js
├── postcss.config.js
├── index.html
├── src/
│   ├── main.tsx
│   ├── App.tsx
│   ├── index.css
│   ├── store/
│   └── components/
```

- forgod 패키지를 참고하여 생성
- 패키지명: `<game>`

### 4단계: 루트 설정 업데이트
- `pnpm-workspace.yaml`에 새 패키지 경로 추가 (필요 시)
- 루트 `package.json`에 편의 스크립트 추가:
  - `<game>:dev`, `<game>:build`, `<game>:test`
  - `<game>:server:dev`, `<game>:server` (서버가 있는 경우)

### 5단계: CLAUDE.md 작성
- `packages/<game>-core/CLAUDE.md`에 게임 규칙 초안 작성
- 루트 `CLAUDE.md`의 "현재 게임" 섹션에 추가

### 6단계: 검증
```bash
pnpm install
pnpm --filter @<game>/core build
pnpm --filter @<game>/core test
```

## 규칙

- 기존 forgod 패키지를 템플릿으로 사용하되, 게임별 이름과 설명을 적절히 변경합니다.
- 의존성 버전은 기존 패키지와 동일하게 맞춥니다.
- CLAUDE.md를 반드시 작성합니다.
