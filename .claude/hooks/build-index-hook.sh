#!/bin/bash
# PostToolUse hook (Edit|Write): 프로젝트 현황판·미결 목록·규칙서가 바뀌면 README.md 인덱스를 다시 만든다.
# stdin: { "tool_input": { "file_path": "..." } }
ROOT="${CLAUDE_PROJECT_DIR:-$(cd "$(dirname "$0")/../.." && pwd)}"
source "$ROOT/scripts/lib.sh"

INPUT=$(cat)
FILE=$(printf '%s' "$INPUT" | jq -r '.tool_input.file_path // empty')
[ -z "$FILE" ] && exit 0
case "$FILE" in *projects/_template/*) exit 0 ;; esac

id=$(project_id_from_path "$FILE")
[ -z "$id" ] && exit 0
case "$(basename "$FILE")" in
  CLAUDE.md|open-questions.md|rules.md|design.md) ;;
  *) exit 0 ;;
esac

echo "🗂  [Hook] $(bash "$ROOT/scripts/build-index.sh")"
exit 0
