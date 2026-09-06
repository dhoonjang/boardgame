#!/bin/bash
# SessionStart hook: 세션 시작 시 프로젝트 목록과 status 를 컨텍스트에 넣는다.
ROOT="${CLAUDE_PROJECT_DIR:-$(cd "$(dirname "$0")/../.." && pwd)}"
bash "$ROOT/scripts/build-index.sh" --print
exit 0
