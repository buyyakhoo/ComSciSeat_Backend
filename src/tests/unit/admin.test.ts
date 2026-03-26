import { describe, it, expect, vi, beforeEach } from 'vitest'

vi.mock('../../shared/database/prisma.js', () => ({
  prisma: {
    bookings: {
      count:      vi.fn(),
      findMany:   vi.fn(),
      findFirst:  vi.fn(),
      findUnique: vi.fn(),
      create:     vi.fn(),
      delete:     vi.fn(),
    },
    labs: {
      count:      vi.fn(),
      findMany:   vi.fn(),
      findUnique: vi.fn(),
      create:     vi.fn(),
      delete:     vi.fn(),
    },
    tables: {
      count:      vi.fn(),
      findMany:   vi.fn(),
      findFirst:  vi.fn(),
      findUnique: vi.fn(),
      create:     vi.fn(),
      delete:     vi.fn(),
    },
    users: {
      count:      vi.fn(),
      findMany:   vi.fn(),
      findUnique: vi.fn(),
      update:     vi.fn(),
    },
    class_schedule: {
      findMany:   vi.fn(),
      findFirst:  vi.fn(),
      findUnique: vi.fn(),
      create:     vi.fn(),
      delete:     vi.fn(),
    }
  }
}))

vi.mock('../../shared/middleware/auth.js', () => ({
  authMiddleware: vi.fn(async (c: any, next: any) => {
    c.set('userId', 'admin-id')
    c.set('userType', 'admin')
    await next()
  })
}))

import { prisma } from '../../shared/database/prisma.js'
import { adminService } from '../../services/admin_service.js'

const adminHeader = { 'Authorization': 'Bearer test-token' }
const jsonHeader  = { 'Content-Type': 'application/json', 'Authorization': 'Bearer test-token' }

describe('Authorization guard', () => {
    beforeEach(() => vi.clearAllMocks())

    it('should return 403 when userType is not admin', async () => {
        const { authMiddleware } = await import('../../shared/middleware/auth.js')
        vi.mocked(authMiddleware).mockImplementationOnce(async (c: any, next: any) => {
            c.set('userId', 'student-id')
            c.set('userType', 'student')
            await next()
        })

        // Act
        const res = await adminService.request('/labs', { headers: adminHeader })

        // Assert
        expect(res.status).toBe(403)
        const body = await res.json()
        expect(body.error).toBe('Unauthorized')
    })
})

describe('GET /admin/labs', () => {
  beforeEach(() => vi.clearAllMocks())

  it('should return all labs', async () => {
    // Arrange
    vi.mocked(prisma.labs.findMany).mockResolvedValue([
      { lab_id: 1, lab_name: 'Computer Lab 1' },
    ])

    // Act
    const res = await adminService.request('/labs', { headers: adminHeader })

    // Assert
    expect(res.status).toBe(200)
    const body = await res.json()
    expect(body.data).toHaveLength(1)
  })
})

describe('POST /admin/add_lab', () => {
    beforeEach(() => vi.clearAllMocks())

    it('should create a new lab', async () => {
        // Arrange
        vi.mocked(prisma.labs.findUnique).mockResolvedValue(null)
        vi.mocked(prisma.labs.create).mockResolvedValue({ lab_id: 2, lab_name: 'Computer Lab 2' })

        // Act
        const res = await adminService.request('/add_lab', {
            method: 'POST',
            headers: jsonHeader,
            body: JSON.stringify({ lab_name: 'Computer Lab 2' })
        })

        // Assert
        expect(res.status).toBe(200)
        const body = await res.json()
        expect(body.data.lab_name).toBe('Computer Lab 2')
    })

    it('should return 409 when lab name already exists', async () => {
        // Arrange
        vi.mocked(prisma.labs.findUnique).mockResolvedValue({ lab_id: 1, lab_name: 'Computer Lab 1' })

        // Act
        const res = await adminService.request('/add_lab', {
            method: 'POST',
            headers: jsonHeader,
            body: JSON.stringify({ lab_name: 'Computer Lab 1' })
        })

        // Assert
        expect(res.status).toBe(409)
        expect(vi.mocked(prisma.labs.create)).not.toHaveBeenCalled()
    })
})

