# For God - 보드게임 웹 구현

신과 마왕 사이에서 운명을 선택하는 전략 보드게임 "For God"의 Next.js 웹 구현 프로젝트입니다.

## 게임 소개

용사들이 몬스터를 사냥하고, 계시를 수행하며, 신성과 타락 사이에서 선택하는 전략 보드게임입니다.
자세한 게임 규칙은 [GAME_DESIGN.md](./GAME_DESIGN.md)를 참조하세요.

## 기술 스택

- **Framework**: Next.js 14 (App Router)
- **Language**: TypeScript
- **Styling**: Tailwind CSS
- **State Management**: Zustand

## 실행 방법

```bash
# 루트 디렉토리에서
pnpm install
pnpm dev

# 또는 이 디렉토리에서
pnpm install
pnpm dev
```

## 프로젝트 구조

```
src/
├── app/
│   ├── page.tsx              # 메인 페이지 (로비)
│   ├── game/
│   │   └── new/
│   │       └── page.tsx      # 새 게임 설정
│   └── layout.tsx
├── components/               # UI 컴포넌트
├── lib/
│   ├── types.ts              # 타입 정의
│   └── constants.ts          # 게임 상수 (스킬, 아이템 등)
└── public/                   # 정적 파일
```

## 개발 로드맵

- [x] 프로젝트 초기 설정
- [x] 게임 타입 및 상수 정의
- [ ] 게임 보드 UI 구현
- [ ] 플레이어 상태판 구현
- [ ] 주사위 시스템 구현
- [ ] 이동 로직 구현
- [ ] 전투 시스템 구현
- [ ] 스킬 시스템 구현
- [ ] 몬스터 AI 구현
- [ ] 계시 카드 시스템 구현
- [ ] 아이템 시스템 구현
- [ ] 멀티플레이어 지원

## 참고 문서

- [게임 기획서](./GAME_DESIGN.md)
- [Notion 원본 문서](https://www.notion.so/mlpingpong/For-God-2648134480b980d78fd3fab087899231)
