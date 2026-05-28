import { prisma } from '../shared/database/prisma.js'

export async function findClassScheduleByLabId(lab_id: number) {
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

export async function findAllClassSchedules() {
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

export async function findClassScheduleById(class_id: number) {
  return prisma.class_schedule.findUnique({
    where: { class_id }
  })
}

export async function findClassScheduleByLabAndTime(
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

export async function deleteClassSchedule(class_id: number) {
  return prisma.class_schedule.delete({
    where: { class_id }
  })
}
