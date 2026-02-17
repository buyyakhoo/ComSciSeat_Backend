import { Hono } from 'hono'
import { prisma } from '../shared/database/prisma.js'

const app = new Hono()

// ดึงรายชื่อ Lab ทั้งหมด
app.get('/', async (c) => {
    const labs = await prisma.labs.findMany({
        orderBy: { lab_id: 'asc' }
    })
    return c.json({ success: true, data: labs })
})

// ดึงโต๊ะทั้งหมดใน Lab (เอาไว้ render ผัง)
app.get('/:lab_id/tables', async (c) => {
    const labId = Number.parseInt(c.req.param('lab_id'))
    
    const tables = await prisma.tables.findMany({
        select: { table_id: true, table_code: true },
        where: { lab_id: labId },
        orderBy: { table_id: 'asc' }
    })

    return c.json({ success: true, data: tables })
})

export { app as labService }