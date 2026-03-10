import { Hono } from 'hono'
import { prisma } from '../shared/database/prisma.js'
import { authMiddleware } from '../shared/middleware/auth.js'

const app = new Hono()

app.get('/', authMiddleware, async (c) => {
    const labs = await prisma.labs.findMany({
        orderBy: { lab_id: 'asc' }
    })
    return c.json({ success: true, data: labs })
})

app.get('/:lab_id/tables', async (c) => {
    const labId = Number.parseInt(c.req.param('lab_id'))
    
    const tables = await prisma.tables.findMany({
        select: { table_id: true, table_code: true },
        where: { lab_id: labId },
        orderBy: { table_id: 'asc' }
    })

    return c.json({ success: true, data: tables })
})

app.get('/:lab_id/class_schedule', authMiddleware, async (c) => {
    const labId = Number.parseInt(c.req.param('lab_id'))
    const classSchedule = await prisma.class_schedule.findMany({
        where: { lab_id: labId },
        select: {
            class_id: true,
            day_of_week: true,
            slot: true,
            subject: true
        },
        orderBy: [
            { day_of_week: 'asc' },
        ]
    })
    return c.json({ success: true, data: classSchedule })
})

export { app as labService }