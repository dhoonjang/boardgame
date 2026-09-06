# CLAUDE.md

이 파일은 Claude Code 와 Codex(AGENTS.md 는 이 파일의 심볼릭 링크)가 이 레포에서 일할 때 따르는 규약이다.

## 이 레포의 정체

**보드게임 기획 레포.** 코드가 아니라 기획 문서를 만든다.

각 프로젝트의 목적은 새 보드게임의 **컨셉, 디자인, 규칙**을 **결정론적으로** 정리하는 것이다.
"결정론적" 이란 규칙서만 읽고도 어떤 게임 상황에서든 결과가 하나로 정해지는 상태를 말한다. 두 사람이 같은 상황에서 규칙서를 읽고 다른 결론에 이르면 그 규칙서는 아직 끝나지 않은 것이다.

여러 프로젝트가 동시에 다른 성숙도로 존재한다. 어떤 것은 컨셉 한 단락이고, 어떤 것은 확정되어 약간의 손질만 남았다. 성숙도는 프로젝트 `CLAUDE.md` 의 `status` 가 말한다.

## 작업 원칙 (반드시 준수)

1. **작업 전** 대상 프로젝트의 `CLAUDE.md` (현황판) 와 `decisions.md` 를 먼저 읽는다. 세션 시작 시 hook 이 프로젝트 목록을 보여 준다.
2. **사용자가 규칙을 말하면** 즉시 `rules.md` 에 반영하고, 근거를 `decisions.md` 에 D-n 으로 남긴다.
3. **기존 규칙이나 결정과 다르면** 임의로 고르지 않고 사용자에게 두 가지를 나란히 보여 주고 확인한다.
4. **결정되지 않은 것은 지어내지 않는다.** `[TBD Q-n: 설명]` 마커로 남기고 `open-questions.md` 에 등록한다. "상식적으로 이럴 것" 은 결정이 아니다.
5. **`final` 프로젝트를 고칠 때는** 사용자의 명시적 결정, D-n 기록, version 상승이 모두 필요하다.
6. 수치는 `design.md` 표가 원본이다. `rules.md` 는 표를 가리키고 숫자를 반복하지 않는다.

## 구조

```
boardgame/
├── CLAUDE.md              # 이 파일. 규약
├── AGENTS.md              # → CLAUDE.md (Codex 용 심볼릭 링크)
├── README.md              # 프로젝트 인덱스. scripts/build-index.sh 가 생성. 손으로 고치지 말 것
├── projects/
│   ├── _template/         # /new-project 가 복사하는 원본
│   └── <game-id>/
│       ├── CLAUDE.md      # 현황판: frontmatter(status 등), 핵심 결정 요약, 지금 할 일
│       ├── AGENTS.md      # → CLAUDE.md
│       ├── concept.md     # 컨셉: 테마, 핵심 경험, 인원/시간, 메커닉 요약, 레퍼런스
│       ├── design.md      # 디자인: 구성물, 카드·토큰 표, 모든 수치, 밸런스 근거
│       ├── rules.md       # 규칙서: 용어집부터 종료 조건까지, 규칙 ID 로 번호 매김
│       ├── decisions.md   # 결정 로그: D-n, 날짜, 결정, 이유, 대안, 영향
│       ├── open-questions.md  # 미결 사항: Q-n. final 에서는 열린 항목 0
│       ├── playtests/     # 플레이테스트 기록, /simulate 결과
│       └── assets/        # 선택. 지도, 이미지, 외부 자료 덤프
├── scripts/               # bash 스크립트. hook 과 skill 이 공유
│   ├── lib.sh             # frontmatter 읽기, 프로젝트 목록, 카운트
│   ├── lint-rules.sh      # 결정론성 lint (기계적 검사)
│   ├── build-index.sh     # README.md 인덱스 생성
│   └── promote-check.sh   # status 전환 게이트
└── .claude/
    ├── settings.json      # hooks 등록
    ├── hooks/             # SessionStart, PreToolUse, PostToolUse
    └── skills/            # new-project, add-rule, audit, simulate, promote, playtest
```

