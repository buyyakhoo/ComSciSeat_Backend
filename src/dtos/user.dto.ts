import { z } from 'zod'

export const userParamSchema = z.object({
  user_id: z.string().min(1)
})

export const studentParamSchema = z.object({
  student_id: z.string().min(1)
})

export const updateUserTypeSchema = z.object({
  userType: z.enum(['student', 'admin'])
})

export const verifyOrCreateUserSchema = z.object({
  user_id: z.string().min(1),
  name: z.string().min(1),
  email: z.string().email()
})
