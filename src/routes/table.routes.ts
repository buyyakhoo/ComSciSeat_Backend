import { Hono } from 'hono'
import { authMiddleware } from '../shared/middleware/auth.js'
import { getAllTables, getTableById } from '../services/table.service.js'

const app = new Hono()

app.get('/', authMiddleware, async (c) => {
  const tables = await getAllTables()
  return c.json({ success: true, data: tables })
})

app.get('/:table_id', authMiddleware, async (c) => {
  const tableId = Number.parseInt(c.req.param('table_id'))
  const table = await getTableById(tableId)
  return c.json({ success: true, data: table })
})

export { app as tableService }
