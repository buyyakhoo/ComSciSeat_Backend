import { Hono } from 'hono'
import { authMiddleware } from '../shared/middleware/auth.js'
import { cancelationTemplate, reservationTemplate } from '../lib/shared/utils/mail.js'
import { isPastDate } from '../lib/shared/utils/time.js'
import { Resend } from 'resend'
import {
  getClassScheduleByLabAndTime,
  getTablesByLabWithBookings,
  getUserExistingBooking,
  getBookingStats,
  getExistingBooking,
  createBooking,
  getUserInfo,
  getLabInfo,
  getUserBookings,
  getBookingById,
  deleteBooking
} from '../services/reservation.service.js'

const app = new Hono()
const resend = new Resend(process.env.RESEND_API_KEY)

app.get('/check-table-availability', authMiddleware, async (c) => {
  const labId = Number.parseInt(c.req.query('lab_id') || '0')
  const dateStr = c.req.query('date')
  const slot = c.req.query('slot') as 'Morning' | 'Afternoon' | 'Lunch'

  if (!labId || !dateStr || !slot) {
    return c.json({ error: 'Missing parameters' }, 400)
  }

  const requestDate = new Date(dateStr)
  const dayOfWeek = requestDate.getDay()

  const isSunday = new Date(dateStr).getDay() === 0
  if (isSunday) {
    return c.json({
      success: true,
      status: 'CLOSED',
      message: 'ห้องแลปได้ปิดทำการในวันอาทิตย์',
      data: []
    })
  }

  const hasClass = await getClassScheduleByLabAndTime(labId, dayOfWeek, slot)

  if (hasClass) {
    return c.json({
      success: true,
      status: 'CLOSED',
      message: `ห้องแลปนี้ได้ทำการเรียนการสอนในเวลานี้ รายวิชา ${hasClass.subject}`,
      class: hasClass,
      data: []
    })
  }

  const tables = await getTablesByLabWithBookings(labId, requestDate, slot)

  const tableStatus = tables.map((t: any) => ({
    table_id: t.table_id,
    table_code: t.table_code,
    is_available: t.bookings.length === 0
  }))

  const userId = c.get('userId')
  const userExistingBooking = await getUserExistingBooking(userId, requestDate, slot)
  const isReserved = userExistingBooking !== null

  return c.json({
    success: true,
    status: 'OPEN',
    isReserved: isReserved,
    data: tableStatus
  })
})

app.get('/booking-stats', authMiddleware, async (c) => {
  const userId = c.get('userId')
  const today = new Date()
  today.setHours(0, 0, 0, 0)

  const { userUpcoming, userTotal, allTotal } = await getBookingStats(userId, today)

  const percentage = allTotal > 0 ? (userTotal / allTotal) * 100 : 0
  const stats = {
    userUpcoming,
    userTotal,
    allTotal,
    percentage
  }

  return c.json({ success: true, data: stats })
})

app.post('/book', authMiddleware, async (c) => {
  const userId = c.get('userId')
  const body = await c.req.json()
  const { table_id, table_code, date, slot, lab_id } = body

  if (isPastDate(date)) {
    return c.json({ success: false, error: 'Cannot book a date in the past' }, 400)
  }

  try {
    const bookingDate = new Date(date)
    const existing = await getExistingBooking(table_id, bookingDate, slot)
    if (existing) {
      return c.json({ success: false, error: 'Table already booked' }, 409)
    }

    const newBooking = await createBooking(userId, table_id, bookingDate, slot)

    const userInfo = await getUserInfo(userId)
    const labInfo = await getLabInfo(lab_id)

    try {
      const { error: emailError } = await resend.emails.send({
        from: `ComSciSeat <${process.env.RESEND_FROM_EMAIL}>`,
        to: `${userInfo?.email}`,
        subject: 'Booking Confirmation',
        html: reservationTemplate(userInfo, labInfo, table_code, newBooking)
      })
      if (emailError) {
        console.error('Failed to send confirmation email:', emailError)
      }
    } catch (emailError) {
      console.error('Failed to send confirmation email:', emailError)
    }

    return c.json({ success: true, data: newBooking })
  } catch (e) {
    console.error(e)
    return c.json({ success: false, error: 'Booking failed' }, 500)
  }
})

app.get('/my-bookings', authMiddleware, async (c) => {
  const userId = c.get('userId')
  const myBookings = await getUserBookings(userId)
  return c.json({ success: true, data: myBookings })
})

app.delete('/cancel/:booking_id', authMiddleware, async (c) => {
  const userId = c.get('userId')
  const bookingId = Number.parseInt(c.req.param('booking_id'))

  const booking = await getBookingById(bookingId)

  if (booking?.user_id !== userId) {
    return c.json({ success: false, error: 'Not authorized or not found' }, 403)
  }

  if (isPastDate(booking.booking_date.toISOString())) {
    return c.json({ success: false, error: 'Cannot cancel a booking that has already passed' }, 400)
  }

  await deleteBooking(bookingId)

  const userInfo = await getUserInfo(userId)

  try {
    const { error: emailError } = await resend.emails.send({
      from: `ComSciSeat <${process.env.RESEND_FROM_EMAIL}>`,
      to: `${userInfo?.email}`,
      subject: 'Booking Cancellation',
      html: cancelationTemplate(userInfo, booking)
    })
    if (emailError) {
      console.error('Failed to send cancellation email:', emailError)
    }
  } catch (error) {
    console.error('Failed to send cancellation email:', error)
  }

  return c.json({ success: true, message: 'Booking cancelled' })
})

export { app as reservationService }
