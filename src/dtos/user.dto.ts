import { z } from 'zod'

export const userParamSchema = z.object({
  user_id: z.uuid()
})

export const studentParamSchema = z.object({
  student_id: z.string().regex(/^\d{8}$/)
})

export const identifierParamSchema = z.object({
  identifier: z.string().refine((val) => {
    const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i
    const studentIdRegex = /^\d{8}$/
    return uuidRegex.test(val) || studentIdRegex.test(val)
  }, { message: 'Must be a valid UUID or 8-digit student ID' })
})

export const updateUserTypeSchema = z.object({
  userType: z.enum(['student', 'admin'])
})

export const verifyOrCreateUserSchema = z.object({
  user_id: z.string().min(1).optional(),
  student_id: z.string().regex(/^\d{8}$/).optional(),
  name: z.string().min(1),
  email: z.string().email()
})
