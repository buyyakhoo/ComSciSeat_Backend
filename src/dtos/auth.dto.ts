import { z } from 'zod'

export const googleAuthorizeQuerySchema = z.object({
  redirect_uri: z.string().url().optional()
})

export const googleCallbackSchema = z.object({
  code: z.string().min(1),
  redirectUri: z.string().url().optional()
})
