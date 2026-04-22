import { describe, it, expect, vi, beforeEach } from 'vitest'

vi.mock('../../shared/database/prisma.js', () => ({
    prisma: {
        tables: {
            findMany:  vi.fn(),
            findUnique: vi.fn(),
        }
    }
}))

vi.mock('../../shared/middleware/auth.js', () => ({
    authMiddleware: vi.fn(async (c: any, next: any) => {
        c.set('userId', 'test-user-id')
        c.set('userType', 'student')
        await next()
    })
}))

import { prisma } from '../../shared/database/prisma.js'
import { tableService } from '../../routes/table.routes.js'

describe('GET /tables', () => {
    beforeEach(() => vi.clearAllMocks())

    it('should return all tables', async () => {
        // Arrange
        vi.mocked(prisma.tables.findMany).mockResolvedValue([
            { table_id: 1, table_code: 'A01', lab_id: 1 },
            { table_id: 2, table_code: 'A02', lab_id: 1 },
        ] as any)

        // Act
        const res = await tableService.request('/', {
            headers: { 'Authorization': 'Bearer test-token' }
        })

        // Assert
        expect(res.status).toBe(200)
        const body = await res.json()
        expect(body.success).toBe(true)
        expect(body.data).toHaveLength(2)
    })

    it('should return empty array when no tables exist', async () => {
        // Arrange
        vi.mocked(prisma.tables.findMany).mockResolvedValue([])

        // Act
        const res = await tableService.request('/', {
            headers: { 'Authorization': 'Bearer test-token' }
        })

        // Assert
        const body = await res.json()
        expect(body.data).toHaveLength(0)
    })
})

describe('GET /tables/:table_id', () => {
    beforeEach(() => vi.clearAllMocks())

    it('should return a specific table by id', async () => {
        // Arrange
        vi.mocked(prisma.tables.findUnique).mockResolvedValue({
            table_id: 1, table_code: 'A01', lab_id: 1
        } as any)

        // Act
        const res = await tableService.request('/1', {
            headers: { 'Authorization': 'Bearer test-token' }
        })

        // Assert
        expect(res.status).toBe(200)
        const body = await res.json()
        expect(body.success).toBe(true)
        expect(body.data.table_code).toBe('A01')
    })

    it('should return null data when table not found', async () => {
        // Arrange
        vi.mocked(prisma.tables.findUnique).mockResolvedValue(null)

        // Act
        const res = await tableService.request('/99999', {
            headers: { 'Authorization': 'Bearer test-token' }
        })

        // Assert
        const body = await res.json()
        expect(body.data).toBeNull()
    })
})