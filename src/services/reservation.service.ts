import { prisma } from '../shared/database/prisma.js'

export async function getClassScheduleByLabAndTime(
  lab_id: number,
  day_of_week: number,
  slot: string
) {
  return prisma.class_schedule.findFirst({
    where: { lab_id, day_of_week, slot: slot as any }
  })
}

export async function getTablesByLabWithBookings(
  lab_id: number,
  booking_date: Date,
  slot: string
) {
  return prisma.tables.findMany({
    where: { lab_id },
    include: {
      bookings: {
        where: { booking_date, slot: slot as any }
      }
    },
    orderBy: { table_id: 'asc' }
  })
}

export async function getUserExistingBooking(
  user_id: string,
  booking_date: Date,
  slot: string
) {
  return prisma.bookings.findFirst({
    where: { user_id, booking_date, slot: slot as any }
  })
}

export async function getBookingStats(user_id: string, today: Date) {
  const [userUpcoming, userTotal, allTotal] = await Promise.all([
    prisma.bookings.count({
      where: {
        user_id,
        booking_date: { gte: today }
      }
    }),
    prisma.bookings.count({
      where: { user_id }
    }),
    prisma.bookings.count()
  ])

  return { userUpcoming, userTotal, allTotal }
}

export async function getExistingBooking(
  table_id: number,
  booking_date: Date,
  slot: string
) {
  return prisma.bookings.findFirst({
    where: { table_id, booking_date, slot: slot as any }
  })
}

export async function createBooking(
  user_id: string,
  table_id: number,
  booking_date: Date,
  slot: string
) {
  return prisma.bookings.create({
    data: {
      user_id,
      table_id,
      booking_date,
      slot: slot as any
    }
  })
}

export async function getUserInfo(user_id: string) {
  return prisma.users.findUnique({
    where: { user_id },
    select: { email: true, name: true }
  })
}

export async function getLabInfo(lab_id: number) {
  return prisma.labs.findUnique({
    where: { lab_id },
    select: { lab_name: true }
  })
}

export async function getUserBookings(user_id: string) {
  return prisma.bookings.findMany({
    where: { user_id },
    select: {
      booking_id: true,
      table_id: true,
      booking_date: true,
      slot: true,
      tables: {
        select: {
          table_code: true,
          lab_id: true,
          labs: {
            select: {
              lab_name: true
            }
          }
        }
      }
    },
    orderBy: { booking_date: 'desc' }
  })
}

export async function getBookingById(booking_id: number) {
  return prisma.bookings.findUnique({
    where: { booking_id },
    include: {
      users: true,
      tables: {
        include: {
          labs: true
        }
      }
    }
  })
}

export async function deleteBooking(booking_id: number) {
  return prisma.bookings.delete({
    where: { booking_id }
  })
}
