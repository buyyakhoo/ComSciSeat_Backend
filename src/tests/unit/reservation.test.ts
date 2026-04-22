import { describe, it, expect, vi, beforeEach } from 'vitest'

vi.mock('../../shared/database/prisma.js', () => ({
    prisma: {
        bookings: {
            findFirst: vi.fn(),
            findMany: vi.fn(),
            findUnique: vi.fn(),
            create: vi.fn(),
            delete: vi.fn(),
            count: vi.fn(),
        },
        users:  { findUnique: vi.fn() },
        labs:   { findUnique: vi.fn() },
        class_schedule: { findFirst: vi.fn() },
        tables: { findMany: vi.fn() },
    }
}))

vi.mock('resend', () => ({
    Resend: vi.fn().mockImplementation(function() {
        return {
            emails: { send: vi.fn().mockResolvedValue({ error: null }) }
        }
    })
}))

vi.mock('../../shared/middleware/auth.js', () => ({
    authMiddleware: vi.fn(async (c: any, next: any) => {
        c.set('userId', 'test-user-id')
        c.set('userType', 'student')
        await next()
    })
}))

import { prisma } from '../../shared/database/prisma.js'
import { reservationService } from '../../routes/reservation.routes.js'

describe('GET /check-table-availability', () => {
    beforeEach(() => vi.clearAllMocks())
    it('should return 400 when parameters are missing', async () => {
        // Act
        const res = await reservationService.request(
            '/check-table-availability',
            { headers: { 'Authorization': 'Bearer test-token' } }
        )
        // Assert
        expect(res.status).toBe(400)
        const body = await res.json()
        expect(body.error).toBe('Missing parameters')
    })

    it('should return CLOSED status when date is Sunday', async () => {
        // Arrange 
        const sunday = new Date()
        sunday.setDate(sunday.getDate() + ((7 - sunday.getDay()) % 7 || 7))
        const sundayStr = sunday.toISOString().split('T')[0]
        // Act
        const res = await reservationService.request(
            `/check-table-availability?lab_id=1&date=${sundayStr}&slot=Morning`,
            { headers: { 'Authorization': 'Bearer test-token' } }
        )
        // Assert
        expect(res.status).toBe(200)
        const body = await res.json()
        expect(body.status).toBe('CLOSED')
        expect(body.message).toContain('อาทิตย์')
    })

    it('should return CLOSED with subject when lab has class schedule', async () => {
        // Arrange
        vi.mocked(prisma.class_schedule.findFirst).mockResolvedValue({
            class_id: 1, lab_id: 1,
            day_of_week: 1, slot: 'Morning',
            subject: 'Data Structures'
        })
        const monday = new Date()
        monday.setDate(monday.getDate() + ((8 - monday.getDay()) % 7 || 7))
        const mondayStr = monday.toISOString().split('T')[0]
        // Act
        const res = await reservationService.request(
            `/check-table-availability?lab_id=1&date=${mondayStr}&slot=Morning`,
            { headers: { 'Authorization': 'Bearer test-token' } }
        )
        // Assert
        const body = await res.json()
        expect(body.status).toBe('CLOSED')
        expect(body.message).toContain('Data Structures')
        expect(body.class).toBeDefined()
    })

    it('should return OPEN with table availability when lab is free', async () => {
        // Arrange
        vi.mocked(prisma.class_schedule.findFirst).mockResolvedValue(null)
        vi.mocked(prisma.tables.findMany).mockResolvedValue([
            {
                table_id: 1, table_code: 'A01', lab_id: 1,
                bookings: [] 
            },
            {
                table_id: 2, table_code: 'A02', lab_id: 1,
                bookings: [{ booking_id: 5 }]
            }
        ] as any)
        vi.mocked(prisma.bookings.findFirst).mockResolvedValue(null)
        const tomorrow = new Date(Date.now() + 86400000)

        if (tomorrow.getDay() === 0) tomorrow.setDate(tomorrow.getDate() + 1)
        const dateStr = tomorrow.toISOString().split('T')[0]
        // Act
        const res = await reservationService.request(
            `/check-table-availability?lab_id=1&date=${dateStr}&slot=Morning`,
            { headers: { 'Authorization': 'Bearer test-token' } }
        )
        // Assert
        expect(res.status).toBe(200)
        const body = await res.json()
        expect(body.status).toBe('OPEN')
        expect(body.isReserved).toBe(false)
        expect(body.data).toHaveLength(2)
        expect(body.data[0].is_available).toBe(true)
        expect(body.data[1].is_available).toBe(false)
    })

    it('should return isReserved true when user already has booking', async () => {
        // Arrange
        vi.mocked(prisma.class_schedule.findFirst).mockResolvedValue(null)
        vi.mocked(prisma.tables.findMany).mockResolvedValue([] as any)
        vi.mocked(prisma.bookings.findFirst).mockResolvedValue({
            booking_id: 10, user_id: 'test-user-id',
            table_id: 1, booking_date: new Date(),
            slot: 'Morning', created_at: new Date()
        })
        const tomorrow = new Date(Date.now() + 86400000)
        if (tomorrow.getDay() === 0) tomorrow.setDate(tomorrow.getDate() + 1)
        const dateStr = tomorrow.toISOString().split('T')[0]
        // Act
        const res = await reservationService.request(
            `/check-table-availability?lab_id=1&date=${dateStr}&slot=Morning`,
            { headers: { 'Authorization': 'Bearer test-token' } }
        )
        // Assert
        const body = await res.json()
        expect(body.isReserved).toBe(true)
    })
})

