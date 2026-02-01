# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## 중요: 게임 규칙 문서화

**게임 로직 관련 작업 시 반드시 준수할 것:**

1. **작업 전**: 해당 게임의 `CLAUDE.md`를 먼저 읽어서 현재 규칙을 파악
2. **새로운 규칙 발견 시**: 사용자가 알려준 규칙이나 구현하면서 알게 된 규칙을 즉시 `CLAUDE.md`에 반영
3. **혼동 방지**: 규칙이 불명확하거나 기존 문서와 다르면 사용자에게 확인 후 문서 업데이트

예시: forgod 게임 작업 시 → `packages/forgod-core/CLAUDE.md` 확인 및 업데이트

## 프로젝트 개요

보드게임 프로젝트 모노레포. 여러 보드게임을 패키지로 관리합니다.

## 모노레포 구조

```
boardgame/
├── packages/
│   ├── <game>/           # 게임별 웹 UI
│   ├── <game>-core/      # 게임별 로직 라이브러리 (순수 TypeScript)
│   └── <game>-server/    # 게임별 MCP 서버 + HTTP API
├── pnpm-workspace.yaml
└── turbo.json
```

### 현재 게임
- **forgod**: For God - 신과 마왕 사이에서 운명을 선택하는 3~6인용 전략 보드게임

## 패키지 구조 패턴

각 게임은 3개 패키지로 구성:

| 패키지 | 역할 | 기술 스택 |
|--------|------|-----------|
| `<game>` | 웹 UI | Vite + React + React Router + Zustand + Tailwind |
| `<game>-core` | 게임 로직 | 순수 TypeScript, tsup 빌드, Vitest 테스트 |
| `<game>-server` | MCP/API 서버 | Hono + Supabase + MCP SDK |

패키지 의존성: `<game>` → `<game>-core` ← `<game>-server`

## 공통 명령어

```bash
# 의존성 설치
pnpm install

# 특정 패키지 명령어 실행
pnpm --filter <package-name> <script>

# 예시
pnpm --filter forgod dev
pnpm --filter @forgod/core build
pnpm --filter @forgod/server start:api
```

## forgod 게임 명령어

```bash
# 개발
pnpm dev                 # forgod 개발 서버 (Vite HMR)

# 빌드
pnpm build:all           # 전체 빌드 (core → server → forgod 순서)
pnpm build:core          # forgod-core만 빌드
pnpm build:server        # forgod-server만 빌드

# 테스트
pnpm test:core           # forgod-core 테스트 (Vitest)

# 린트
pnpm lint                # forgod 린트

# 서버
pnpm api:start           # HTTP API 서버 시작
pnpm api:dev             # API 개발 모드 (빌드 후 시작)
pnpm mcp:start           # MCP 서버 시작
pnpm mcp:inspect         # MCP 인스펙터로 테스트
```

## 새 게임 추가 시

1. `packages/<game>/` - 웹 UI 패키지 생성
2. `packages/<game>-core/` - 게임 로직 패키지 생성
3. `packages/<game>-server/` - 서버 패키지 생성 (필요시)
4. 루트 `package.json`에 편의 스크립트 추가
5. 게임별 `CLAUDE.md` 작성 (게임 규칙, 타입 구조 등)

## 기술 스택

- **Package Manager**: pnpm 9.15+
- **Build System**: Turborepo
- **언어**: TypeScript 5.0+
