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
- **Real-time**: Socket.io (멀티플레이어)
- **Database**: Prisma + PostgreSQL (게임 세션 저장)

## 프로젝트 구조

```
boardgame/
├── app/
│   ├── page.tsx                 # 메인 페이지 (로비)
│   ├── game/
│   │   └── [id]/
│   │       └── page.tsx         # 게임 플레이 페이지
│   └── layout.tsx
├── components/
│   ├── board/
│   │   ├── GameBoard.tsx        # 게임 보드
│   │   ├── Tile.tsx             # 타일 컴포넌트
│   │   └── HeroToken.tsx        # 용사 말
│   ├── player/
│   │   ├── PlayerStatus.tsx     # 플레이어 상태판
│   │   ├── StatDice.tsx         # 능력치 주사위
│   │   └── SkillList.tsx        # 스킬 목록
│   ├── cards/
│   │   ├── RevelationCard.tsx   # 계시 카드
│   │   └── ItemCard.tsx         # 아이템 카드
│   ├── dice/
│   │   ├── MoveDice.tsx         # 이동 주사위
│   │   └── MonsterDice.tsx      # 몬스터 주사위
│   └── ui/
│       ├── Button.tsx
│       ├── Modal.tsx
│       └── Toast.tsx
├── lib/
│   ├── game/
│   │   ├── types.ts             # 게임 타입 정의
│   │   ├── constants.ts         # 게임 상수 (스킬, 아이템 등)
│   │   ├── rules.ts             # 게임 규칙 로직
│   │   ├── movement.ts          # 이동 로직
│   │   ├── combat.ts            # 전투 로직
│   │   └── monster.ts           # 몬스터 AI 로직
│   └── store/
│       └── gameStore.ts         # Zustand 게임 상태 관리
├── public/
│   └── assets/
│       ├── board/               # 보드 이미지
│       ├── tokens/              # 토큰 이미지
│       └── cards/               # 카드 이미지
└── prisma/
    └── schema.prisma            # 데이터베이스 스키마
```

## 핵심 기능

### 1. 게임 보드
- 헥스/사각 타일 기반 보드 렌더링
- 타일 타입별 시각적 구분 (마을, 산, 호수, 언덕, 늪, 화염)
- 용사 말 이동 애니메이션

### 2. 플레이어 시스템
- 3가지 직업 (전사, 도적, 법사)
- 능력치 관리 (힘, 민첩, 지능)
- 체력/최대체력 시스템
- 신성/타락 상태

### 3. 전투 시스템
- 기본 공격
- 스킬 사용 (쿨타임, 소모값 관리)
- 몬스터 AI 턴

### 4. 카드 시스템
- 계시 카드 (천사/마왕)
- 아이템 카드 (무기/방어구/신발)

### 5. 멀티플레이어
- 실시간 게임 세션
- 턴 기반 동기화

## 시작하기

```bash
# 의존성 설치
npm install

# 개발 서버 실행
npm run dev

# 빌드
npm run build
```

## 개발 로드맵

- [ ] 프로젝트 초기 설정 (Next.js, TypeScript, Tailwind)
- [ ] 게임 타입 및 상수 정의
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
- [ ] 게임 세션 저장/불러오기

## 참고 문서

- [게임 기획서](./GAME_DESIGN.md)
- [Notion 원본 문서](https://www.notion.so/mlpingpong/For-God-2648134480b980d78fd3fab087899231)

## 라이선스

Private - All Rights Reserved
