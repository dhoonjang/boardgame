import { describe, it, expect, afterEach } from 'vitest'
import { createServer, type Server as HttpServer } from 'http'
import { Server } from 'socket.io'
import { io as ioc, type Socket as ClientSocket } from 'socket.io-client'
import { SessionManager } from '../session'
import { registerSocketHandlers } from '../socket-handlers'
import type { PlayerView } from '../game'

let portCounter = 3100

function waitForEvent<T>(socket: ClientSocket, event: string, timeout = 3000): Promise<T> {
  return new Promise((resolve, reject) => {
    const timer = setTimeout(() => reject(new Error(`Timeout waiting for ${event}`)), timeout)
    socket.once(event, (data: T) => {
      clearTimeout(timer)
      resolve(data)
    })
  })
}

/**
 * 테스트별로 독립된 서버 인스턴스를 생성하여 상태 격리
 */
function createTestServer(): Promise<{
  io: Server
  httpServer: HttpServer
  sessionManager: SessionManager
  port: number
}> {
  return new Promise((resolve) => {
    const port = portCounter++
    const sessionManager = new SessionManager()
    const httpServer = createServer()
    const io = new Server(httpServer)
    registerSocketHandlers(io, sessionManager)
    httpServer.listen(port, () => resolve({ io, httpServer, sessionManager, port }))
  })
}

function connectTo(port: number): ClientSocket {
  return ioc(`http://localhost:${port}`, {
    forceNew: true,
    transports: ['websocket'],
  })
}

describe('Socket Handlers', () => {
  let server: Awaited<ReturnType<typeof createTestServer>>
  const clients: ClientSocket[] = []

  afterEach(async () => {
    for (const c of clients) c.disconnect()
    clients.length = 0

    if (server) {
      server.io.close()
      await new Promise<void>((resolve) => server.httpServer.close(() => resolve()))
    }
  })

  it('게임 생성 → game-created 이벤트', async () => {
    server = await createTestServer()
    const client = connectTo(server.port)
    clients.push(client)

    await waitForEvent(client, 'connect')
    client.emit('create-game', { player: { id: 'p1', name: 'Alice' } })

    const data = await waitForEvent<{ gameId: string }>(client, 'game-created')
    expect(data.gameId).toBeTruthy()
    expect(data.gameId.length).toBe(4)
  })

  it('게임 생성 후 game-state 수신', async () => {
    server = await createTestServer()
    const client = connectTo(server.port)
    clients.push(client)

    await waitForEvent(client, 'connect')
    client.emit('create-game', { player: { id: 'p1', name: 'Alice' } })

    const state = await waitForEvent<{ playerView: PlayerView }>(client, 'game-state')
    expect(state.playerView.phase).toBe('waiting')
    expect(state.playerView.me.name).toBe('Alice')
  })

  it('상대 참가 → opponent-joined 이벤트', async () => {
    server = await createTestServer()

    const client1 = connectTo(server.port)
    clients.push(client1)
    await waitForEvent(client1, 'connect')

    client1.emit('create-game', { player: { id: 'p1', name: 'Alice' } })
    const { gameId } = await waitForEvent<{ gameId: string }>(client1, 'game-created')

    // 참가 알림 리스너를 미리 등록
    const joinPromise = waitForEvent<{ opponentName: string }>(client1, 'opponent-joined')

    const client2 = connectTo(server.port)
    clients.push(client2)
    await waitForEvent(client2, 'connect')

    client2.emit('join-game', { gameId, player: { id: 'p2', name: 'Bob' } })

    const joinData = await joinPromise
    expect(joinData.opponentName).toBe('Bob')
  })

  it('게임 액션 실행 → 양쪽에 game-state 전송', async () => {
    server = await createTestServer()

    // client1 생성 & 게임 생성
    const client1 = connectTo(server.port)
    clients.push(client1)
    await waitForEvent(client1, 'connect')

    client1.emit('create-game', { player: { id: 'p1', name: 'Alice' } })
    const { gameId } = await waitForEvent<{ gameId: string }>(client1, 'game-created')

    // client2 참가
    const client2 = connectTo(server.port)
    clients.push(client2)
    await waitForEvent(client2, 'connect')

    // join 후 양쪽에 game-state가 올 것이므로 미리 리스너 등록
    const joinState1 = waitForEvent<{ playerView: PlayerView }>(client1, 'game-state')
    const joinState2 = waitForEvent<{ playerView: PlayerView }>(client2, 'game-state')

    client2.emit('join-game', { gameId, player: { id: 'p2', name: 'Bob' } })

    // join 시 발생하는 game-state 소비
    await Promise.all([joinState1, joinState2])

    // START_ROUND 액션 전 리스너 등록
    const actionState1 = waitForEvent<{ playerView: PlayerView }>(client1, 'game-state')
    const actionState2 = waitForEvent<{ playerView: PlayerView }>(client2, 'game-state')

    client1.emit('game-action', { action: { type: 'START_ROUND' } })

    const [state1, state2] = await Promise.all([actionState1, actionState2])

    expect(state1.playerView.phase).toBe('ability')
    expect(state2.playerView.phase).toBe('ability')

    // 핵심: 상대 카드는 보임 (인디언 포커)
    expect(state1.playerView.opponentCard).not.toBeNull()
    expect(state2.playerView.opponentCard).not.toBeNull()
  })
})
