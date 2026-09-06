---
description: 프로젝트 status 를 다음 단계로 올립니다 (idea → draft → review → final). 진입 조건을 검사해 통과하면 frontmatter 와 인덱스를 갱신하고, 실패하면 미충족 항목만 보고합니다.
argument-hint: <game-id> [draft|review|final|archived]
allowed-tools: Read, Edit, Glob, Grep, Bash
---

# /promote

status 전환 게이트. 조건은 루트 CLAUDE.md 의 라이프사이클 표가 정의하고, 검사는 `scripts/promote-check.sh` 가 한다.

## 인자: $ARGUMENTS

- `<game-id>` 필수. 목표 status 가 없으면 현재의 다음 단계 (idea→draft, draft→review, review→final).
- `archived` 는 어느 단계에서든 갈 수 있다. final→review 같은 강등은 사용자가 명시할 때만.

## 1단계: 검사

```bash
bash scripts/promote-check.sh <id> <target>
```

- 실패하면 미충족 항목을 그대로 보고하고 **끝낸다**. 조건을 대신 채우지 않는다. (예: TBD 를 지우거나 Q 를 닫아서 통과시키지 않는다.)
- 단, 무엇을 하면 되는지는 알려 준다: "Q-3, Q-7 을 `/add-rule` 로 닫으면 됩니다" 처럼.

## 2단계: 전환

통과하면:

1. `projects/<id>/CLAUDE.md` frontmatter 의 `status` 를 바꾸고 `updated` 를 오늘로 한다.
2. `review` 나 `final` 로 갈 때 `version` 을 올린다: review 는 minor(0.1.0 → 0.2.0), final 은 major(→ 1.0.0). rules.md 의 "버전:" 줄도 같이 바꾼다.
3. CLAUDE.md 본문의 "현재 상태" 와 "지금 할 일" 을 새 단계에 맞게 고친다.
4. decisions.md 에 D-n "status 를 <target> 으로 전환" 을 남긴다. 이유에 게이트 통과 내용을 적는다.
5. `bash scripts/build-index.sh` 로 README.md 를 갱신한다.

## 3단계: 보고

전환 전후 status, version, 통과한 조건 목록.

## 규칙

- 게이트를 우회하지 않는다. 조건을 채우는 작업은 `/add-rule`, `/simulate`, `/playtest` 로 따로 한다.
- `final` 프로젝트를 고치는 것은 이 스킬의 일이 아니다. final 이후 변경은 `/add-rule` 이 D-n 기록과 version 상승을 강제한다.
