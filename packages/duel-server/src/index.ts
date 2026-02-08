import 'dotenv/config'
import { createServer } from 'http'
import { Server } from 'socket.io'
import { SessionManager } from './session'
import { createApi } from './api'
import { registerSocketHandlers } from './socket-handlers'

const PORT = process.env.PORT ? parseInt(process.env.PORT, 10) : 3002

const sessionManager = new SessionManager()
const app = createApi(sessionManager)

// HTTP 서버 생성 (Hono + Socket.IO 공유)
const httpServer = createServer((req, res) => {
  // Socket.IO 경로가 아닌 요청은 Hono로 처리
  if (!req.url?.startsWith('/socket.io')) {
    const fetchResult = app.fetch(
      new Request(`http://localhost:${PORT}${req.url}`, {
        method: req.method,
        headers: Object.fromEntries(
          Object.entries(req.headers).filter(([, v]) => v !== undefined) as [string, string][]
        ),
      })
    )
    Promise.resolve(fetchResult).then(async (response: Response) => {
      res.writeHead(response.status, Object.fromEntries(response.headers.entries()))
      const body = await response.text()
      res.end(body)
    }).catch(() => {
      res.writeHead(500)
      res.end('Internal Server Error')
    })
  }
})

// Socket.IO 서버
const io = new Server(httpServer, {
  cors: { origin: '*' },
})

// 소켓 핸들러 등록
registerSocketHandlers(io, sessionManager)

httpServer.listen(PORT, () => {
  console.log(`Bluff Duel Server running at http://localhost:${PORT}`)
  console.log(`Socket.IO listening on port ${PORT}`)
})
