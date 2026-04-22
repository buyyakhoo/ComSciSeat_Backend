import { Hono } from 'hono'
import { authMiddleware } from '../shared/middleware/auth.js'
import {
  getBookingStatsAdmin,
  getAllBookings,
  getUserById,
  getExistingBookingByTable,
  getExistingBookingByUser,
  createAdminBooking,
  getAllLabs,
  getLabById,
  deleteLab,
  getLabByName,
  createLab,
  getAllTables,
  getTableById,
  deleteTable,
  getTableByLabAndCode,
  createTable,
  getAllClassSchedules,
  getClassScheduleById,
  deleteClassSchedule,
  getClassScheduleByLabAndTime,
  createClassSchedule,
  getAllUsers,
  updateUserType,
  deleteBooking,
  getBookingById
} from '../services/admin.service.js'

const app = new Hono()

app.get('/booking-stats-admin', authMiddleware, async (c) => {
  if (c.get('userType') !== 'admin') {
    return c.json({ success: false, error: 'Unauthorized' }, 403)
  }

  const nowBangkok = new Date(new Date().toLocaleString('en-US', { timeZone: 'Asia/Bangkok' }))

  const todayStr = nowBangkok.toISOString().split('T')[0]
  const yesterdayStr = new Date(nowBangkok.getTime() - 86400000)
    .toLocaleString('en-US', { timeZone: 'Asia/Bangkok' })
    .split(',')[0]
    .split('/')
    .map((v: string) => v.padStart(2, '0'))
    .join('-')

  const { bookingsToday, bookingsYesterday, allBookings, totalLabs, totalTables, totalUsers } =
    await getBookingStatsAdmin(todayStr, yesterdayStr)

  return c.json({
    success: true,
    data: {
      bookingsToday,
      bookingsYesterday,
      allBookings,
      totalLabs,
      totalTables,
      totalUsers
    }
  })
})

app.get('/bookings', authMiddleware, async (c) => {
  if (c.get('userType') !== 'admin') {
    return c.json({ success: false, error: 'Unauthorized' }, 403)
  }
  const bookings = await getAllBookings()
  return c.json({ success: true, data: bookings })
})

app.post('/bookings', authMiddleware, async (c) => {
  if (c.get('userType') !== 'admin') {
    return c.json({ success: false, error: 'Unauthorized' }, 403)
  }
  const body = await c.req.json()
  const { userId, tableId, booking_date, slot } = body

  const userExists = await getUserById(userId)
  if (!userExists) {
    return c.json({ success: false, error: 'ไม่พบรหัสนักศึกษานี้ในระบบ' }, 404)
  }

  const bookingDate = new Date(booking_date)
  const duplicateTable = await getExistingBookingByTable(Number(tableId), bookingDate, slot)
  if (duplicateTable) {
    return c.json({ success: false, error: 'โต๊ะนี้ถูกจองแล้วในช่วงเวลานี้' }, 409)
  }

  const duplicateUser = await getExistingBookingByUser(userId, bookingDate, slot)
  if (duplicateUser) {
    return c.json({ success: false, error: 'นักศึกษาคนนี้จองช่วงเวลานี้ไปแล้ว' }, 409)
  }

  const newBooking = await createAdminBooking(userId, Number(tableId), bookingDate, slot)
  return c.json({ success: true, data: newBooking })
})

app.delete('/bookings/:booking_id', authMiddleware, async (c) => {
  if (c.get('userType') !== 'admin') {
    return c.json({ success: false, error: 'Unauthorized' }, 403)
  }
  const bookingId = Number(c.req.param('booking_id'))
  const existing = await getBookingById(bookingId)
  if (!existing) {
    return c.json({ success: false, error: 'ไม่พบการจอง' }, 404)
  }
  await deleteBooking(bookingId)
  return c.json({ success: true, message: 'ยกเลิกการจองสำเร็จ' })
})

app.get('/labs', authMiddleware, async (c) => {
  if (c.get('userType') !== 'admin') {
    return c.json({ success: false, error: 'Unauthorized' }, 403)
  }
  const labs = await getAllLabs()
  return c.json({ success: true, data: labs })
})

app.delete('/labs/:lab_id', authMiddleware, async (c) => {
  if (c.get('userType') !== 'admin') {
    return c.json({ success: false, error: 'Unauthorized' }, 403)
  }
  const labId = Number(c.req.param('lab_id'))
  const existing = await getLabById(labId)

  if (!existing) {
    return c.json({ success: false, error: 'ไม่พบห้องปฏิบัติการ' }, 404)
  }

  await deleteLab(labId)

  return c.json({ success: true, message: 'ลบห้องปฏิบัติการสำเร็จ' })
})

