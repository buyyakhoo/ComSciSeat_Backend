import * as classScheduleModel from '../models/class_schedule.model.js'

type ServiceResult<T> =
  | { success: true; status: number; data: T }
  | { success: false; status: number; error: string }

export async function getClassScheduleByLabId(lab_id: number) {
  return classScheduleModel.findClassScheduleByLabId(lab_id)
}

export async function getAllClassSchedules() {
  return classScheduleModel.findAllClassSchedules()
}

export async function getClassScheduleByLabAndTime(
  lab_id: number,
  day_of_week: number,
  slot: string
) {
  return classScheduleModel.findClassScheduleByLabAndTime(lab_id, day_of_week, slot)
}

export async function createClassSchedule(
  lab_id: number,
  day_of_week: number,
  slot: string,
  subject: string
): Promise<ServiceResult<unknown>> {
  const existing = await classScheduleModel.findClassScheduleByLabAndTime(
    lab_id,
    day_of_week,
    slot
  )
  if (existing) {
    return { success: false, status: 409, error: 'Class schedule already exists' }
  }

  const schedule = await classScheduleModel.createClassSchedule(lab_id, day_of_week, slot, subject)
  return { success: true, status: 200, data: schedule }
}

export async function deleteClassSchedule(class_id: number): Promise<ServiceResult<null>> {
  const existing = await classScheduleModel.findClassScheduleById(class_id)
  if (!existing) {
    return { success: false, status: 404, error: 'Class schedule not found' }
  }

  await classScheduleModel.deleteClassSchedule(class_id)
  return { success: true, status: 200, data: null }
}
