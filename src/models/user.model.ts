import { prisma } from '../shared/database/prisma.js'

export async function upsertUser(student_id: string | null, name: string, email: string) {
  return prisma.users.upsert({
    where: { email },
    update: { name, student_id },
    create: {
      student_id,
      name,
      email,
      user_type: 'student'
    }
  })
}

export async function findUserById(user_id: string) {
  return prisma.users.findUnique({
    where: { user_id }
  })
}

export async function findUserByStudentId(student_id: string) {
  return prisma.users.findFirst({
    where: { student_id }
  })
}

export async function findAllUsersWithBookingCount() {
  return prisma.users.findMany({
    select: {
      user_id: true,
      student_id: true,
      name: true,
      email: true,
      user_type: true,
      _count: {
        select: { bookings: true }
      }
    },
    orderBy: { student_id: 'asc' }
  })
}

export async function updateUserType(user_id: string, user_type: string) {
  return prisma.users.update({
    where: { user_id },
    data: { user_type: user_type as any }
  })
}
