import { Server } from '@modelcontextprotocol/sdk/server/index.js'
import { StdioServerTransport } from '@modelcontextprotocol/sdk/server/stdio.js'
import {
  CallToolRequestSchema,
  ListToolsRequestSchema,
} from '@modelcontextprotocol/sdk/types.js'
import {
  createGame,
  createGameSchema,
  listGames,
  deleteGame,
  deleteGameSchema,
  getGameState,
  getGameStateSchema,
  getGameRules,
  getValidActions,
  getValidActionsSchema,
  executeAction,
  executeActionSchema,
} from './tools/index.js'

// Tool 정의
const TOOLS = [
  {
    name: 'create_game',
    description: '새로운 Forgod 게임을 생성합니다. 2-4명의 플레이어가 필요합니다.',
    inputSchema: {
      type: 'object',
      properties: {
        players: {
          type: 'array',
          description: '게임에 참여할 플레이어 목록 (2-4명)',
          items: {
            type: 'object',
            properties: {
              id: { type: 'string', description: '플레이어 고유 ID' },
              name: { type: 'string', description: '플레이어 이름' },
              heroClass: {
                type: 'string',
                enum: ['warrior', 'rogue', 'mage'],
                description: '영웅 직업',
              },
            },
            required: ['id', 'name', 'heroClass'],
          },
          minItems: 2,
          maxItems: 4,
        },
      },
      required: ['players'],
    },
  },
  {
    name: 'list_games',
    description: '현재 진행 중인 모든 게임 목록을 조회합니다.',
    inputSchema: {
      type: 'object',
      properties: {},
    },
  },
  {
    name: 'delete_game',
    description: '게임을 삭제합니다.',
    inputSchema: {
      type: 'object',
      properties: {
        gameId: { type: 'string', description: '삭제할 게임의 ID' },
      },
      required: ['gameId'],
    },
  },
  {
    name: 'get_game_state',
    description: '특정 게임의 현재 상태를 조회합니다. 플레이어 정보, 몬스터, 보드 상태 등을 포함합니다.',
    inputSchema: {
      type: 'object',
      properties: {
        gameId: { type: 'string', description: '게임 ID' },
      },
      required: ['gameId'],
    },
  },
  {
    name: 'get_game_rules',
    description: 'Forgod 게임의 규칙을 조회합니다.',
    inputSchema: {
      type: 'object',
      properties: {},
    },
  },
  {
    name: 'get_valid_actions',
    description: '현재 턴에서 가능한 모든 액션 목록을 조회합니다.',
    inputSchema: {
      type: 'object',
      properties: {
        gameId: { type: 'string', description: '게임 ID' },
      },
      required: ['gameId'],
    },
  },
  {
    name: 'execute_action',
    description: '게임에서 액션을 실행합니다. 이동, 공격, 스킬 사용 등을 수행할 수 있습니다.',
    inputSchema: {
      type: 'object',
      properties: {
        gameId: { type: 'string', description: '게임 ID' },
        action: {
          type: 'object',
          description: '실행할 액션',
          oneOf: [
            {
              type: 'object',
              properties: { type: { const: 'ROLL_MOVE_DICE' } },
              required: ['type'],
            },
            {
              type: 'object',
              properties: {
                type: { const: 'MOVE' },
                position: {
                  type: 'object',
                  description: '6각형 좌표 (Axial coordinates)',
                  properties: {
                    q: { type: 'number', description: '열 좌표' },
                    r: { type: 'number', description: '행 좌표' },
                  },
                  required: ['q', 'r'],
                },
              },
              required: ['type', 'position'],
            },
            {
              type: 'object',
              properties: {
                type: { const: 'BASIC_ATTACK' },
                targetId: { type: 'string' },
              },
              required: ['type', 'targetId'],
            },
            {
              type: 'object',
              properties: {
                type: { const: 'USE_SKILL' },
                skillId: { type: 'string' },
                targetId: { type: 'string' },
                position: {
                  type: 'object',
                  description: '6각형 좌표',
                  properties: {
                    q: { type: 'number' },
                    r: { type: 'number' },
                  },
                },
              },
              required: ['type', 'skillId'],
            },
            {
              type: 'object',
              properties: {
                type: { const: 'ROLL_STAT_DICE' },
                stat: { type: 'string', enum: ['strength', 'dexterity', 'intelligence'] },
              },
              required: ['type', 'stat'],
            },
            {
              type: 'object',
              properties: { type: { const: 'END_TURN' } },
              required: ['type'],
            },
            {
              type: 'object',
              properties: {
                type: { const: 'COMPLETE_REVELATION' },
                revelationId: { type: 'string' },
              },
              required: ['type', 'revelationId'],
            },
          ],
        },
      },
      required: ['gameId', 'action'],
    },
  },
] as const

export async function createServer() {
  const server = new Server(
    {
      name: 'forgod-mcp-server',
      version: '0.1.0',
    },
    {
      capabilities: {
        tools: {},
      },
    }
  )

  // Tool 목록 핸들러
  server.setRequestHandler(ListToolsRequestSchema, async () => {
    return {
      tools: TOOLS.map(tool => ({
        name: tool.name,
        description: tool.description,
        inputSchema: tool.inputSchema,
      })),
    }
  })

  // Tool 실행 핸들러
  server.setRequestHandler(CallToolRequestSchema, async (request) => {
    const { name, arguments: args } = request.params

    try {
      let result: unknown

      switch (name) {
        case 'create_game':
          result = await createGame(createGameSchema.parse(args))
          break
        case 'list_games':
          result = await listGames()
          break
        case 'delete_game':
          result = await deleteGame(deleteGameSchema.parse(args))
          break
        case 'get_game_state':
          result = await getGameState(getGameStateSchema.parse(args))
          break
        case 'get_game_rules':
          result = getGameRules()
          break
        case 'get_valid_actions':
          result = await getValidActions(getValidActionsSchema.parse(args))
          break
        case 'execute_action':
          result = await executeAction(executeActionSchema.parse(args))
          break
        default:
          return {
            content: [
              {
                type: 'text',
                text: JSON.stringify({ error: `Unknown tool: ${name}` }),
              },
            ],
          }
      }

      return {
        content: [
          {
            type: 'text',
            text: JSON.stringify(result, null, 2),
          },
        ],
      }
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : String(error)
      return {
        content: [
          {
            type: 'text',
            text: JSON.stringify({ error: errorMessage }),
          },
        ],
        isError: true,
      }
    }
  })

  return server
}

export async function runServer() {
  const server = await createServer()
  const transport = new StdioServerTransport()
  await server.connect(transport)
  console.error('Forgod MCP Server running on stdio')
}
