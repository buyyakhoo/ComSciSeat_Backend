import { Hono } from 'hono'
import { zValidator } from '@hono/zod-validator'
import {
  bookingParamSchema,
  createAdminBookingSchema,
  createUserBookingSchema,
  tableAvailabilityQuerySchema,
  validationError
} from '../dtos/booking.dto.js'
import { isPastDate } from '../lib/shared/utils/time.js'
import { authMiddleware } from '../shared/middleware/auth.js'
import {
  cancelUserBooking,
  createAdminBooking,
  createUserBooking,
  deleteAdminBooking,
  getAllBookings,
  getBookingStats,
  getBookingStatsAdmin,
  getTableAvailability,
  getUserBookings
} from '../services/booking.service.js'

const app = new Hono()
const BANGKOK_TIME_ZONE = 'Asia/Bangkok'
const ONE_DAY_MS = 24 * 60 * 60 * 1000
const bangkokDateFormatter = new Intl.DateTimeFormat('en-CA', {
  timeZone: BANGKOK_TIME_ZONE,
  year: 'numeric',
  month: '2-digit',
  day: '2-digit'
})

function formatBangkokDate(date: Date) {
  return bangkokDateFormatter.format(date)
}

function subtractDays(date: Date, days: number) {
  return new Date(date.getTime() - days * ONE_DAY_MS)
}

function isAdmin(c: any) {
  return c.get('userType') === 'admin'
}

async function adminMiddleware(c: any, next: any) {
  if (!isAdmin(c)) {
    return c.json({ success: false, error: 'Unauthorized' }, 403)
  }

  await next()
}

app.get(
  '/check-table-availability',
  authMiddleware,
  zValidator('query', tableAvailabilityQuerySchema, validationError('Missing parameters')),
  async (c) => {
    const { lab_id, date, slot } = c.req.valid('query')

    const availability = await getTableAvailability(lab_id, new Date(date), slot, c.get('userId'))
    return c.json(availability)
  }
)

app.get('/booking-stats', authMiddleware, async (c) => {
  const today = new Date()
  today.setHours(0, 0, 0, 0)

  const { userUpcoming, userTotal, allTotal } = await getBookingStats(c.get('userId'), today)
  const percentage = allTotal > 0 ? (userTotal / allTotal) * 100 : 0

  return c.json({
    success: true,
    data: { userUpcoming, userTotal, allTotal, percentage }
  })
})

app.get('/stats', authMiddleware, adminMiddleware, async (c) => {
  const nowBangkok = new Date()
  const todayStr = formatBangkokDate(nowBangkok)
  const yesterdayStr = formatBangkokDate(subtractDays(nowBangkok, 1))

  const stats = await getBookingStatsAdmin(todayStr, yesterdayStr)
  return c.json({ success: true, data: stats })
})

app.get('/', authMiddleware, adminMiddleware, async (c) => {
  const bookings = await getAllBookings()
  return c.json({ success: true, data: bookings })
})

app.post(
  '/',
  authMiddleware,
  adminMiddleware,
  zValidator('json', createAdminBookingSchema, validationError('Missing booking fields')),
  async (c) => {
    const { userId, tableId, booking_date, slot } = c.req.valid('json')

    const result = await createAdminBooking(userId, tableId, new Date(booking_date), slot)
    if (!result.success) {
      return c.json({ success: false, error: result.error }, result.status as any)
    }

    return c.json({ success: true, data: result.data })
  }
)

app.post(
  '/book',
  authMiddleware,
  zValidator('json', createUserBookingSchema, validationError('Missing booking fields')),
  async (c) => {
    const { table_id, table_code, date, slot, lab_id } = c.req.valid('json')

    if (isPastDate(date)) {
      return c.json({ success: false, error: 'Cannot book a date in the past' }, 400)
    }

    try {
      const result = await createUserBooking(
        c.get('userId'),
        table_id,
        table_code,
        new Date(date),
        slot,
        lab_id
      )

      if (!result.success) {
        return c.json({ success: false, error: result.error }, result.status as any)
      }

      return c.json({ success: true, data: result.data.booking })
    } catch (error) {
      console.error(error)
      return c.json({ success: false, error: 'Booking failed' }, 500)
    }
  }
)

app.get('/my-bookings', authMiddleware, async (c) => {
  const myBookings = await getUserBookings(c.get('userId'))
  return c.json({ success: true, data: myBookings })
})

app.delete(
  '/cancel/:booking_id',
  authMiddleware,
  zValidator('param', bookingParamSchema, validationError('Invalid booking id')),
  async (c) => {
    const { booking_id } = c.req.valid('param')
    const result = await cancelUserBooking(c.get('userId'), booking_id, isPastDate)

    if (!result.success) {
      return c.json({ success: false, error: result.error }, result.status as any)
    }

    return c.json({ success: true, message: 'Booking cancelled' })
  }
)

app.delete(
  '/:booking_id',
  authMiddleware,
  adminMiddleware,
  zValidator('param', bookingParamSchema, validationError('Invalid booking id')),
  async (c) => {
    const { booking_id } = c.req.valid('param')
    const result = await deleteAdminBooking(booking_id)
    if (!result.success) {
      return c.json({ success: false, error: result.error }, result.status as any)
    }

    return c.json({ success: true, message: 'Booking deleted successfully' })
  }
)

export { app as bookingService }
