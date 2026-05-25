import * as tableModel from '../models/table.model.js'

type ServiceResult<T> =
  | { success: true; status: number; data: T }
  | { success: false; status: number; error: string }

export async function getAllTables() {
  return tableModel.findAllTables()
}

export async function getTableById(table_id: number) {
  return tableModel.findTableById(table_id)
}

export async function createTable(
  lab_id: number,
  table_code: string
): Promise<ServiceResult<unknown>> {
  const existing = await tableModel.findTableByLabAndCode(lab_id, table_code)
  if (existing) {
    return { success: false, status: 409, error: 'Table already exists in this lab' }
  }

  const table = await tableModel.createTable(lab_id, table_code)
  return { success: true, status: 200, data: table }
}

export async function deleteTable(table_id: number): Promise<ServiceResult<null>> {
  const existing = await tableModel.findTableById(table_id)
  if (!existing) {
    return { success: false, status: 404, error: 'Table not found' }
  }

  await tableModel.deleteTable(table_id)
  return { success: true, status: 200, data: null }
}
