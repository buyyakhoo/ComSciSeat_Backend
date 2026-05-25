import { Hono } from 'hono'
import { zValidator } from '@hono/zod-validator'
import { validationError } from '../dtos/common.dto.js'
import { createTableSchema, tableParamSchema } from '../dtos/table.dto.js'
import { authMiddleware } from '../shared/middleware/auth.js'
import {
  createTable,
  deleteTable,
  getAllTables,
  getTableById
} from '../services/table.service.js'

const app = new Hono()

function isAdmin(c: any) {
  return c.get('userType') === 'admin'
}

async function adminMiddleware(c: any, next: any) {
  if (!isAdmin(c)) {
    return c.json({ success: false, error: 'Unauthorized' }, 403)
  }

  await next()
}

app.get('/', authMiddleware, async (c) => {
  const tables = await getAllTables()
  return c.json({ success: true, data: tables })
})

app.post(
  '/',
  authMiddleware,
  adminMiddleware,
  zValidator('json', createTableSchema, validationError('Lab and table code are required')),
  async (c) => {
    const { labId, table_code } = c.req.valid('json')
    const result = await createTable(labId, table_code)
    if (!result.success) {
      return c.json({ success: false, error: result.error }, result.status as any)
    }

    return c.json({ success: true, data: result.data })
  }
)

app.delete(
  '/:table_id',
  authMiddleware,
  adminMiddleware,
  zValidator('param', tableParamSchema, validationError('Invalid table id')),
  async (c) => {
    const { table_id } = c.req.valid('param')
    const result = await deleteTable(table_id)
    if (!result.success) {
      return c.json({ success: false, error: result.error }, result.status as any)
    }

    return c.json({ success: true, message: 'Table deleted successfully' })
  }
)

app.get('/:table_id', authMiddleware, zValidator('param', tableParamSchema), async (c) => {
  const { table_id } = c.req.valid('param')
  const table = await getTableById(table_id)
  return c.json({ success: true, data: table })
})

export { app as tableService }
