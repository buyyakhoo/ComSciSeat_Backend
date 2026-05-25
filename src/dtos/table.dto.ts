import { z } from 'zod'

export const tableParamSchema = z.object({
  table_id: z.coerce.number().int().positive()
})

export const createTableSchema = z.object({
  labId: z.coerce.number().int().positive(),
  table_code: z.string().min(1).max(3)
})
