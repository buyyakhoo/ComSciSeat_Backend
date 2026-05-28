import { serve } from '@hono/node-server'
import { Hono } from 'hono'
import { cors } from 'hono/cors'

import { authService } from './routes/auth.routes.js'
import { userService } from './routes/user.routes.js'
import { labService } from './routes/lab.routes.js'
import { tableService } from './routes/table.routes.js'
import { bookingService } from './routes/booking.routes.js'
import { classScheduleService } from './routes/class_schedule.routes.js'

const app = new Hono()

app.use('/*', cors({
  origin: '*',
  credentials: true,
}))


app.get('/', (c) => {
  return c.text('Hello Hono!')
})

app.route('/api/auth', authService)
app.route('/api/user', userService)
app.route('/api/labs', labService)
app.route('/api/tables', tableService)
app.route('/api/bookings', bookingService)
app.route('/api/class_schedule', classScheduleService)

serve({
  fetch: app.fetch,
  port: 3000
}, (info) => {
  console.log(`Server is running on http://localhost:${info.port}`)
})