app.post('/add_lab', authMiddleware, async (c) => {
  if (c.get('userType') !== 'admin') {
    return c.json({ success: false, error: 'Unauthorized' }, 403)
  }
  const body = await c.req.json()
  const { lab_name, lab_code } = body

  if (!lab_name || !lab_code) {
    return c.json({ success: false, error: 'ห้องปฏิบัติการและรหัสห้องจำเป็น' }, 400)
  }

  const existing = await getLabByName(lab_name)
  if (existing) {
    return c.json({ success: false, error: 'ห้องปฏิบัติการนี้มีอยู่แล้ว' }, 409)
  }
  const newLab = await createLab(lab_name, lab_code)
  return c.json({ success: true, data: newLab })
})

app.get('/tables', authMiddleware, async (c) => {
  if (c.get('userType') !== 'admin') {
    return c.json({ success: false, error: 'Unauthorized' }, 403)
  }
  const tables = await getAllTables()
  return c.json({ success: true, data: tables })
})

app.delete('/tables/:table_id', authMiddleware, async (c) => {
  if (c.get('userType') !== 'admin') {
    return c.json({ success: false, error: 'Unauthorized' }, 403)
  }
  const tableId = Number(c.req.param('table_id'))
  const existing = await getTableById(tableId)
  if (!existing) {
    return c.json({ success: false, error: 'ไม่พบโต๊ะ' }, 404)
  }
  await deleteTable(tableId)
  return c.json({ success: true, message: 'ลบโต๊ะสำเร็จ' })
})

app.post('/add_table', authMiddleware, async (c) => {
  if (c.get('userType') !== 'admin') {
    return c.json({ success: false, error: 'Unauthorized' }, 403)
  }
  const body = await c.req.json()
  const { labId, table_code } = body
  const existing = await getTableByLabAndCode(Number(labId), table_code)
  if (existing) {
    return c.json({ success: false, error: 'โต๊ะนี้มีอยู่แล้วในห้องปฏิบัติการนี้' }, 409)
  }
  const newTable = await createTable(Number(labId), table_code)
  return c.json({ success: true, data: newTable })
})

app.get('/class_schedule', authMiddleware, async (c) => {
  if (c.get('userType') !== 'admin') {
    return c.json({ success: false, error: 'Unauthorized' }, 403)
  }

  const schedules = await getAllClassSchedules()

  return c.json({ success: true, data: schedules })
})

app.delete('/class_schedule/:class_id', authMiddleware, async (c) => {
  if (c.get('userType') !== 'admin') {
    return c.json({ success: false, error: 'Unauthorized' }, 403)
  }

  const classId = Number(c.req.param('class_id'))

  const existing = await getClassScheduleById(classId)

  if (!existing) {
    return c.json({ success: false, error: 'ไม่พบตารางเรียน' }, 404)
  }

  await deleteClassSchedule(classId)

  return c.json({ success: true, message: 'ลบตารางเรียนสำเร็จ' })
})

app.post('/add_class_schedule', authMiddleware, async (c) => {
  if (c.get('userType') !== 'admin') {
    return c.json({ success: false, error: 'Unauthorized' }, 403)
  }

  const body = await c.req.json()
  const { labId, day_of_week, slot, subject } = body

  const existing = await getClassScheduleByLabAndTime(Number(labId), Number(day_of_week), slot)

  if (existing) {
    return c.json({ success: false, error: 'ตารางเรียนนี้มีอยู่แล้ว' }, 409)
  }

  const newSchedule = await createClassSchedule(Number(labId), Number(day_of_week), slot, subject)

  return c.json({ success: true, data: newSchedule })
})

app.get('/users', authMiddleware, async (c) => {
  if (c.get('userType') !== 'admin') {
    return c.json({ success: false, error: 'Unauthorized' }, 403)
  }

  const users = await getAllUsers()

  return c.json({ success: true, data: users })
})

app.patch('/users/:user_id', authMiddleware, async (c) => {
  if (c.get('userType') !== 'admin') {
    return c.json({ success: false, error: 'Unauthorized' }, 403)
  }
  const userId = c.req.param('user_id')
  const body = await c.req.json()
  const { userType } = body

  if (!['student', 'admin'].includes(userType)) {
    return c.json({ success: false, error: 'Invalid user type' }, 400)
  }

  const updatedUser = await updateUserType(userId, userType)

  return c.json({ success: true, data: updatedUser })
})

export { app as adminService }
