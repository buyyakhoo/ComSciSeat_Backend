import { Hono } from 'hono'
import { authMiddleware } from '../shared/middleware/auth.js'
import { getAllLabs, getTablesByLabId, getClassScheduleByLabId } from '../services/lab.service.js'

const app = new Hono()

app.get('/', authMiddleware, async (c) => {
  const labs = await getAllLabs()
  return c.json({ success: true, data: labs })
})

app.get('/:lab_id/tables', authMiddleware, async (c) => {
  const labId = Number.parseInt(c.req.param('lab_id'))
  const tables = await getTablesByLabId(labId)
  return c.json({ success: true, data: tables })
})

app.get('/:lab_id/class_schedule', authMiddleware, async (c) => {
  const labId = Number.parseInt(c.req.param('lab_id'))
  const classSchedule = await getClassScheduleByLabId(labId)
  return c.json({ success: true, data: classSchedule })
})

export { app as labService }
