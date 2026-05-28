import { Hono } from 'hono'
import { zValidator } from '@hono/zod-validator'
import {
  classScheduleLabParamSchema,
  classScheduleParamSchema,
  createClassScheduleSchema
} from '../dtos/class_schedule.dto.js'
import { validationError } from '../dtos/common.dto.js'
import { authMiddleware } from '../shared/middleware/auth.js'
import {
  createClassSchedule,
  deleteClassSchedule,
  getAllClassSchedules,
  getClassScheduleByLabId
} from '../services/class_schedule.service.js'

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

app.get('/', authMiddleware, adminMiddleware, async (c) => {
  const schedules = await getAllClassSchedules()
  return c.json({ success: true, data: schedules })
})

app.post(
  '/',
  authMiddleware,
  adminMiddleware,
  zValidator('json', createClassScheduleSchema, validationError('Missing class schedule fields')),
  async (c) => {
    const { labId, day_of_week, slot, subject } = c.req.valid('json')

    const result = await createClassSchedule(labId, day_of_week, slot, subject)
    if (!result.success) {
      return c.json({ success: false, error: result.error }, result.status as any)
    }

    return c.json({ success: true, data: result.data })
  }
)

app.get(
  '/lab/:lab_id',
  authMiddleware,
  zValidator('param', classScheduleLabParamSchema, validationError('Invalid lab id')),
  async (c) => {
    const { lab_id } = c.req.valid('param')
    const classSchedule = await getClassScheduleByLabId(lab_id)
    return c.json({ success: true, data: classSchedule })
  }
)

app.delete(
  '/:class_id',
  authMiddleware,
  adminMiddleware,
  zValidator('param', classScheduleParamSchema, validationError('Invalid class schedule id')),
  async (c) => {
    const { class_id } = c.req.valid('param')
    const result = await deleteClassSchedule(class_id)
    if (!result.success) {
      return c.json({ success: false, error: result.error }, result.status as any)
    }

    return c.json({ success: true, message: 'Class schedule deleted successfully' })
  }
)

export { app as classScheduleService }
