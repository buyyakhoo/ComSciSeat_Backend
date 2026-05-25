import * as userModel from '../models/user.model.js'

export async function upsertUser(user_id: string, name: string, email: string) {
  return userModel.upsertUser(user_id, name, email)
}

export async function getUserById(user_id: string) {
  return userModel.findUserById(user_id)
}

export async function getAllUsers() {
  return userModel.findAllUsersWithBookingCount()
}

export async function updateUserType(user_id: string, user_type: string) {
  return userModel.updateUserType(user_id, user_type)
}
