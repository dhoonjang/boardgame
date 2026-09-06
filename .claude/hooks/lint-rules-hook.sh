#!/bin/bash
# PostToolUse hook (Edit|Write): rules.md / design.md / open-questions.md 를 고친 뒤 결정론성 lint 를 돌린다.
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
  rules.md|design.md|open-questions.md) ;;
  *) exit 0 ;;
esac

bash "$ROOT/scripts/lint-rules.sh" "$id"
exit 0
