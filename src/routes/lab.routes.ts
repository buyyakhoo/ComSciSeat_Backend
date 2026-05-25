import { Hono } from 'hono'
import { zValidator } from '@hono/zod-validator'
import { validationError } from '../dtos/common.dto.js'
import {
  classScheduleParamSchema,
  createClassScheduleSchema,
  createLabSchema,
  labParamSchema
} from '../dtos/lab.dto.js'
import { authMiddleware } from '../shared/middleware/auth.js'
import {
  createClassSchedule,
  createLab,
  deleteClassSchedule,
  deleteLab,
  getAllClassSchedules,
  getAllLabs,
  getClassScheduleByLabId,
  getTablesByLabId
} from '../services/lab.service.js'

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
  const labs = await getAllLabs()
  return c.json({ success: true, data: labs })
})

app.post(
  '/',
  authMiddleware,
  adminMiddleware,
  zValidator('json', createLabSchema, validationError('Lab name and lab code are required')),
  async (c) => {
    const { lab_name, lab_code } = c.req.valid('json')

    const result = await createLab(lab_name, lab_code)
    if (!result.success) {
      return c.json({ success: false, error: result.error }, result.status as any)
    }

    return c.json({ success: true, data: result.data })
  }
)

app.delete(
  '/:lab_id',
  authMiddleware,
  adminMiddleware,
  zValidator('param', labParamSchema, validationError('Invalid lab id')),
  async (c) => {
    const { lab_id } = c.req.valid('param')
    const result = await deleteLab(lab_id)
    if (!result.success) {
      return c.json({ success: false, error: result.error }, result.status as any)
    }

    return c.json({ success: true, message: 'Lab deleted successfully' })
  }
)

app.get('/class-schedules', authMiddleware, adminMiddleware, async (c) => {
  const schedules = await getAllClassSchedules()
  return c.json({ success: true, data: schedules })
})

app.post(
  '/class-schedules',
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

app.delete(
  '/class-schedules/:class_id',
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

app.get('/:lab_id/tables', authMiddleware, zValidator('param', labParamSchema), async (c) => {
  const { lab_id } = c.req.valid('param')
  const tables = await getTablesByLabId(lab_id)
  return c.json({ success: true, data: tables })
})

app.get('/:lab_id/class_schedule', authMiddleware, zValidator('param', labParamSchema), async (c) => {
  const { lab_id } = c.req.valid('param')
  const classSchedule = await getClassScheduleByLabId(lab_id)
  return c.json({ success: true, data: classSchedule })
})

export { app as labService }