describe('DELETE /admin/labs/:lab_id', () => {
    beforeEach(() => vi.clearAllMocks())

    it('should delete a lab successfully', async () => {
        // Arrange
        vi.mocked(prisma.labs.findUnique).mockResolvedValue({ lab_id: 1, lab_name: 'Computer Lab 1' })
        vi.mocked(prisma.labs.delete).mockResolvedValue({ lab_id: 1, lab_name: 'Computer Lab 1' })

        // Act
        const res = await adminService.request('/labs/1', {
            method: 'DELETE',
            headers: adminHeader
        })

        // Assert
        expect(res.status).toBe(200)
        expect(vi.mocked(prisma.labs.delete)).toHaveBeenCalledWith({ where: { lab_id: 1 } })
    })

    it('should return 404 when lab not found', async () => {
        // Arrange
        vi.mocked(prisma.labs.findUnique).mockResolvedValue(null)

        // Act
        const res = await adminService.request('/labs/99999', {
            method: 'DELETE',
            headers: adminHeader
        })

        // Assert
        expect(res.status).toBe(404)
        expect(vi.mocked(prisma.labs.delete)).not.toHaveBeenCalled()
    })
})

describe('POST /admin/add_table', () => {
    beforeEach(() => vi.clearAllMocks())

    it('should create a new table', async () => {
        // Arrange
        vi.mocked(prisma.tables.findFirst).mockResolvedValue(null)
        vi.mocked(prisma.tables.create).mockResolvedValue({ table_id: 1, table_code: 'A01', lab_id: 1 } as any)

        // Act
        const res = await adminService.request('/add_table', {
            method: 'POST',
            headers: jsonHeader,
            body: JSON.stringify({ labId: 1, table_code: 'A01' })
        })

        // Assert
        expect(res.status).toBe(200)
        const body = await res.json()
        expect(body.data.table_code).toBe('A01')
    })

    it('should return 409 when table code already exists in lab', async () => {
        // Arrange
        vi.mocked(prisma.tables.findFirst).mockResolvedValue({ table_id: 1, table_code: 'A01', lab_id: 1 } as any)

        // Act
        const res = await adminService.request('/add_table', {
            method: 'POST',
            headers: jsonHeader,
            body: JSON.stringify({ labId: 1, table_code: 'A01' })
        })

        // Assert
        expect(res.status).toBe(409)
        expect(vi.mocked(prisma.tables.create)).not.toHaveBeenCalled()
    })
})

describe('POST /admin/bookings', () => {
    beforeEach(() => vi.clearAllMocks())

    it('should return 404 when user does not exist', async () => {
        // Arrange
        vi.mocked(prisma.users.findUnique).mockResolvedValue(null)

        // Act
        const res = await adminService.request('/bookings', {
            method: 'POST',
            headers: jsonHeader,
            body: JSON.stringify({ userId: 'notexist', tableId: 1, booking_date: '2025-06-15', slot: 'Morning' })
        })

        // Assert
        expect(res.status).toBe(404)
        expect((body: any) => body).toBeDefined()
    })

    it('should return 409 when table is already booked', async () => {
        // Arrange
        vi.mocked(prisma.users.findUnique).mockResolvedValue({ user_id: 'test001' } as any)
        vi.mocked(prisma.bookings.findFirst).mockResolvedValue({ booking_id: 1 } as any)

        // Act
        const res = await adminService.request('/bookings', {
            method: 'POST',
            headers: jsonHeader,
            body: JSON.stringify({ userId: 'test001', tableId: 1, booking_date: '2025-06-15', slot: 'Morning' })
        })

        // Assert
        expect(res.status).toBe(409)
    })

    it('should create booking successfully', async () => {
        // Arrange
        vi.mocked(prisma.users.findUnique).mockResolvedValue({ user_id: 'test001' } as any)
        vi.mocked(prisma.bookings.findFirst).mockResolvedValue(null)
        vi.mocked(prisma.bookings.create).mockResolvedValue({
            booking_id: 1, user_id: 'test001', table_id: 1,
            booking_date: new Date('2025-06-15'), slot: 'Morning', created_at: new Date()
        })

        // Act
        const res = await adminService.request('/bookings', {
            method: 'POST',
            headers: jsonHeader,
            body: JSON.stringify({ userId: 'test001', tableId: 1, booking_date: '2025-06-15', slot: 'Morning' })
        })

        // Assert
        expect(res.status).toBe(200)
        const body = await res.json()
        expect(body.success).toBe(true)
    })
})

