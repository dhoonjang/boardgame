#!/bin/bash
# PreToolUse hook: core 로직 파일 수정 시 CLAUDE.md 리마인더
# stdin으로 JSON이 들어옴: { "tool_name": "Edit", "tool_input": { "file_path": "..." } }

INPUT=$(cat)
FILE_PATH=$(echo "$INPUT" | jq -r '.tool_input.file_path // empty')

if [ -z "$FILE_PATH" ]; then
  exit 0
fi

# engine/, types.ts, constants.ts 파일인지 확인
if echo "$FILE_PATH" | grep -qE '(engine/|types\.ts|constants\.ts)'; then
  # 어떤 게임의 파일인지 추출 (packages/<game>-core/ 패턴)
  GAME=$(echo "$FILE_PATH" | grep -oE 'packages/([a-z]+)-core/' | sed 's|packages/||;s|-core/||')

  if [ -n "$GAME" ]; then
    CLAUDE_MD="packages/${GAME}-core/CLAUDE.md"
    echo "⚠️  [Hook] ${GAME}-core의 핵심 파일을 수정하려고 합니다."
    echo "   📖 먼저 ${CLAUDE_MD}를 읽고 현재 규칙을 파악했는지 확인하세요."
    echo "   변경된 규칙이 있으면 CLAUDE.md도 함께 업데이트하세요."
  fi
fi

exit 0
