import { z } from 'zod'
import { validationError } from './common.dto.js'

const timeSlotSchema = z.enum(['Morning', 'Lunch', 'Afternoon'])
const dateStringSchema = z.string().min(1).refine((value) => !Number.isNaN(Date.parse(value)), {
  message: 'Invalid date'
})

export const bookingParamSchema = z.object({
  booking_id: z.coerce.number().int().positive()
})

export const tableAvailabilityQuerySchema = z.object({
  lab_id: z.coerce.number().int().positive(),
  date: dateStringSchema,
  slot: timeSlotSchema
})

export const createAdminBookingSchema = z.object({
  userId: z.string().min(1),
  tableId: z.coerce.number().int().positive(),
  booking_date: dateStringSchema,
  slot: timeSlotSchema
})

export const createUserBookingSchema = z.object({
  table_id: z.coerce.number().int().positive(),
  table_code: z.string().min(1),
  date: dateStringSchema,
  slot: timeSlotSchema,
  lab_id: z.coerce.number().int().positive()
})

export { validationError }
