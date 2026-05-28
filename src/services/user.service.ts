import * as userModel from '../models/user.model.js'

export async function upsertUser(student_id: string | null, name: string, email: string) {
  return userModel.upsertUser(student_id, name, email)
}

export async function getUserById(user_id: string) {
  return userModel.findUserById(user_id)
}

export async function getUserByStudentId(student_id: string) {
  return userModel.findUserByStudentId(student_id)
}

export async function getAllUsers() {
  return userModel.findAllUsersWithBookingCount()
}

export async function updateUserType(user_id: string, user_type: string) {
  return userModel.updateUserType(user_id, user_type)
}