`.agents/skills` 는 `.claude/skills` 의 심볼릭 링크다. 스킬은 한 곳에만 쓴다.

프로젝트별 `CLAUDE.md` 를 진입점으로 쓰는 이유: Claude Code 는 작업 중인 파일이 속한 디렉토리의 CLAUDE.md 를 자동으로 읽는다. 그 프로젝트 파일을 건드리는 순간 status 와 핵심 결정이 컨텍스트에 들어온다.

## 라이프사이클

프로젝트 `CLAUDE.md` 상단 frontmatter 의 `status` 한 필드로 관리한다. 전환은 `/promote` 가 하고, 조건 검사는 `scripts/promote-check.sh` 가 한다.

| status | 의미 | 진입 조건 |
|---|---|---|
| `idea` | 컨셉 한 단락만 있다 | 없음 |
| `draft` | concept 완성, design/rules 초안. `[TBD]` 허용 | concept.md 에 자리표시자 없음. rules.md, design.md 존재 |
| `review` | 규칙 확정 후보. 검토와 플레이테스트 중 | 세 문서 자리표시자 없음. lint --strict 통과 (TBD 0, 모호어 0, ID 정합). decisions ≥ 1 |
| `final` | 확정. 변경은 D-n 기록과 version 상승 필수 | review 조건 + 열린 Q 0 + playtests/ 기록 ≥ 1 + 버전 표기 일치 |
| `archived` | 중단 | 없음. D-n 에 이유 |

frontmatter 필드: `id`, `name`, `status`, `players`, `playtime`, `version`, `updated`. 전부 한 줄 `key: value`.

version 은 semver 흉내: draft 안에서 규칙이 크게 바뀌면 patch, review 진입에 minor, final 진입에 1.0.0, final 이후 변경은 minor.

## 문서 규약

### 규칙 ID

- 모든 규칙은 `- **R-<섹션>.<번호>** 한 문장.` 형식이다. 섹션 번호는 `## N.` 헤딩의 N 과 같아야 한다.
- 번호는 재사용하지 않는다. 규칙을 바꾸면 옛 것을 "폐기된 규칙" 표로 옮기고 새 번호를 쓴다. 문구만 다듬는 것은 같은 번호를 유지한다.
- 다른 규칙, Q, D 를 가리킬 때는 반드시 ID 로 가리킨다.

### TBD 마커

- 형식: `[TBD Q-n: 짧은 설명]`. Q 번호 없는 TBD 는 lint 가 잡는다.
- 마커가 가리키는 Q 는 open-questions.md 에 열려 있어야 한다. Q 가 닫히면 마커도 지운다.

### 모호어 금지

규칙서에서 다음 표현은 lint 가 잡는다: 보통, 대개, 대체로, 적절히, 적당히, 가능하면, 가급적, 웬만하면, 아마, 대략, 알아서, 상황에 따라, 필요에 따라, 경우에 따라, 수도 있다, 등등, " 등".
의도한 표현이면 줄 끝에 `<!-- lint:ignore -->` 를 붙인다. 그 외의 모호함(주어 없는 문장, 두 결과가 열린 문장)은 `/audit` 이 잡는다.

### 용어집

- rules.md 의 0장은 용어집이다. 규칙에 쓰는 명사는 용어집에 정의된 것만 쓴다.
- 새 용어가 필요하면 규칙을 쓰기 전에 용어집에 넣는다.

### rules.md 필수 섹션

용어집, 셋업, 우선순위와 타이밍, 규칙에 없는 상황, 게임 종료. lint 가 헤딩 존재를 검사한다.
"규칙에 없는 상황" 에는 폴백 절차를 반드시 적는다. 폴백이 있어야 규칙서가 어떤 상황에서든 답을 낸다.

### 수치

