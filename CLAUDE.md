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
│   ├── <game>-core/      # 게임별 로직 라이브러리 (순수 TypeScript) — 선택
│   └── <game>-server/    # 게임별 서버 (게임 로직 포함 가능)
├── pnpm-workspace.yaml
└── turbo.json
```

### 현재 게임
- **forgod**: For God - 신과 마왕 사이에서 운명을 선택하는 3~6인용 전략 보드게임 (core + server + UI)
- **duel**: Bluff Duel - 인디언 포커 스타일 2인 블러프 카드 게임 (server + UI, 게임 로직은 server 내부)

## 패키지 구조 패턴

게임별로 구조가 다를 수 있음:

**forgod** (core 분리형):
| 패키지 | 역할 | 기술 스택 |
|--------|------|-----------|
| `forgod` | 웹 UI | Vite + React + React Router + Zustand + Tailwind |
| `forgod-core` | 게임 로직 | 순수 TypeScript, tsup 빌드, Vitest 테스트 |
| `forgod-server` | HTTP API 서버 | Hono + @hono/node-server + Zod |

**duel** (서버 통합형):
| 패키지 | 역할 | 기술 스택 |
|--------|------|-----------|
| `duel` | 웹 UI | Vite + React + Zustand + Tailwind |
| `duel-server` | 서버 + 게임 로직 | Socket.IO + Hono + Zod, 게임 로직은 `src/game/` |

duel 의존성: `duel` → `@duel/server/game` (타입만, vite alias로 소스 직접 참조)

## 공통 명령어

```bash
# 의존성 설치
pnpm install

# 전체 프로젝트 (Turborepo)
pnpm dev                 # 모든 패키지 dev 실행
pnpm build               # 모든 패키지 빌드
pnpm test                # 모든 패키지 테스트
pnpm lint                # 모든 패키지 린트

# 특정 패키지 명령어 실행
pnpm --filter <package-name> <script>
```

## forgod 게임 명령어

```bash
# 개발
pnpm forgod:dev          # forgod 개발 서버 (Vite HMR)
pnpm forgod:server:dev   # forgod API 서버 개발 모드 (watch)

# 빌드
pnpm forgod:build        # 전체 빌드 (core → forgod 순서)

# 테스트
pnpm forgod:test         # forgod-core 테스트 (Vitest)

# 서버
pnpm forgod:server       # forgod API 서버 시작

# 개별 패키지
pnpm --filter forgod dev
pnpm --filter @forgod/core build
pnpm --filter @forgod/core test
pnpm --filter @forgod/server start
```

## duel 게임 명령어

```bash
# 개발
pnpm duel:dev            # duel 개발 서버 (Vite HMR)
pnpm duel:server:dev     # duel Socket.IO 서버 개발 모드 (watch)

# 빌드
pnpm duel:build          # 전체 빌드 (server → duel 순서)

# 테스트
pnpm duel:test           # duel-server 테스트 (게임 로직 + 서버)

# 서버
pnpm duel:server         # duel 서버 시작 (포트 3002)

# 개별 패키지
pnpm --filter duel dev
pnpm --filter @duel/server build
pnpm --filter @duel/server test
pnpm --filter @duel/server start
```

## 새 게임 추가 시

1. `packages/<game>/` - 웹 UI 패키지 생성
2. `packages/<game>-core/` - 게임 로직 패키지 생성
3. 루트 `package.json`에 편의 스크립트 추가 (`<game>:dev`, `<game>:build`, `<game>:test`)
4. 게임별 `CLAUDE.md` 작성 (게임 규칙, 타입 구조 등)

## 기술 스택

- **Package Manager**: pnpm 9.15+
- **Build System**: Turborepo
- **언어**: TypeScript 5.0+
