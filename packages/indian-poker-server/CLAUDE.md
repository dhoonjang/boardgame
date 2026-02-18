# Indian Poker Server

## AI 캐릭터 시스템

### 캐릭터 구조

```
src/ai/
├── character.ts          # AICharacter 인터페이스 정의
├── characters/
│   ├── index.ts          # 캐릭터 레지스트리 (getCharacter, getAllCharacterInfos 등)
│   ├── elon-musk.ts      # 일론 머스크 (normal 난이도)
│   ├── warren-buffett.ts # 워렌 버핏 (hard 난이도)
│   └── kim-jongyoun.ts   # 김종윤 (normal 난이도)
├── brain.ts              # 즉각 반응, 폴백 결정 로직
├── player.ts             # AIPlayer 클래스 (Socket.IO 연동)
├── prompt.ts             # 시스템 프롬프트 빌드, 이벤트 메시지 포맷
├── types.ts              # AIDecision, AIContext, AIResponse 등 타입
└── logger.ts             # AI 게임 마크다운 로그 기록
```

### 새 캐릭터 추가 방법

1. `src/ai/characters/{character-id}.ts` 파일 생성 (기존 캐릭터 참고)
2. `AICharacter` 인터페이스 구현: id, name, description, difficulty, avatarUrl, expressionProfile, characterPrompt
3. `src/ai/characters/index.ts`의 `characters` 배열에 추가
4. 레퍼런스 이미지를 `scripts/references/{character-id}.jpg`에 배치
5. `npx tsx scripts/generate-character-images.ts --character {character-id}` 로 표정 이미지 20개 생성

### 표정 시스템 (20종)

poker_face, confident, nervous, smirking, surprised, thinking, taunting, laughing, angry, disappointed, pleased, shocked, cold, sweating, mocking, bewildered, scheming, relieved, devastated, respect

### 난이도별 차이

- **easy**: 단순 승률 계산
- **normal**: 단순 + 정밀 승률 블렌딩
- **hard**: 덱 카운팅 기반 정밀 승률 계산

### 현재 캐릭터

| ID | 이름 | 난이도 | 테마 |
|----|------|--------|------|
| elon-musk | 일론 머스크 | normal | 테크/우주 비유, 공격적 베팅 |
| warren-buffett | 워렌 버핏 | hard | 투자 격언, 보수적 플레이 |
| kim-jongyoun | 김종윤 | normal | AI/데이터 비유, 패턴 분석형 |