describe('POST /admin/add_class_schedule', () => {
    beforeEach(() => vi.clearAllMocks())

    it('should create a new class schedule', async () => {
        // Arrange
        vi.mocked(prisma.class_schedule.findFirst).mockResolvedValue(null)
        vi.mocked(prisma.class_schedule.create).mockResolvedValue({
            class_id: 1, lab_id: 1, day_of_week: 1, slot: 'Morning', subject: 'Algorithm'
        } as any)

        // Act
        const res = await adminService.request('/add_class_schedule', {
            method: 'POST',
            headers: jsonHeader,
            body: JSON.stringify({ labId: 1, day_of_week: 1, slot: 'Morning', subject: 'Algorithm' })
        })

        // Assert
        expect(res.status).toBe(200)
        const body = await res.json()
        expect(body.data.subject).toBe('Algorithm')
    })

    it('should return 409 when schedule already exists', async () => {
        // Arrange
        vi.mocked(prisma.class_schedule.findFirst).mockResolvedValue({ class_id: 1 } as any)

        // Act
        const res = await adminService.request('/add_class_schedule', {
        method: 'POST',
        headers: jsonHeader,
        body: JSON.stringify({ labId: 1, day_of_week: 1, slot: 'Morning', subject: 'Duplicate' })
        })

        // Assert
        expect(res.status).toBe(409)
        expect(vi.mocked(prisma.class_schedule.create)).not.toHaveBeenCalled()
    })
})

describe('PATCH /admin/users/:user_id', () => {
    beforeEach(() => vi.clearAllMocks())

    it('should update user type to admin', async () => {
        // Arrange
        vi.mocked(prisma.users.update).mockResolvedValue({
            user_id: 'test001', name: 'สมชาย',
            email: 'test001@kmitl.ac.th', user_type: 'admin'
        })

        // Act
        const res = await adminService.request('/users/test001', {
            method: 'PATCH',
            headers: jsonHeader,
            body: JSON.stringify({ userType: 'admin' })
        })

        // Assert
        expect(res.status).toBe(200)
        const body = await res.json()
        expect(body.data.user_type).toBe('admin')
    })

    it('should return 400 when userType is invalid', async () => {
        // Act
        const res = await adminService.request('/users/test001', {
        method: 'PATCH',
        headers: jsonHeader,
        body: JSON.stringify({ userType: 'superadmin' })
        })

        // Assert
        expect(res.status).toBe(400)
        expect(vi.mocked(prisma.users.update)).not.toHaveBeenCalled()
    })
})

describe('GET /admin/booking-stats-admin', () => {
    it('should return booking stats', async () => {
        vi.mocked(prisma.bookings.count)
                                .mockResolvedValueOnce(5)
                                .mockResolvedValueOnce(3)
                                .mockResolvedValueOnce(100)
        vi.mocked(prisma.labs.count).mockResolvedValue(3)
        vi.mocked(prisma.tables.count).mockResolvedValue(20)
        vi.mocked(prisma.users.count).mockResolvedValue(50)

        const res = await adminService.request('/booking-stats-admin', {
            headers: { 'Authorization': 'Bearer test-token' }
        })

        expect(res.status).toBe(200)
        const body = await res.json()
        expect(body.data.bookingsToday).toBe(5)
        expect(body.data.totalLabs).toBe(3)
    })
})

describe('GET /admin/bookings', () => {
    it('should return all bookings with user and table info', async () => {
        vi.mocked(prisma.bookings.findMany).mockResolvedValue([
            {
                booking_id: 1,
                users: { name: 'สมชาย', user_id: 'test001' },
                tables: { table_code: 'A01', labs: { lab_name: 'Lab 1' } }
            }
        ] as any)

        const res = await adminService.request('/bookings', {
            headers: { 'Authorization': 'Bearer test-token' }
        })

        expect(res.status).toBe(200)
        const body = await res.json()
        expect(body.data).toHaveLength(1)
    })
})

