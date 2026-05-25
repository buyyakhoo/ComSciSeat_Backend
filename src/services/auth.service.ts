import { upsertUser } from '../models/user.model.js'

export async function upsertUserFromGoogle(
  student_id: string,
  email: string,
  name: string
) {
  return upsertUser(student_id, name, email)
}
