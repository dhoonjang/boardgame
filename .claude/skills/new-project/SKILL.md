---
description: 새 보드게임 기획 프로젝트를 만듭니다. 인터뷰 → _template 복사 → concept.md 초안 → 인덱스 갱신.
argument-hint: <game-id> [게임 이름]
allowed-tools: Read, Write, Edit, Glob, Grep, Bash, AskUserQuestion
---

# /new-project

새 프로젝트 `projects/<game-id>/` 를 만든다.

## 인자: $ARGUMENTS

- 첫 단어가 `<game-id>` (영문 소문자, 숫자, 하이픈). 나머지는 게임 이름.
- id 가 없으면 사용자에게 묻는다. `projects/<game-id>/` 가 이미 있으면 중단하고 알린다.

## 1단계: 인터뷰

아래를 한 번에 묻는다. 사용자가 이미 말한 것은 다시 묻지 않는다. 답이 없는 항목은 비워 두고 Q 로 등록한다.

1. 한 줄 소개 (누가 되어 무엇을 하며 어떻게 이기는가)
2. 인원, 목표 플레이 시간
3. 테마와 분위기
4. 핵심 메커닉 2~5개
5. 레퍼런스 게임과 다르게 할 점
6. 이미 정해진 것 / 아직 정하지 않은 것

## 2단계: 스캐폴딩

1. `projects/_template/` 을 `projects/<game-id>/` 로 복사한다 (AGENTS.md 심볼릭 링크 포함).
2. CLAUDE.md frontmatter 를 채운다: id, name, status(`idea` 또는 concept 이 충분하면 `draft`), players, playtime, version `0.1.0`, updated 오늘 날짜.
3. 모든 파일의 `<게임 이름>` 자리표시자를 실제 이름으로 바꾼다.
4. concept.md 를 인터뷰 내용으로 채운다. 모르는 항목은 "미정 (Q-n)" 으로 쓴다.
5. open-questions.md 에 인터뷰에서 나온 미정 사항을 Q-1 부터 등록한다. 템플릿의 예시 Q-1 은 지운다.
6. decisions.md 의 D-1 을 "프로젝트 시작" 으로 채운다. 결정: 인터뷰에서 확정된 것만. 확정되지 않은 것은 D 가 아니라 Q 다.
7. CLAUDE.md 의 "지금 할 일" 을 실제 다음 작업으로 채운다.

## 3단계: 마무리

- `bash scripts/build-index.sh` 로 README.md 인덱스를 갱신한다.
- 만든 파일 목록, status, 등록한 Q 개수를 보고한다.
- rules.md 와 design.md 는 템플릿 그대로 둔다. 규칙은 `/add-rule` 로 하나씩 넣는다.

## 규칙

- 사용자가 말하지 않은 규칙이나 수치를 지어내지 않는다. 빈칸은 Q 다.
- `_template` 을 고치지 않는다.
