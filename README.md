# Boardgame Monorepo

보드게임 프로젝트 모노레포입니다.

## 패키지

| 패키지 | 설명 |
|--------|------|
| [forgod](./packages/forgod) | For God - 신과 마왕 사이에서 운명을 선택하는 전략 보드게임 |

## 기술 스택

- **Package Manager**: pnpm
- **Build System**: Turborepo
- **Framework**: Next.js 14

## 시작하기

```bash
# 의존성 설치
pnpm install

# forgod 개발 서버 실행
pnpm dev

# 빌드
pnpm build
```

## 프로젝트 구조

```
boardgame/
├── packages/
│   └── forgod/          # For God 보드게임
├── pnpm-workspace.yaml
├── turbo.json
└── package.json
```
