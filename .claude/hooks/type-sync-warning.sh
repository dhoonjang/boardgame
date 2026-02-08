#!/bin/bash
# PostToolUse hook: types.ts 수정 후 동기화 경고
# stdin으로 JSON이 들어옴: { "tool_name": "Edit", "tool_input": { "file_path": "..." } }

INPUT=$(cat)
FILE_PATH=$(echo "$INPUT" | jq -r '.tool_input.file_path // empty')

if [ -z "$FILE_PATH" ]; then
  exit 0
fi

# <game>-core/src/types.ts 파일인지 확인
if echo "$FILE_PATH" | grep -qE 'packages/[a-z]+-core/src/types\.ts$'; then
  GAME=$(echo "$FILE_PATH" | grep -oE 'packages/([a-z]+)-core/' | sed 's|packages/||;s|-core/||')

  if [ -n "$GAME" ]; then
    echo "🔄 [Hook] @${GAME}/core의 types.ts가 수정되었습니다."
    echo "   다음 파일들의 동기화가 필요할 수 있습니다:"
    echo "   - packages/${GAME}-server/src/schemas/action.ts  (Zod 스키마)"
    echo "   - packages/${GAME}-server/src/api.ts              (API 핸들러)"
    echo "   - packages/${GAME}/src/store/                     (Zustand 스토어)"
    echo "   - packages/${GAME}/src/components/                (UI 컴포넌트)"
    echo "   /sync-types ${GAME} 스킬을 사용하면 전체 동기화를 도와드립니다."
  fi
fi

exit 0
