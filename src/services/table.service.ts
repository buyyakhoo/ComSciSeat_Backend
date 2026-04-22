import { prisma } from '../shared/database/prisma.js'

export async function getAllTables() {
  return prisma.tables.findMany({
    orderBy: { lab_id: 'asc' }
  })
}

export async function getTableById(table_id: number) {
  return prisma.tables.findUnique({
    where: { table_id }
  })
}
