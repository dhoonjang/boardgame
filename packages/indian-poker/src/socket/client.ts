import { io, type Socket } from 'socket.io-client'
import type { ClientEvents, ServerEvents } from '@indian-poker/server/game'

const SERVER_URL = import.meta.env.VITE_SERVER_URL || 'http://localhost:3002'

const socket: Socket<ServerEvents, ClientEvents> = io(SERVER_URL, {
  autoConnect: false,
})

export default socket
