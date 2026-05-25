import * as labModel from '../models/lab.model.js'

type ServiceResult<T> =
  | { success: true; status: number; data: T }
  | { success: false; status: number; error: string }

export async function getAllLabs() {
  return labModel.findAllLabs()
}

export async function createLab(lab_name: string, lab_code: string): Promise<ServiceResult<unknown>> {
  const existing = await labModel.findLabByName(lab_name)
  if (existing) {
    return { success: false, status: 409, error: 'Lab already exists' }
  }

  const lab = await labModel.createLab(lab_name, lab_code)
  return { success: true, status: 200, data: lab }
}

export async function deleteLab(lab_id: number): Promise<ServiceResult<null>> {
  const existing = await labModel.findLabById(lab_id)
  if (!existing) {
    return { success: false, status: 404, error: 'Lab not found' }
  }

  await labModel.deleteLab(lab_id)
  return { success: true, status: 200, data: null }
}

export async function getTablesByLabId(lab_id: number) {
  return labModel.findTablesByLabId(lab_id)
}

export async function getClassScheduleByLabId(lab_id: number) {
  return labModel.findClassScheduleByLabId(lab_id)
}

export async function getAllClassSchedules() {
  return labModel.findAllClassSchedules()
}

export async function createClassSchedule(
  lab_id: number,
  day_of_week: number,
  slot: string,
  subject: string
): Promise<ServiceResult<unknown>> {
  const existing = await labModel.findClassScheduleByLabAndTime(lab_id, day_of_week, slot)
  if (existing) {
    return { success: false, status: 409, error: 'Class schedule already exists' }
  }

  const schedule = await labModel.createClassSchedule(lab_id, day_of_week, slot, subject)
  return { success: true, status: 200, data: schedule }
}

export async function deleteClassSchedule(class_id: number): Promise<ServiceResult<null>> {
  const existing = await labModel.findClassScheduleById(class_id)
  if (!existing) {
    return { success: false, status: 404, error: 'Class schedule not found' }
  }

  await labModel.deleteClassSchedule(class_id)
  return { success: true, status: 200, data: null }
}
