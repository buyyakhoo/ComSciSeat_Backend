import { Hono } from 'hono'
import { prisma } from '../shared/database/prisma.js'
import { authMiddleware } from '../shared/middleware/auth.js'

const app = new Hono()

app.get('/', authMiddleware, async (c) => {
    const labs = await prisma.tables.findMany({
        orderBy: { lab_id: 'asc' }
    })
    return c.json({ success: true, data: labs })
})

app.get('/:table_id', authMiddleware, async (c) => {
    const tableId = Number.parseInt(c.req.param('table_id'))

    const table = await prisma.tables.findUnique({
        where: { table_id: tableId }
    })

    return c.json({ success: true, data: table })
})

export { app as tableService }