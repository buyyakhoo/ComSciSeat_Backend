import { z } from 'zod'

const timeSlotSchema = z.enum(['Morning', 'Lunch', 'Afternoon'])

export const classScheduleParamSchema = z.object({
  class_id: z.coerce.number().int().positive()
})

export const classScheduleLabParamSchema = z.object({
  lab_id: z.coerce.number().int().positive()
})

export const createClassScheduleSchema = z.object({
  labId: z.coerce.number().int().positive(),
  day_of_week: z.coerce.number().int().min(1).max(6),
  slot: timeSlotSchema,
  subject: z.string().min(1)
})
