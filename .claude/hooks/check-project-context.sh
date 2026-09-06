#!/bin/bash
# PreToolUse hook (Edit|Write): 프로젝트 문서를 고치기 전에 현황판·결정 로그 확인을 상기시킨다.
# stdin: { "tool_input": { "file_path": "..." } }
ROOT="${CLAUDE_PROJECT_DIR:-$(cd "$(dirname "$0")/../.." && pwd)}"
source "$ROOT/scripts/lib.sh"

INPUT=$(cat)
FILE=$(printf '%s' "$INPUT" | jq -r '.tool_input.file_path // empty')
[ -z "$FILE" ] && exit 0

case "$FILE" in
  *projects/_template/*)
    echo "ℹ️  [Hook] _template 을 고치면 이후 /new-project 로 만드는 모든 프로젝트에 반영됩니다. 기존 프로젝트에는 반영되지 않습니다."
    exit 0 ;;
esac

id=$(project_id_from_path "$FILE")
[ -z "$id" ] && exit 0
base=$(basename "$FILE")
case "$base" in
  rules.md|design.md|concept.md) ;;
  *) exit 0 ;;
esac

status=$(project_field "$id" status)
echo "📖 [Hook] projects/$id/$base 수정 전: CLAUDE.md(현황판)와 decisions.md 를 읽었는지, 이 변경이 기존 결정(D-n)과 충돌하지 않는지 확인하세요."
case "$base" in
  rules.md)
    echo "   규칙 ID는 재사용 금지. 근거는 decisions.md 에 D-n 으로, 미결은 [TBD Q-n: 설명] 으로, 수치는 design.md 표를 가리키도록." ;;
  design.md)
    echo "   수치를 바꾸면 rules.md 에서 같은 수치를 쓰는 규칙도 함께 확인하세요." ;;
esac
if [ "$status" = "final" ]; then
  echo "🚫 [Hook] status=final 프로젝트입니다. 수정하려면 (1) 사용자의 명시적 결정 (2) decisions.md 에 D-n 기록 (3) version 올리기가 모두 필요합니다."
fi
exit 0
