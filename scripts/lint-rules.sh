#!/bin/bash
# 결정론성 lint: rules.md, design.md, open-questions.md 의 기계적 검사.
# 의미 검사(용어 정의, 모순, 미커버 상황)는 /audit 스킬이 한다. 이 스크립트는 grep 으로 잡히는 것만 본다.
#
# 사용법: scripts/lint-rules.sh <project-id> [--strict]
#   --strict : 문제가 하나라도 있으면 exit 1. /promote 게이트가 쓴다.
#   기본     : 항상 exit 0 (hook 용). 문제는 출력으로만 알린다.
#
# 검사 항목
#   1. [TBD 마커: 개수와 위치. Q 번호 없는 TBD는 문제.
#   2. 모호어: 아래 AMBIGUOUS 목록. 줄에 `lint:ignore` 가 있으면 건너뛴다.
#   3. 규칙 ID: 중복 정의, 섹션 번호 불일치, 정의되지 않은 ID 참조(폐기 표에 있으면 허용).
#   4. 필수 섹션: 용어집, 셋업, 우선순위, 규칙에 없는 상황, 종료.
#   5. TBD ↔ Q 대응: 마커가 가리키는 Q가 열려 있는지.
#   6. status 게이트: review/final 인데 TBD·모호어가 있거나, final 인데 열린 Q가 있으면 강한 경고.

set -u
source "$(dirname "$0")/lib.sh"

id="${1:-}"
strict=0
[ "${2:-}" = "--strict" ] && strict=1
if [ -z "$id" ]; then
  echo "usage: $0 <project-id> [--strict]" >&2
  exit 2
fi

dir="$PROJECTS_DIR/$id"
rules="$dir/rules.md"
design="$dir/design.md"
oq="$dir/open-questions.md"
if [ ! -f "$rules" ]; then
  echo "[lint] $id: rules.md 가 없습니다."
  exit 2
fi

status="$(project_field "$id" status)"
problems=0
note() { echo "   $*"; }
problem() { problems=$((problems + 1)); echo "   ✗ $*"; }

echo "[lint] projects/$id (status: ${status:-?})"

# ---------- 1. TBD ----------
# 코드 스팬 안의 예시(`[TBD Q-n: 설명]`)는 제외한다.
tbd_lines=""
for f in "$rules" "$design"; do
  [ -f "$f" ] || continue
  tbd_lines+=$(strip_code_spans "$f" | grep -n '\[TBD' | sed "s|^|$(basename "$f"):|")$'\n'
done
tbd_n=$(printf '%s' "$tbd_lines" | grep -o '\[TBD' | wc -l | tr -d ' ')
tbd_q_n=$(printf '%s' "$tbd_lines" | grep -oE '\[TBD Q-[0-9]+' | grep -oE 'Q-[0-9]+' | sort -u | grep -c .)
echo "1) TBD 마커: ${tbd_n}개 (Q ${tbd_q_n}개를 가리킴)"
no_q=$(printf '%s' "$tbd_lines" | grep '\[TBD' | grep -vE '\[TBD Q-[0-9]+' || true)
if [ -n "$no_q" ]; then
  problem "Q 번호가 없는 TBD 마커 (형식: [TBD Q-n: 설명]):"
  printf '%s\n' "$no_q" | head -5 | sed 's/^/       /'
fi

# ---------- 2. 모호어 ----------
AMBIGUOUS='보통|대개|대체로|적절히|적당히|가능하면|가급적|웬만하면|아마|대략|알아서|상황에 따라|필요에 따라|경우에 따라|수도 있다|등등| 등[ ,.)]'
amb=$(grep -nE "$AMBIGUOUS" "$rules" | grep -v 'lint:ignore' | grep -vE '^[0-9]+:- 모호어' || true)
amb_n=$(printf '%s\n' "$amb" | grep -c . )
echo "2) 모호어: ${amb_n}곳"
if [ "$amb_n" -gt 0 ]; then
  problem "모호어가 있는 줄 (의도한 표현이면 줄 끝에 <!-- lint:ignore --> ):"
  printf '%s\n' "$amb" | head -8 | sed 's/^/       L/'
fi

# ---------- 3. 규칙 ID ----------
defs=$(grep -oE '^[[:space:]]*- \*\*R-[0-9]+\.[0-9]+\*\*' "$rules" | grep -oE 'R-[0-9]+\.[0-9]+')
def_n=$(printf '%s\n' "$defs" | grep -c .)
dups=$(printf '%s\n' "$defs" | sort | uniq -d)
echo "3) 규칙 ID: 정의 ${def_n}개"
if [ -n "$dups" ]; then
  problem "중복 정의된 ID: $(printf '%s' "$dups" | tr '\n' ' ')"
