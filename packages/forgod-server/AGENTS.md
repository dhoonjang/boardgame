# AGENTS.md

This file provides guidance for working with the `@forgod/server` package.

## 패키지 역할

- `@forgod/server`는 For God의 HTTP API 서버와 게임 로직(`src/game`)을 함께 포함한다.
- 프론트 패키지(`forgod`)는 `@forgod/server/game` 서브패스를 통해 타입/상수/로직 시그니처를 참조한다.
- 구현 기준 규칙 문서는 `GAME_RULES.md`를 우선 참고한다.

## 게임 규칙 문서화

게임 규칙 변경 또는 신규 규칙 발견 시 아래를 함께 업데이트한다.

- `src/game/constants.ts`
- `src/game/types.ts`
- 필요한 경우 `src/game/__tests__/*` 테스트

## 테스트

```bash
pnpm --filter @forgod/server test
```
