import { serve } from '@hono/node-server'
import { app } from './api'

const PORT = process.env.PORT ? parseInt(process.env.PORT, 10) : 3001

console.log(`Starting For God API Server on port ${PORT}...`)

serve({
  fetch: app.fetch,
  port: PORT,
})

console.log(`Server is running at http://localhost:${PORT}`)
