import { describe, it, expect, vi, beforeEach } from 'vitest'

vi.mock('../../shared/database/prisma.js', () => ({
    prisma: {
        labs:           { findMany: vi.fn() },
        tables:         { findMany: vi.fn() },
        class_schedule: { findMany: vi.fn() },
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
import { labService } from '../../services/lab_service.js'

describe('GET /labs', () => {
    beforeEach(() => vi.clearAllMocks())

    it('should return all labs', async () => {
        // Arrange
        vi.mocked(prisma.labs.findMany).mockResolvedValue([
            { lab_id: 1, lab_name: 'Computer Lab 1' },
            { lab_id: 2, lab_name: 'Computer Lab 2' },
        ])

        // Act
        const res = await labService.request('/', {
            headers: { 'Authorization': 'Bearer test-token' }
        })

        // Assert
        expect(res.status).toBe(200)
        const body = await res.json()
        expect(body.success).toBe(true)
        expect(body.data).toHaveLength(2)
    })

    it('should return empty array when no labs exist', async () => {
        // Arrange
        vi.mocked(prisma.labs.findMany).mockResolvedValue([])

        // Act
        const res = await labService.request('/', {
            headers: { 'Authorization': 'Bearer test-token' }
        })

        // Assert
        const body = await res.json()
        expect(body.data).toHaveLength(0)
    })
})

// ════════════════════════════════════════════════════════
describe('GET /labs/:lab_id/tables', () => {
    beforeEach(() => vi.clearAllMocks())

    it('should return tables for a specific lab', async () => {
        // Arrange
        vi.mocked(prisma.tables.findMany).mockResolvedValue([
            { table_id: 1, table_code: 'A01' },
            { table_id: 2, table_code: 'A02' },
        ] as any)

        // Act
        const res = await labService.request('/1/tables', {
            headers: { 'Authorization': 'Bearer test-token' }
        })

        // Assert
        expect(res.status).toBe(200)
        const body = await res.json()
        expect(body.success).toBe(true)
        expect(body.data).toHaveLength(2)
        expect(body.data[0].table_code).toBe('A01')
    })

    it('should return empty array when lab has no tables', async () => {
        // Arrange
        vi.mocked(prisma.tables.findMany).mockResolvedValue([])

        // Act
        const res = await labService.request('/1/tables', {
            headers: { 'Authorization': 'Bearer test-token' }
        })

        // Assert
        const body = await res.json()
        expect(body.data).toHaveLength(0)
    })
})

describe('GET /labs/:lab_id/class_schedule', () => {
    beforeEach(() => vi.clearAllMocks())

    it('should return class schedule for a specific lab', async () => {
        // Arrange
        vi.mocked(prisma.class_schedule.findMany).mockResolvedValue([
            { class_id: 1, day_of_week: 1, slot: 'Morning', subject: 'Data Structures' },
            { class_id: 2, day_of_week: 3, slot: 'Afternoon', subject: 'Algorithms' },
        ] as any)

        // Act
        const res = await labService.request('/1/class_schedule', {
            headers: { 'Authorization': 'Bearer test-token' }
        })

        // Assert
        expect(res.status).toBe(200)
        const body = await res.json()
        expect(body.success).toBe(true)
        expect(body.data).toHaveLength(2)
        expect(body.data[0].subject).toBe('Data Structures')
    })

    it('should return empty array when no class schedule exists', async () => {
        // Arrange
        vi.mocked(prisma.class_schedule.findMany).mockResolvedValue([])

        // Act
        const res = await labService.request('/1/class_schedule', {
            headers: { 'Authorization': 'Bearer test-token' }
        })

        // Assert
        const body = await res.json()
        expect(body.data).toHaveLength(0)
    })
})