describe('GET /booking-stats', () => {
    beforeEach(() => vi.clearAllMocks())
    it('should return booking stats for current user', async () => {
        // Arrange
        vi.mocked(prisma.bookings.count)
            .mockResolvedValueOnce(3)
            .mockResolvedValueOnce(10)
            .mockResolvedValueOnce(100)
        // Act
        const res = await reservationService.request('/booking-stats', {
            headers: { 'Authorization': 'Bearer test-token' }
        })
        // Assert
        expect(res.status).toBe(200)
        const body = await res.json()
        expect(body.success).toBe(true)
        expect(body.data.userUpcoming).toBe(3)
        expect(body.data.userTotal).toBe(10)
        expect(body.data.allTotal).toBe(100)
        expect(body.data.percentage).toBe(10)
    })

    it('should return 0 percentage when allTotal is 0', async () => {
        // Arrange
        vi.mocked(prisma.bookings.count)
        .mockResolvedValueOnce(0)
        .mockResolvedValueOnce(0)
        .mockResolvedValueOnce(0)
        // Act
        const res = await reservationService.request('/booking-stats', {
        headers: { 'Authorization': 'Bearer test-token' }
        })
        // Assert
        const body = await res.json()
        expect(body.data.percentage).toBe(0)
    })
})

describe('POST /book', () => {
    beforeEach(() => vi.clearAllMocks())
    it('should return 400 when booking date is in the past', async () => {
        const res = await reservationService.request('/book', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': 'Bearer test-token'
            },
            body: JSON.stringify({
                table_id: 1, table_code: 'A01',
                date: '2020-01-01', slot: 'Morning', lab_id: 1
            })
        })
        expect(res.status).toBe(400)
        const body = await res.json()
        expect(body.success).toBe(false)
        expect(body.error).toBe('Cannot book a date in the past')
    })

    it('should return 409 when table is already booked', async () => {
        // Arrange
        vi.mocked(prisma.bookings.findFirst).mockResolvedValue({
            booking_id: 1, table_id: 1, booking_date: new Date(),
            slot: 'Morning', user_id: 'abc', created_at: new Date()
        })
        // Act
        const res = await reservationService.request('/book', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': 'Bearer test-token'
            },
            body: JSON.stringify({
                table_id: 1, table_code: 'A01',
                date: new Date(Date.now() + 86400000).toISOString(),
                slot: 'Morning', lab_id: 1
            })
        })
        // Assert
        expect(res.status).toBe(409)
        const body = await res.json()
        expect(body.error).toBe('Table already booked')
    })

    it('should return 200 and booking data when booking is successful', async () => {
        // Arrange
        vi.mocked(prisma.bookings.findFirst).mockResolvedValue(null)
        vi.mocked(prisma.bookings.create).mockResolvedValue({
            booking_id: 99, table_id: 1, booking_date: new Date(),
            slot: 'Morning', user_id: 'test-user-id', created_at: new Date()
        })
        vi.mocked(prisma.users.findUnique).mockResolvedValue({
            user_id: 'test-user-id', name: 'สมชาย',
            email: 'test@kmitl.ac.th', user_type: 'student'
        })
        vi.mocked(prisma.labs.findUnique).mockResolvedValue({
            lab_id: 1, lab_name: 'Computer Lab 1'
        })
        // Act
        const res = await reservationService.request('/book', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': 'Bearer test-token'
            },
            body: JSON.stringify({
                table_id: 1, table_code: 'A01',
                date: new Date(Date.now() + 86400000).toISOString(),
                slot: 'Morning', lab_id: 1
            })
        })
        // Assert
        expect(res.status).toBe(200)
        const body = await res.json()
        expect(body.success).toBe(true)
        expect(body.data.booking_id).toBe(99)
    })
})

describe('GET /my-bookings', () => {
    beforeEach(() => vi.clearAllMocks())
    it('should return list of bookings for current user', async () => {
        // Arrange
        vi.mocked(prisma.bookings.findMany).mockResolvedValue([
            {
                booking_id: 1, table_id: 1,
                booking_date: new Date('2025-06-15'), slot: 'Morning',
                tables: {
                table_code: 'A01', lab_id: 1,
                labs: { lab_name: 'Computer Lab 1' }
                }
            }
        ] as any)
        // Act
        const res = await reservationService.request('/my-bookings', {
            headers: { 'Authorization': 'Bearer test-token' }
        })
        // Assert
        expect(res.status).toBe(200)
        const body = await res.json()
        expect(body.success).toBe(true)
        expect(body.data).toHaveLength(1)
        expect(body.data[0].tables.lab_id).toBe(1)
    })

  it('should return empty array when user has no bookings', async () => {
    // Arrange
    vi.mocked(prisma.bookings.findMany).mockResolvedValue([])
    // Act
    const res = await reservationService.request('/my-bookings', {
        headers: { 'Authorization': 'Bearer test-token' }
    })
    // Assert
    const body = await res.json()
    expect(body.data).toHaveLength(0)
  })
})

