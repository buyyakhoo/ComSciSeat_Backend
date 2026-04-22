import { prisma } from '../shared/database/prisma.js'

export async function upsertUser(user_id: string, name: string, email: string) {
  return prisma.users.upsert({
    where: { user_id },
    update: { name },
    create: {
      user_id,
      name,
      email,
      user_type: 'student'
    }
  })
}

export async function getUserById(user_id: string) {
  return prisma.users.findUnique({
    where: { user_id }
  })
}
