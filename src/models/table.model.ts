import { prisma } from '../shared/database/prisma.js'

export async function findAllTables() {
  return prisma.tables.findMany({
    include: {
      labs: {
        select: { lab_name: true }
      }
    },
    orderBy: [
      { lab_id: 'asc' },
      { table_code: 'asc' }
    ]
  })
}

export async function findTableById(table_id: number) {
  return prisma.tables.findUnique({
    where: { table_id }
  })
}

export async function findTableByLabAndCode(lab_id: number, table_code: string) {
  return prisma.tables.findFirst({
    where: {
      lab_id,
      table_code
    }
  })
}

export async function createTable(lab_id: number, table_code: string) {
  return prisma.tables.create({
    data: {
      lab_id,
      table_code
    }
  })
}

export async function deleteTable(table_id: number) {
  return prisma.tables.delete({
    where: { table_id }
  })
}
