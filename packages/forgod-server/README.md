# @forgod/mcp-server

Forgod 게임용 MCP 서버. AI 에이전트가 게임을 플레이할 수 있게 합니다.

## Supabase 설정

### 1. Supabase 프로젝트 생성

1. [Supabase](https://supabase.com)에서 무료 계정 생성
2. 새 프로젝트 생성
3. Project Settings > API에서 URL과 anon key 복사

### 2. 데이터베이스 스키마 설정

Supabase Dashboard의 SQL Editor에서 `supabase/schema.sql` 실행:

```sql
-- Games table: stores all game sessions
CREATE TABLE IF NOT EXISTS games (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  state JSONB NOT NULL,
  status TEXT NOT NULL DEFAULT 'active' CHECK (status IN ('active', 'completed', 'abandoned')),
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Index for listing active games
CREATE INDEX IF NOT EXISTS idx_games_status ON games(status);
CREATE INDEX IF NOT EXISTS idx_games_updated_at ON games(updated_at DESC);

-- Enable Row Level Security
ALTER TABLE games ENABLE ROW LEVEL SECURITY;

-- Policy: Allow all operations
CREATE POLICY "Allow all operations" ON games
  FOR ALL
  USING (true)
  WITH CHECK (true);
```

### 3. 환경 변수 설정

```bash
export SUPABASE_URL=https://your-project-id.supabase.co
export SUPABASE_ANON_KEY=your-anon-key-here
```

## 사용법

### 빌드

```bash
pnpm --filter @forgod/mcp-server build
```

### 실행

```bash
# 환경 변수 설정 후
pnpm --filter @forgod/mcp-server start
```

### MCP Inspector로 테스트

```bash
SUPABASE_URL=... SUPABASE_ANON_KEY=... npx @modelcontextprotocol/inspector node packages/forgod-mcp-server/dist/index.js
```

### Claude Desktop 연결

`claude_desktop_config.json`에 추가:

```json
{
  "mcpServers": {
    "forgod": {
      "command": "node",
      "args": ["/path/to/packages/forgod-mcp-server/dist/index.js"],
      "env": {
        "SUPABASE_URL": "https://your-project-id.supabase.co",
        "SUPABASE_ANON_KEY": "your-anon-key"
      }
    }
  }
}
```

## MCP Tools

| Tool | 설명 |
|------|------|
| `create_game` | 새 게임 생성 (2-4명 플레이어) |
| `list_games` | 활성 게임 목록 조회 |
| `delete_game` | 게임 삭제 |
| `get_game_state` | 게임 상태 조회 |
| `get_game_rules` | 게임 규칙 조회 |
| `get_valid_actions` | 가능한 액션 목록 조회 |
| `execute_action` | 게임 액션 실행 |