describe('DELETE /admin/bookings/:booking_id', () => {
    it('should delete booking successfully', async () => {
        vi.mocked(prisma.bookings.findUnique).mockResolvedValue({ booking_id: 1 } as any)
        vi.mocked(prisma.bookings.delete).mockResolvedValue({ booking_id: 1 } as any)

        const res = await adminService.request('/bookings/1', {
            method: 'DELETE',
            headers: { 'Authorization': 'Bearer test-token' }
        })

        expect(res.status).toBe(200)
    })

    it('should return 404 when booking not found', async () => {
        vi.mocked(prisma.bookings.findUnique).mockResolvedValue(null)

        const res = await adminService.request('/bookings/99999', {
            method: 'DELETE',
            headers: { 'Authorization': 'Bearer test-token' }
        })

        expect(res.status).toBe(404)
    })
})

describe('GET /admin/tables', () => {
    it('should return all tables with lab info', async () => {
        vi.mocked(prisma.tables.findMany).mockResolvedValue([
            { table_id: 1, table_code: 'A01', lab_id: 1, labs: { lab_name: 'Lab 1' } }
        ] as any)

        const res = await adminService.request('/tables', {
            headers: { 'Authorization': 'Bearer test-token' }
        })

        expect(res.status).toBe(200)
        const body = await res.json()
        expect(body.data[0].labs.lab_name).toBe('Lab 1')
    })
})

describe('DELETE /admin/tables/:table_id', () => {
    it('should delete table successfully', async () => {
        vi.mocked(prisma.tables.findUnique).mockResolvedValue({ table_id: 1 } as any)
        vi.mocked(prisma.tables.delete).mockResolvedValue({ table_id: 1 } as any)

        const res = await adminService.request('/tables/1', {
            method: 'DELETE',
            headers: { 'Authorization': 'Bearer test-token' }
        })

        expect(res.status).toBe(200)
    })

    it('should return 404 when table not found', async () => {
        vi.mocked(prisma.tables.findUnique).mockResolvedValue(null)

        const res = await adminService.request('/tables/99999', {
            method: 'DELETE',
            headers: { 'Authorization': 'Bearer test-token' }
        })

        expect(res.status).toBe(404)
    })
})

describe('GET /admin/class_schedule', () => {
    it('should return all class schedules', async () => {
        vi.mocked(prisma.class_schedule.findMany).mockResolvedValue([
            { class_id: 1, lab_id: 1, day_of_week: 1, slot: 'Morning',
                subject: 'Data Structures', labs: { lab_name: 'Lab 1' } }
        ] as any)

        const res = await adminService.request('/class_schedule', {
            headers: { 'Authorization': 'Bearer test-token' }
        })

        expect(res.status).toBe(200)
        const body = await res.json()
        expect(body.data[0].subject).toBe('Data Structures')
    })
})

describe('DELETE /admin/class_schedule/:class_id', () => {
    it('should delete schedule successfully', async () => {
        vi.mocked(prisma.class_schedule.findUnique).mockResolvedValue({ class_id: 1 } as any)
        vi.mocked(prisma.class_schedule.delete).mockResolvedValue({ class_id: 1 } as any)

        const res = await adminService.request('/class_schedule/1', {
            method: 'DELETE',
            headers: { 'Authorization': 'Bearer test-token' }
        })

        expect(res.status).toBe(200)
    })

    it('should return 404 when schedule not found', async () => {
        vi.mocked(prisma.class_schedule.findUnique).mockResolvedValue(null)

        const res = await adminService.request('/class_schedule/99999', {
            method: 'DELETE',
            headers: { 'Authorization': 'Bearer test-token' }
        })

        expect(res.status).toBe(404)
    })
})

describe('GET /admin/users', () => {
    it('should return all users with booking count', async () => {
        vi.mocked(prisma.users.findMany).mockResolvedValue([
            { user_id: 'test001', name: 'สมชาย', email: 'test001@kmitl.ac.th',
                user_type: 'student', _count: { bookings: 3 } }
        ] as any)

        const res = await adminService.request('/users', {
            headers: { 'Authorization': 'Bearer test-token' }
        })

        expect(res.status).toBe(200)
        const body = await res.json()
        expect(body.data[0]._count.bookings).toBe(3)
    })
})