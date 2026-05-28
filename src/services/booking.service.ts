import * as bookingModel from '../models/booking.model.js'
import {
  sendReservationCancellationEmail,
  sendReservationConfirmationEmail
} from './mail.service.js'
import { getClassScheduleByLabAndTime } from './class_schedule.service.js'
import { getUserById } from './user.service.js'

type ServiceResult<T> =
  | { success: true; status: number; data: T }
  | { success: false; status: number; error: string }

export async function getTablesByLabWithBookings(
  lab_id: number,
  booking_date: Date,
  slot: string
) {
  return bookingModel.findTablesByLabWithBookings(lab_id, booking_date, slot)
}

export async function getTableAvailability(
  lab_id: number,
  booking_date: Date,
  slot: string,
  user_id: string
) {
  const dayOfWeek = booking_date.getDay()

  if (dayOfWeek === 0) {
    return {
      success: true,
      status: 'CLOSED',
      message: 'ห้องแลปปิดทำการในวันอาทิตย์',
      data: []
    }
  }

  const hasClass = await getClassScheduleByLabAndTime(lab_id, dayOfWeek, slot)

  if (hasClass) {
    return {
      success: true,
      status: 'CLOSED',
      message: `ห้องแลปนี้มีการเรียนการสอนในเวลานี้ รายวิชา ${hasClass.subject}`,
      class: hasClass,
      data: []
    }
  }

  const tables = await getTablesByLabWithBookings(lab_id, booking_date, slot)
  const data = tables.map((t: any) => ({
    table_id: t.table_id,
    table_code: t.table_code,
    is_available: t.bookings.length === 0
  }))

  const userExistingBooking = await getUserExistingBooking(user_id, booking_date, slot)

  return {
    success: true,
    status: 'OPEN',
    isReserved: userExistingBooking !== null,
    data
  }
}

export async function getUserExistingBooking(
  user_id: string,
  booking_date: Date,
  slot: string
) {
  return bookingModel.findBookingByUserDateSlot(user_id, booking_date, slot)
}

export async function getBookingStats(user_id: string, today: Date) {
  const [userUpcoming, userTotal, allTotal] = await Promise.all([
    bookingModel.countUpcomingUserBookings(user_id, today),
    bookingModel.countUserBookings(user_id),
    bookingModel.countAllBookings()
  ])

  return { userUpcoming, userTotal, allTotal }
}

export async function getBookingStatsAdmin(todayStr: string, yesterdayStr: string) {
  const bookingsToday = await bookingModel.countBookingsByDate(new Date(todayStr))
  const bookingsYesterday = await bookingModel.countBookingsByDate(new Date(yesterdayStr))
  const allBookings = await bookingModel.countAllBookings()
  const totalLabs = await bookingModel.countLabs()
  const totalTables = await bookingModel.countTables()
  const totalUsers = await bookingModel.countUsers()

  return { bookingsToday, bookingsYesterday, allBookings, totalLabs, totalTables, totalUsers }
}

export async function getAllBookings() {
  return bookingModel.findAllBookingsWithDetails()
}

export async function getExistingBooking(
  table_id: number,
  booking_date: Date,
  slot: string
) {
  return bookingModel.findBookingByTableDateSlot(table_id, booking_date, slot)
}

export async function getExistingBookingByUser(
  user_id: string,
  booking_date: Date,
  slot: string
) {
  return bookingModel.findBookingByUserDateSlot(user_id, booking_date, slot)
}

export async function createBooking(
  user_id: string,
  table_id: number,
  booking_date: Date,
  slot: string
) {
  return bookingModel.createBooking(user_id, table_id, booking_date, slot)
}

export async function createUserBooking(
  user_id: string,
  table_id: number,
  table_code: string,
  booking_date: Date,
  slot: string,
  lab_id: number
): Promise<ServiceResult<{
  booking: unknown
}>> {
  const existing = await getExistingBooking(table_id, booking_date, slot)
  if (existing) {
    return { success: false, status: 409, error: 'Table already booked' }
  }

  const booking = await createBooking(user_id, table_id, booking_date, slot)
  const userInfo = await getUserInfo(user_id)
  const labInfo = await getLabInfo(lab_id)

  await sendReservationConfirmationEmail(userInfo, labInfo, table_code, booking)

  return {
    success: true,
    status: 200,
    data: { booking }
  }
}

export async function createAdminBooking(
  user_id: string,
  table_id: number,
  booking_date: Date,
  slot: string
): Promise<ServiceResult<unknown>> {
  const userExists = await getUserById(user_id)
  if (!userExists) {
    return { success: false, status: 404, error: 'User not found' }
  }

  const duplicateTable = await getExistingBooking(table_id, booking_date, slot)
  if (duplicateTable) {
    return { success: false, status: 409, error: 'Table already booked in this slot' }
  }

  const duplicateUser = await getExistingBookingByUser(user_id, booking_date, slot)
  if (duplicateUser) {
    return { success: false, status: 409, error: 'User already has a booking in this slot' }
  }

  const booking = await createBooking(user_id, table_id, booking_date, slot)
  return { success: true, status: 200, data: booking }
}

export async function getUserInfo(user_id: string) {
  if (!user_id) {
    throw new Error('Missing user_id in auth context')
  }

  return bookingModel.findUserInfo(user_id)
}

export async function getLabInfo(lab_id: number) {
  return bookingModel.findLabInfo(lab_id)
}

export async function getUserBookings(user_id: string) {
  return bookingModel.findUserBookings(user_id)
}

export async function getBookingById(booking_id: number) {
  return bookingModel.findBookingById(booking_id)
}

export async function deleteBooking(booking_id: number) {
  return bookingModel.deleteBooking(booking_id)
}

export async function deleteAdminBooking(booking_id: number): Promise<ServiceResult<null>> {
  const existing = await getBookingById(booking_id)
  if (!existing) {
    return { success: false, status: 404, error: 'Booking not found' }
  }

  await deleteBooking(booking_id)
  return { success: true, status: 200, data: null }
}

export async function cancelUserBooking(
  user_id: string,
  booking_id: number,
  isPast: (date: string) => boolean
): Promise<ServiceResult<{
  booking: Awaited<ReturnType<typeof getBookingById>>
}>> {
  const booking = await getBookingById(booking_id)

  if (booking?.user_id !== user_id) {
    return { success: false, status: 403, error: 'Not authorized or not found' }
  }

  if (isPast(booking.booking_date.toISOString())) {
    return { success: false, status: 400, error: 'Cannot cancel a booking that has already passed' }
  }

  await deleteBooking(booking_id)
  const userInfo = await getUserInfo(user_id)
  await sendReservationCancellationEmail(userInfo, booking)

  return { success: true, status: 200, data: { booking } }
}
