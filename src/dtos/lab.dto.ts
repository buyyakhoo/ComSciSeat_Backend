import { z } from 'zod'

const timeSlotSchema = z.enum(['Morning', 'Lunch', 'Afternoon'])

export const labParamSchema = z.object({
  lab_id: z.coerce.number().int().positive()
})

export const classScheduleParamSchema = z.object({
  class_id: z.coerce.number().int().positive()
})

export const createLabSchema = z.object({
  lab_name: z.string().min(1),
  lab_code: z.string().min(1)
})

export const createClassScheduleSchema = z.object({
  labId: z.coerce.number().int().positive(),
  day_of_week: z.coerce.number().int().min(1).max(6),
  slot: timeSlotSchema,
  subject: z.string().min(1)
})