- 모든 수치는 design.md 의 표에 있어야 하고, rules.md 는 그 표를 가리킨다.
- 표의 숫자를 바꾸면 rules.md 에서 그 숫자를 쓰는 규칙을 함께 확인한다. hook 이 상기시킨다.

### 결정 로그 (decisions.md)

```
## D-n (YYYY-MM-DD) 제목
- **결정**: 결과만
- **이유**: 근거
- **대안**: 버린 선택지와 버린 이유
- **영향**: 규칙 ID, 닫힌 Q
```

사용자가 확인하지 않은 것은 결정이 아니라 Q 다.

### 미결 사항 (open-questions.md)

```
- [ ] **Q-n** 질문 — 관련: R-x.y, design.md#섹션
  - 후보: (a) ... (b) ...
```

해결되면 `[x]` 로 바꾸고 `→ D-n` 을 붙인다. 지우지 않는다.

## Skills

| skill | 하는 일 |
|---|---|
| `/new-project <id> [이름]` | 인터뷰 → `_template` 복사 → concept.md 초안 → Q 등록 → 인덱스 갱신 |
| `/add-rule <id> <규칙>` | 충돌 검사 → 규칙 ID 부여 → rules.md 반영 → D-n 기록 → 관련 Q 닫기 → lint |
| `/audit <id> [--register]` | 읽기 전용 결정론성 감사. lint + 의미 검사(미정의 용어, 모순, 미커버 상황, 수치 불일치) 를 표로 보고 |
| `/simulate <id> [시나리오]` | 규칙서만으로 가상 플레이. 매 단계 규칙 ID 인용, 결과가 정해지지 않는 지점을 Q 로 등록. 테스트의 대체물 |
| `/promote <id> [status]` | 진입 조건 검사 후 status 전환. 실패 시 미충족 항목만 보고 |
| `/playtest <id>` | 실제 플레이 결과 기록, 이슈를 Q 로 연결 |

## Hooks

전부 bash + jq. Node 나 다른 런타임을 쓰지 않는다.

| 이벤트 | 대상 | 동작 |
|---|---|---|
| SessionStart | 전체 | 프로젝트 목록과 status, 열린 Q, TBD 수를 출력 |
| PreToolUse Edit/Write | `projects/*/{rules,design,concept}.md` | 현황판·결정 로그 확인 리마인드. status=final 이면 강한 경고 |
| PostToolUse Edit/Write | `projects/*/{rules,design,open-questions}.md` | `scripts/lint-rules.sh` 실행 |
| PostToolUse Edit/Write | `projects/*/{CLAUDE,open-questions,rules,design}.md` | README.md 인덱스 재생성 |

한계: hook 은 Edit/Write 도구에만 걸린다. Bash 로 파일을 고치면 걸리지 않으므로, 규칙 문서는 Edit/Write 로 고치고 `/audit` 과 `/promote` 가 같은 lint 를 다시 돌린다.

## 스크립트

```bash
bash scripts/lint-rules.sh <id> [--strict]   # 결정론성 lint. --strict 는 문제 시 exit 1
bash scripts/build-index.sh [--print]        # README.md 생성 / 요약 출력
bash scripts/promote-check.sh <id> <status>  # 전환 게이트 검사
```

## 새 프로젝트를 만들 때

`/new-project` 를 쓴다. 손으로 만들 때는 `projects/_template/` 을 복사하고 frontmatter 를 채운 뒤 `bash scripts/build-index.sh` 를 돌린다. `_template` 자체는 고치지 않는다. 템플릿을 바꾸는 것은 모든 미래 프로젝트에 영향을 주므로 사용자 결정이다.

## 이관 기록

2026-09-06 에 코드 모노레포(forgod, indian-poker 웹 구현)에서 기획 레포로 전환했다. 옛 코드는 git 태그 `archive/code-v0` 에 있다. forgod 기획은 `projects/forgod/` 로 이관했다.
