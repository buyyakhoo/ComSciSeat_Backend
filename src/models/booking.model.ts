import { prisma } from '../shared/database/prisma.js'

export async function findTablesByLabWithBookings(
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

export async function findBookingByUserDateSlot(
  user_id: string,
  booking_date: Date,
  slot: string
) {
  return prisma.bookings.findFirst({
    where: { user_id, booking_date, slot: slot as any }
  })
}

export async function countUpcomingUserBookings(user_id: string, today: Date) {
  return prisma.bookings.count({
    where: {
      user_id,
      booking_date: { gte: today }
    }
  })
}

export async function countUserBookings(user_id: string) {
  return prisma.bookings.count({
    where: { user_id }
  })
}

export async function countAllBookings() {
  return prisma.bookings.count()
}

export async function countBookingsByDate(booking_date: Date) {
  return prisma.bookings.count({
    where: { booking_date: { equals: booking_date } }
  })
}

export async function countLabs() {
  return prisma.labs.count()
}

export async function countTables() {
  return prisma.tables.count()
}

export async function countUsers() {
  return prisma.users.count()
}

export async function findAllBookingsWithDetails() {
  return prisma.bookings.findMany({
    include: {
      users: { select: { name: true, user_id: true } },
      tables: {
        select: {
          table_code: true,
          labs: { select: { lab_name: true } }
        }
      }
    },
    orderBy: [{ booking_date: 'desc' }, { created_at: 'desc' }]
  })
}

export async function findBookingByTableDateSlot(
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

export async function findUserInfo(user_id: string) {
  return prisma.users.findUnique({
    where: { user_id },
    select: { email: true, name: true }
  })
}

export async function findLabInfo(lab_id: number) {
  return prisma.labs.findUnique({
    where: { lab_id },
    select: { lab_name: true }
  })
}

export async function findUserBookings(user_id: string) {
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

export async function findBookingById(booking_id: number) {
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
