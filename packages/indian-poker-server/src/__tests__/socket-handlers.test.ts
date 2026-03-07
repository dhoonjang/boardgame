import { describe, it, expect, beforeEach } from 'vitest'
import type { Server, Socket } from 'socket.io'
import { SessionManager } from '../session'
import { registerSocketHandlers } from '../socket-handlers'
import type { PlayerView } from '../game'

type EventHandler = (data?: any) => void

class FakeSocket {
  readonly received = new Map<string, unknown[]>()
  readonly joinedRooms = new Set<string>()
  private handlers = new Map<string, EventHandler>()

  constructor(public readonly id: string) {}

  on(event: string, handler: EventHandler): this {
    this.handlers.set(event, handler)
    return this
  }

  emit(event: string, data?: unknown): boolean {
    const list = this.received.get(event) ?? []
    list.push(data)
    this.received.set(event, list)
    return true
  }

  join(room: string): void {
    this.joinedRooms.add(room)
  }

  leave(room: string): void {
    this.joinedRooms.delete(room)
  }

  clientEmit(event: string, data?: unknown): void {
    const handler = this.handlers.get(event)
    if (!handler) {
      throw new Error(`No server handler registered for event: ${event}`)
    }
    handler(data)
  }

  lastEvent<T>(event: string): T {
    const list = this.received.get(event) ?? []
    if (list.length === 0) {
      throw new Error(`No emitted event found: ${event}`)
    }
    return list[list.length - 1] as T
  }
}

class FakeIo {
  private sockets = new Map<string, FakeSocket>()
  private connectionHandler: ((socket: Socket) => void) | null = null

  on(event: string, handler: (socket: Socket) => void): this {
    if (event === 'connection') {
      this.connectionHandler = handler
    }
    return this
  }

  to(socketId: string): { emit: (event: string, data?: unknown) => void } {
    return {
      emit: (event: string, data?: unknown) => {
        this.sockets.get(socketId)?.emit(event, data)
      },
    }
  }

  connect(socket: FakeSocket): FakeSocket {
    this.sockets.set(socket.id, socket)
    if (!this.connectionHandler) {
      throw new Error('Connection handler is not registered')
    }
    this.connectionHandler(socket as unknown as Socket)
    return socket
  }
}

describe('Socket Handlers', () => {
  let io: FakeIo
  let sessionManager: SessionManager

  beforeEach(() => {
    io = new FakeIo()
    sessionManager = new SessionManager()
    registerSocketHandlers(io as unknown as Server, sessionManager)
  })

  it('게임 생성 → game-created/game-state/valid-actions 전송', () => {
    const client = io.connect(new FakeSocket('socket-1'))

    client.clientEmit('create-game', { player: { id: 'p1', name: 'Alice' } })

    const created = client.lastEvent<{ gameId: string }>('game-created')
    const gameState = client.lastEvent<{ playerView: PlayerView }>('game-state')
    const validActions = client.lastEvent<{ actions: Array<{ type: string }> }>('valid-actions')

    expect(created.gameId).toHaveLength(4)
    expect(client.joinedRooms.has(created.gameId)).toBe(true)
    expect(gameState.playerView.phase).toBe('waiting')
    expect(gameState.playerView.me.name).toBe('Alice')
    expect(validActions.actions).toEqual([])
  })

  it('상대 참가 시 양쪽에 game-state/opponent-joined 전송', () => {
    const host = io.connect(new FakeSocket('socket-1'))
    host.clientEmit('create-game', { player: { id: 'p1', name: 'Alice' } })
    const { gameId } = host.lastEvent<{ gameId: string }>('game-created')

    const guest = io.connect(new FakeSocket('socket-2'))
    guest.clientEmit('join-game', { gameId, player: { id: 'p2', name: 'Bob' } })

    const hostJoin = host.lastEvent<{ opponentName: string }>('opponent-joined')
    const guestJoin = guest.lastEvent<{ opponentName: string }>('opponent-joined')
    const hostState = host.lastEvent<{ playerView: PlayerView }>('game-state')
    const guestState = guest.lastEvent<{ playerView: PlayerView }>('game-state')

    expect(hostJoin.opponentName).toBe('Bob')
    expect(guestJoin.opponentName).toBe('Alice')
    expect(hostState.playerView.phase).toBe('waiting')
    expect(guestState.playerView.phase).toBe('waiting')
    expect(guest.joinedRooms.has(gameId)).toBe(true)
  })

  it('START_ROUND 액션 성공 시 양쪽에 betting 상태 브로드캐스트', () => {
    const host = io.connect(new FakeSocket('socket-1'))
    host.clientEmit('create-game', { player: { id: 'p1', name: 'Alice' } })
    const { gameId } = host.lastEvent<{ gameId: string }>('game-created')

    const guest = io.connect(new FakeSocket('socket-2'))
    guest.clientEmit('join-game', { gameId, player: { id: 'p2', name: 'Bob' } })

    host.clientEmit('game-action', { action: { type: 'START_ROUND' } })

    const hostAction = host.lastEvent<{ success: boolean }>('action-result')
    const hostState = host.lastEvent<{ playerView: PlayerView }>('game-state')
    const guestState = guest.lastEvent<{ playerView: PlayerView }>('game-state')

    expect(hostAction.success).toBe(true)
    expect(hostState.playerView.phase).toBe('betting')
    expect(guestState.playerView.phase).toBe('betting')
    expect(hostState.playerView.opponentCard).not.toBeNull()
    expect(guestState.playerView.opponentCard).not.toBeNull()
  })

  it('체크 불가 상황에서 CALL 액션 거부', () => {
    const host = io.connect(new FakeSocket('socket-1'))
    host.clientEmit('create-game', { player: { id: 'p1', name: 'Alice' } })
    const { gameId } = host.lastEvent<{ gameId: string }>('game-created')

    const guest = io.connect(new FakeSocket('socket-2'))
    guest.clientEmit('join-game', { gameId, player: { id: 'p2', name: 'Bob' } })

    host.clientEmit('game-action', { action: { type: 'START_ROUND' } })
    const beforePhase = host.lastEvent<{ playerView: PlayerView }>('game-state').playerView.phase

    host.clientEmit('game-action', { action: { type: 'CALL' } })

    const action = host.lastEvent<{ success: boolean; message: string }>('action-result')
    const afterPhase = host.lastEvent<{ playerView: PlayerView }>('game-state').playerView.phase

    expect(beforePhase).toBe('betting')
    expect(action.success).toBe(false)
    expect(action.message).toContain('콜')
    expect(afterPhase).toBe('betting')
  })
})
