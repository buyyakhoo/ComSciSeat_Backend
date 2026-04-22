import { prisma } from '../shared/database/prisma.js'

export async function upsertUserFromGoogle(
  student_id: string,
  email: string,
  name: string
) {
  return prisma.users.upsert({
    where: { user_id: student_id },
    update: { name },
    create: {
      user_id: student_id,
      email,
      name,
      user_type: 'student'
    }
  })
}
