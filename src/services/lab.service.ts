import { prisma } from '../shared/database/prisma.js'

export async function getAllLabs() {
  return prisma.labs.findMany({
    orderBy: { lab_id: 'asc' }
  })
}

export async function getTablesByLabId(lab_id: number) {
  return prisma.tables.findMany({
    select: { table_id: true, table_code: true },
    where: { lab_id },
    orderBy: { table_id: 'asc' }
  })
}

export async function getClassScheduleByLabId(lab_id: number) {
  return prisma.class_schedule.findMany({
    where: { lab_id },
    select: {
      class_id: true,
      day_of_week: true,
      slot: true,
      subject: true
    },
    orderBy: [{ day_of_week: 'asc' }]
  })
}