describe('DELETE /cancel/:booking_id', () => {
    beforeEach(() => vi.clearAllMocks())
    it('should return 403 when user tries to cancel someone elses booking', async () => {
        // Arrange
        vi.mocked(prisma.bookings.findUnique).mockResolvedValue({
            booking_id: 1,
            user_id: 'other-user-id',
            table_id: 1, booking_date: new Date(),
            slot: 'Morning', created_at: new Date(),
            users: {}, tables: { labs: {} }
        } as any)
        // Act
        const res = await reservationService.request('/cancel/1', {
            method: 'DELETE',
            headers: { 'Authorization': 'Bearer test-token' }
        })
        // Assert
        expect(res.status).toBe(403)
        const body = await res.json()
        expect(body.error).toBe('Not authorized or not found')
    })

  it('should return 200 and cancel booking successfully', async () => {
    // Arrange
    const mockBooking = {
        booking_id: 1,
        user_id: 'test-user-id',
        table_id: 1, booking_date: new Date(Date.now() + 86400000),
        slot: 'Morning', created_at: new Date(),
        users: { user_id: 'test-user-id', name: 'สมชาย', email: 'test@kmitl.ac.th' },
        tables: { table_code: 'A01', labs: { lab_name: 'Computer Lab 1' } }
    }
    vi.mocked(prisma.bookings.findUnique).mockResolvedValue(mockBooking as any)
    vi.mocked(prisma.bookings.delete).mockResolvedValue(mockBooking as any)
    vi.mocked(prisma.users.findUnique).mockResolvedValue({
        user_id: 'test-user-id', name: 'สมชาย',
        email: 'test@kmitl.ac.th', user_type: 'student'
    })
    // Act
    const res = await reservationService.request('/cancel/1', {
        method: 'DELETE',
        headers: { 'Authorization': 'Bearer test-token' }
    })
    // Assert
    expect(res.status).toBe(200)
    const body = await res.json()
    expect(body.success).toBe(true)
    expect(body.message).toBe('Booking cancelled')
    expect(vi.mocked(prisma.bookings.delete)).toHaveBeenCalledWith({
        where: { booking_id: 1 }
    })
  })

    it('should return 400 when trying to cancel a booking that has already passed', async () => {
    // Arrange
    const yesterday = new Date(Date.now() - 86400000)
    const mockBooking = {
        booking_id: 2,
        user_id: 'test-user-id',
        table_id: 1, booking_date: yesterday,
        slot: 'Morning', created_at: new Date(),
        users: { user_id: 'test-user-id', name: 'สมชาย', email: 'test@kmitl.ac.th' },
        tables: { table_code: 'A01', labs: { lab_name: 'Computer Lab 1' } }
    }
    vi.mocked(prisma.bookings.findUnique).mockResolvedValue(mockBooking as any)
    // Act
    const res = await reservationService.request('/cancel/2', {
        method: 'DELETE',
        headers: { 'Authorization': 'Bearer test-token' }
    })
    // Assert
    expect(res.status).toBe(400)
    const body = await res.json()
    expect(body.success).toBe(false)
    expect(body.error).toBe('Cannot cancel a booking that has already passed')
    expect(vi.mocked(prisma.bookings.delete)).not.toHaveBeenCalled()
  })

  it('should allow cancellation when booking is scheduled for tomorrow', async () => {
    // Arrange — boundary case: วันพรุ่งนี้ยังยกเลิกได้
    const tomorrow = new Date(Date.now() + 86400000)
    const mockBooking = {
        booking_id: 3,
        user_id: 'test-user-id',
        table_id: 1, booking_date: tomorrow,
        slot: 'Afternoon', created_at: new Date(),
        users: { user_id: 'test-user-id', name: 'สมชาย', email: 'test@kmitl.ac.th' },
        tables: { table_code: 'A01', labs: { lab_name: 'Computer Lab 1' } }
    }
    vi.mocked(prisma.bookings.findUnique).mockResolvedValue(mockBooking as any)
    vi.mocked(prisma.bookings.delete).mockResolvedValue(mockBooking as any)
    vi.mocked(prisma.users.findUnique).mockResolvedValue({
        user_id: 'test-user-id', name: 'สมชาย',
        email: 'test@kmitl.ac.th', user_type: 'student'
    })
    // Act
    const res = await reservationService.request('/cancel/3', {
        method: 'DELETE',
        headers: { 'Authorization': 'Bearer test-token' }
    })
    // Assert
    expect(res.status).toBe(200)
    const body = await res.json()
    expect(body.success).toBe(true)
    expect(vi.mocked(prisma.bookings.delete)).toHaveBeenCalledOnce()
  })
})