#!/bin/bash
# status 전환 게이트 검사. 조건을 하나라도 못 채우면 exit 1 과 함께 미충족 목록을 찍는다.
# 사용법: scripts/promote-check.sh <project-id> <target-status>
#   target-status: draft | review | final | archived
# 이 스크립트는 파일을 바꾸지 않는다. 실제 전환은 /promote 스킬이 한다.
set -u
source "$(dirname "$0")/lib.sh"

id="${1:-}"; target="${2:-}"
if [ -z "$id" ] || [ -z "$target" ]; then
  echo "usage: $0 <project-id> <draft|review|final|archived>" >&2
  exit 2
fi
dir="$PROJECTS_DIR/$id"
[ -d "$dir" ] || { echo "프로젝트가 없습니다: $id"; exit 2; }
current="$(project_field "$id" status)"
unmet=0
fail() { unmet=$((unmet + 1)); echo "  ✗ $*"; }
ok() { echo "  ✓ $*"; }

echo "[promote-check] $id: $current → $target"

case "$target" in
  draft)
    [ -f "$dir/concept.md" ] && ok "concept.md 있음" || fail "concept.md 없음"
    n=$(placeholder_count "$dir/concept.md")
    [ "$n" -eq 0 ] && ok "concept.md 자리표시자 없음" || fail "concept.md 에 템플릿 자리표시자 <...> 가 ${n}줄 남아 있음"
    [ -f "$dir/rules.md" ] && ok "rules.md 있음" || fail "rules.md 없음"
    [ -f "$dir/design.md" ] && ok "design.md 있음" || fail "design.md 없음"
    ;;
  review)
    for f in concept.md design.md rules.md; do
      n=$(placeholder_count "$dir/$f")
      [ "$n" -eq 0 ] && ok "$f 자리표시자 없음" || fail "$f 에 자리표시자 <...> 가 ${n}줄 남아 있음"
    done
    if bash "$ROOT/scripts/lint-rules.sh" "$id" --strict > /dev/null 2>&1; then
      ok "lint --strict 통과 (TBD 0, 모호어 0, ID 정합)"
    else
      fail "lint --strict 실패. scripts/lint-rules.sh $id 로 상세 확인"
    fi
    d=$(grep -cE '^## D-[0-9]+' "$dir/decisions.md" 2>/dev/null)
    [ "${d:-0}" -ge 1 ] && ok "decisions.md 에 결정 ${d}건" || fail "decisions.md 에 결정이 없음"
    ;;
  final)
    if bash "$ROOT/scripts/lint-rules.sh" "$id" --strict > /dev/null 2>&1; then
      ok "lint --strict 통과"
    else
      fail "lint --strict 실패. scripts/lint-rules.sh $id 로 상세 확인"
    fi
    q=$(open_question_count "$id")
    [ "$q" -eq 0 ] && ok "열린 Q 없음" || fail "열린 Q ${q}개"
    p=$(find "$dir/playtests" -type f -name '*.md' ! -name 'TEMPLATE.md' 2>/dev/null | wc -l | tr -d ' ')
    [ "$p" -ge 1 ] && ok "플레이테스트/시뮬레이션 기록 ${p}개" || fail "playtests/ 에 기록이 없음 (/simulate 또는 /playtest 로 1개 이상)"
    v=$(project_field "$id" version)
    grep -q "버전: $v" "$dir/rules.md" && ok "rules.md 버전($v)이 frontmatter 와 일치" || fail "rules.md 의 버전 표기가 frontmatter version($v)과 다름"
    ;;
  archived)
    ok "archived 는 조건 없음. decisions.md 에 중단 이유를 D-n 으로 남길 것"
    ;;
  *)
    echo "알 수 없는 status: $target" >&2; exit 2
    ;;
esac

if [ "$unmet" -eq 0 ]; then
  echo "→ 전환 가능"
  exit 0
fi
echo "→ 미충족 ${unmet}건. 전환 불가"
exit 1
