# 보드게임 기획

이 레포는 보드게임을 기획하는 곳이다. 코드가 아니라 문서를 만든다.
각 프로젝트는 새 보드게임의 **컨셉, 디자인, 규칙**을 규칙서만 읽어도 어떤 상황이든 결과가 하나로 정해지도록 정리한다.
작업 규약, 라이프사이클, 문서 형식은 [CLAUDE.md](CLAUDE.md)에 있다.

## 프로젝트

<!-- 아래 표는 scripts/build-index.sh 가 생성한다. 손으로 고치지 말 것. -->

| 프로젝트 | 이름 | status | 인원 | 버전 | 열린 Q | TBD | 갱신 |
|---|---|---|---|---|---|---|---|
| [forgod](projects/forgod/) | For God | draft | 3-6 | 0.1.0 | 31 | 44 | 2026-09-06 |
| [pass-and-shoot](projects/pass-and-shoot/) | 패스 앤 슛 | idea | 2 | 0.1.0 | 18 | 0 | 2026-09-06 |

## 라이프사이클

`idea` → `draft` → `review` → `final`. 어느 단계에서든 `archived` 로 갈 수 있다.
진입 조건은 CLAUDE.md 의 라이프사이클 표를 따르고, `/promote <id>` 가 검사한다.

## 시작하기

```bash
/new-project <game-id> <이름>   # 새 기획 시작
/add-rule <game-id> <규칙>       # 규칙 추가·변경
/audit <game-id>                 # 결정론성 감사
/simulate <game-id> <시나리오>   # 규칙서만으로 가상 플레이
/promote <game-id>               # 다음 단계로
```
