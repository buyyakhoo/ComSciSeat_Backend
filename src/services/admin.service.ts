import { prisma } from '../shared/database/prisma.js'

export async function getBookingStatsAdmin(todayStr: string, yesterdayStr: string) {
  const bookingsToday = await prisma.bookings.count({
    where: { booking_date: { equals: new Date(todayStr) } }
  })
  const bookingsYesterday = await prisma.bookings.count({
    where: { booking_date: { equals: new Date(yesterdayStr) } }
  })
  const allBookings = await prisma.bookings.count()
  const totalLabs = await prisma.labs.count()
  const totalTables = await prisma.tables.count()
  const totalUsers = await prisma.users.count()

  return { bookingsToday, bookingsYesterday, allBookings, totalLabs, totalTables, totalUsers }
}

export async function getAllBookings() {
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

export async function getUserById(user_id: string) {
  return prisma.users.findUnique({
    where: { user_id }
  })
}

export async function getExistingBookingByTable(table_id: number, booking_date: Date, slot: string) {
  return prisma.bookings.findFirst({
    where: { table_id, booking_date, slot: slot as any }
  })
}

export async function getExistingBookingByUser(user_id: string, booking_date: Date, slot: string) {
  return prisma.bookings.findFirst({
    where: { user_id, booking_date, slot: slot as any }
  })
}

export async function createAdminBooking(
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

export async function getAllLabs() {
  return prisma.labs.findMany({
    orderBy: { lab_id: 'asc' }
  })
}

export async function getLabById(lab_id: number) {
  return prisma.labs.findUnique({
    where: { lab_id }
  })
}

export async function deleteLab(lab_id: number) {
  return prisma.labs.delete({
    where: { lab_id }
  })
}

export async function getLabByName(lab_name: string) {
  return prisma.labs.findUnique({
    where: { lab_name }
  })
}

export async function createLab(lab_name: string, lab_code: string) {
  return prisma.labs.create({
    data: { lab_name, lab_code }
  })
}

export async function getAllTables() {
  return prisma.tables.findMany({
    include: {
      labs: {
        select: { lab_name: true }
      }
    },
    orderBy: [
      { lab_id: 'asc' },
      { table_code: 'asc' }
    ]
  })
}

export async function getTableById(table_id: number) {
  return prisma.tables.findUnique({
    where: { table_id }
  })
}

export async function deleteTable(table_id: number) {
  return prisma.tables.delete({
    where: { table_id }
  })
}

export async function getTableByLabAndCode(lab_id: number, table_code: string) {
  return prisma.tables.findFirst({
    where: {
      lab_id,
      table_code
    }
  })
}

export async function createTable(lab_id: number, table_code: string) {
  return prisma.tables.create({
    data: {
      lab_id,
      table_code
    }
  })
}

export async function getAllClassSchedules() {
  return prisma.class_schedule.findMany({
    include: {
      labs: {
        select: { lab_name: true }
      }
    },
    orderBy: [
      { lab_id: 'asc' },
      { day_of_week: 'asc' },
      { slot: 'asc' }
    ]
  })
}

export async function getClassScheduleById(class_id: number) {
  return prisma.class_schedule.findUnique({
    where: { class_id }
  })
}

export async function deleteClassSchedule(class_id: number) {
  return prisma.class_schedule.delete({
    where: { class_id }
  })
}

export async function getClassScheduleByLabAndTime(
  lab_id: number,
  day_of_week: number,
  slot: string
) {
  return prisma.class_schedule.findFirst({
    where: {
      lab_id,
      day_of_week,
      slot: slot as any
    }
  })
}

export async function createClassSchedule(
  lab_id: number,
  day_of_week: number,
  slot: string,
  subject: string
) {
  return prisma.class_schedule.create({
    data: {
      lab_id,
      day_of_week,
      slot: slot as any,
      subject
    }
  })
}

export async function getAllUsers() {
  return prisma.users.findMany({
    select: {
      user_id: true,
      name: true,
      email: true,
      user_type: true,
      _count: {
        select: { bookings: true }
      }
    },
    orderBy: { user_id: 'asc' }
  })
}

export async function updateUserType(user_id: string, user_type: string) {
  return prisma.users.update({
    where: { user_id },
    data: { user_type: user_type as any }
  })
}

export async function deleteBooking(booking_id: number) {
  return prisma.bookings.delete({
    where: { booking_id }
  })
}

export async function getBookingById(booking_id: number) {
  return prisma.bookings.findUnique({
    where: { booking_id }
  })
}
