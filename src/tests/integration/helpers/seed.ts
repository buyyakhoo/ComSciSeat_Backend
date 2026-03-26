import { getPrismaTest } from './setup.js'
import jwt from 'jsonwebtoken'

export async function seedBaseData() {
  const prisma = getPrismaTest()

  const user = await prisma.users.create({
    data: {
      user_id: 'test001',
      name: 'นักศึกษาทดสอบ',
      email: 'test001@kmitl.ac.th',
      user_type: 'student'
    }
  })

  const admin = await prisma.users.create({
    data: {
      user_id: 'admin001',
      name: 'แอดมินทดสอบ',
      email: 'admin001@kmitl.ac.th',
      user_type: 'admin'
    }
  })

  const lab = await prisma.labs.create({
    data: { lab_name: 'Computer Lab 1' }
  })

  const table = await prisma.tables.create({
    data: { lab_id: lab.lab_id, table_code: 'A01' }
  })

  return { user, admin, lab, table }
}

export function generateToken(userId: string, userType: string) {
  return jwt.sign(
    { user_id: userId, email: `${userId}@kmitl.ac.th`, user_type: userType },
    process.env.JWT_SECRET!,
    { expiresIn: '1h' }
  )
}