fi

# 섹션 번호 불일치: "## N." 아래의 R-M.x 에서 N != M
mismatch=$(awk '
  /^## [0-9]+\./ { match($0, /^## [0-9]+/); sec = substr($0, 4, RLENGTH - 3) }
  /^[[:space:]]*- \*\*R-[0-9]+\.[0-9]+\*\*/ {
    match($0, /R-[0-9]+/); rid = substr($0, RSTART + 2, RLENGTH - 2)
    if (sec != "" && rid != sec) { match($0, /R-[0-9]+\.[0-9]+/); print NR ": " substr($0, RSTART, RLENGTH) " (섹션 " sec ")" }
  }
' "$rules")
if [ -n "$mismatch" ]; then
  problem "섹션 번호와 다른 규칙 ID:"
  printf '%s\n' "$mismatch" | head -5 | sed 's/^/       L/'
fi

# 정의되지 않은 ID 참조 (rules, design, open-questions, decisions, CLAUDE.md 에서)
deprecated=$(grep -oE '^\| *R-[0-9]+\.[0-9]+ *\|' "$rules" | grep -oE 'R-[0-9]+\.[0-9]+' || true)
known=$(printf '%s\n%s\n' "$defs" "$deprecated" | grep . | sort -u)
refs=$(cat "$rules" "$design" "$oq" "$dir/decisions.md" "$dir/CLAUDE.md" 2>/dev/null | grep -oE 'R-[0-9]+\.[0-9]+' | sort -u)
broken=$(comm -23 <(printf '%s\n' "$refs") <(printf '%s\n' "$known") | grep . || true)
if [ -n "$broken" ]; then
  problem "정의되지 않은 규칙 ID 참조: $(printf '%s' "$broken" | tr '\n' ' ')"
fi

# ---------- 4. 필수 섹션 ----------
missing=""
for h in '용어집' '셋업' '우선순위' '규칙에 없는 상황' '종료'; do
  grep -qE "^## .*$h" "$rules" || missing="$missing '$h'"
done
if [ -n "$missing" ]; then
  echo "4) 필수 섹션: 누락$missing"
  problem "필수 섹션이 없습니다:$missing"
else
  echo "4) 필수 섹션: 모두 있음"
fi

# ---------- 5. TBD ↔ Q ----------
open_q=$(grep -oE '^[[:space:]]*- \[ \] \*\*Q-[0-9]+\*\*' "$oq" 2>/dev/null | grep -oE 'Q-[0-9]+' | sort -u)
done_q=$(grep -oE '^[[:space:]]*- \[x\] \*\*Q-[0-9]+\*\*' "$oq" 2>/dev/null | grep -oE 'Q-[0-9]+' | sort -u)
tbd_q=$(printf '%s' "$tbd_lines" | grep -oE '\[TBD Q-[0-9]+' | grep -oE 'Q-[0-9]+' | sort -u)
open_n=$(printf '%s\n' "$open_q" | grep -c .)
echo "5) 열린 Q: ${open_n}개 (그중 TBD 마커가 가리키는 것 ${tbd_q_n}개, 나머지는 컨셉·디자인 수준의 Q)"
dangling=$(comm -23 <(printf '%s\n' "$tbd_q") <(printf '%s\n' "$open_q") | grep . || true)
if [ -n "$dangling" ]; then
  for q in $dangling; do
    if printf '%s\n' "$done_q" | grep -qx "$q"; then
      problem "$q 는 해결됨([x])인데 TBD 마커가 아직 있습니다."
    else
      problem "$q 를 가리키는 TBD 마커가 있지만 open-questions.md 에 열린 항목이 없습니다."
    fi
  done
fi

# ---------- 6. status 게이트 ----------
case "$status" in
  review|final)
    if [ "$tbd_n" -gt 0 ] || [ "$amb_n" -gt 0 ]; then
      problem "status=$status 인데 TBD ${tbd_n}개, 모호어 ${amb_n}곳. review 이상은 둘 다 0이어야 합니다."
    fi
    if [ "$status" = final ] && [ "$open_n" -gt 0 ]; then
      problem "status=final 인데 열린 Q가 ${open_n}개 있습니다."
    fi
    ;;
esac

if [ "$problems" -eq 0 ]; then
  echo "✓ 기계적 검사 통과 (TBD ${tbd_n}개는 draft 에서 허용). 의미 검사는 /audit $id"
else
  echo "✗ 문제 ${problems}건"
fi

if [ "$strict" -eq 1 ] && { [ "$problems" -gt 0 ] || [ "$tbd_n" -gt 0 ]; }; then
  exit 1
fi
exit 0
