#!/bin/bash
# PostToolUse hook: core 소스 수정 후 빌드 리마인더
# stdin으로 JSON이 들어옴: { "tool_name": "Edit", "tool_input": { "file_path": "..." } }

INPUT=$(cat)
FILE_PATH=$(echo "$INPUT" | jq -r '.tool_input.file_path // empty')

if [ -z "$FILE_PATH" ]; then
  exit 0
fi

# <game>-core/src/ 내 .ts 파일이고 테스트가 아닌 경우
if echo "$FILE_PATH" | grep -qE 'packages/[a-z]+-core/src/.*\.ts$' && ! echo "$FILE_PATH" | grep -qE '__tests__/'; then
  GAME=$(echo "$FILE_PATH" | grep -oE 'packages/([a-z]+)-core/' | sed 's|packages/||;s|-core/||')

  if [ -n "$GAME" ]; then
    echo "🔨 [Hook] @${GAME}/core 소스가 수정되었습니다."
    echo "   서버/UI가 빌드된 core에 의존하므로 작업 완료 후 빌드하세요:"
    echo "   pnpm --filter @${GAME}/core build"
  fi
fi

exit 0
