import { serve } from '@hono/node-server'
import { Hono } from 'hono'
import { cors } from 'hono/cors'

import { userService } from './services/user_service.js'
import { labService } from './services/lab_service.js' 
import { tableService } from './services/table_service.js'
import { reservationService } from './services/reservation_service.js' 

const app = new Hono()

// Enable CORS for all routes
app.use('/*', cors({
  origin: '*',
  credentials: true,
}))


app.get('/', (c) => {
  return c.text('Hello Hono!')
})

app.route('/api/user', userService)
app.route('/api/labs', labService)
app.route('/api/tables', tableService)
app.route('/api/reservations', reservationService)

serve({
  fetch: app.fetch,
  port: 3000
}, (info) => {
  console.log(`Server is running on http://localhost:${info.port}`)
})
