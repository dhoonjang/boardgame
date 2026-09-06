#!/bin/bash
# 공용 함수. 다른 스크립트에서 `source "$(dirname "$0")/lib.sh"` 로 불러 쓴다.
# 의존: bash, awk, grep, sed. Node나 다른 런타임은 쓰지 않는다.

# bash 는 BASH_SOURCE, zsh 에서 source 할 때는 $0 이 이 파일 경로다.
_lib_src="${BASH_SOURCE[0]:-$0}"
ROOT="${CLAUDE_PROJECT_DIR:-$(cd "$(dirname "$_lib_src")/.." && pwd)}"
PROJECTS_DIR="$ROOT/projects"

# frontmatter 필드 읽기: project_field <project-id> <field>
# CLAUDE.md 첫 줄이 --- 로 시작하는 YAML 블록에서 key: value 를 찾는다.
project_field() {
  local f="$PROJECTS_DIR/$1/CLAUDE.md"
  [ -f "$f" ] || return 1
  awk -v key="$2" '
    NR == 1 { if ($0 != "---") exit; next }
    /^---$/ { exit }
    {
      i = index($0, ":")
      if (i > 0 && substr($0, 1, i - 1) == key) {
        v = substr($0, i + 1)
        sub(/^[ \t]+/, "", v); sub(/[ \t]+$/, "", v)
        print v; exit
      }
    }
  ' "$f"
}

# 프로젝트 목록 (_template 제외, CLAUDE.md 있는 디렉토리만)
list_projects() {
  local d n
  for d in "$PROJECTS_DIR"/*/; do
    [ -d "$d" ] || continue
    n="$(basename "$d")"
    [ "$n" = "_template" ] && continue
    [ -f "$d/CLAUDE.md" ] && echo "$n"
  done
}

# 파일 경로에서 프로젝트 id 추출. 프로젝트 파일이 아니면 빈 문자열.
project_id_from_path() {
  printf '%s' "$1" | sed -nE 's|.*projects/([^/]+)/.*|\1|p'
}

# 열린 Q 수 (open-questions.md 의 "- [ ] **Q-n**" 줄)
open_question_count() {
  local f="$PROJECTS_DIR/$1/open-questions.md" n
  [ -f "$f" ] || { echo 0; return; }
  n=$(grep -cE '^[[:space:]]*- \[ \] \*\*Q-[0-9]+\*\*' "$f")
  echo "${n:-0}"
}

# 마크다운 코드 스팬(`...`)을 벗겨낸 본문. 형식 설명에 든 예시가 검사에 걸리지 않게 한다.
strip_code_spans() {
  sed 's/`[^`]*`//g' "$@"
}

# TBD 마커 수 (rules.md + design.md). 코드 스팬 안의 예시는 세지 않는다.
tbd_count() {
  local d="$PROJECTS_DIR/$1" n=0 f c
  for f in "$d/rules.md" "$d/design.md"; do
    [ -f "$f" ] || continue
    c=$(strip_code_spans "$f" | grep -o '\[TBD' | wc -l | tr -d ' ')
    n=$((n + c))
  done
  echo "$n"
}

# 템플릿 자리표시자(<...>) 남은 줄 수. 글자로 시작하는 것만 세므로 <!-- --> 와 </x> 는 제외.
placeholder_count() {
  local f="$1" n
  [ -f "$f" ] || { echo 0; return; }
  n=$(strip_code_spans "$f" | grep -cE '<[가-힣A-Za-z][^<>/]*>')
  echo "${n:-0}"
}
