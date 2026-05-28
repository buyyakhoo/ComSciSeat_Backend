import { describe, it, expect, beforeAll, afterAll, beforeEach } from 'vitest'
import { bookingService } from '../../../routes/booking.routes.js'
import { getPrismaTest, setupTestDatabase, cleanDatabase } from '../helpers/setup.js'
import { seedBaseData, generateToken } from '../helpers/seed.js'

let testData: Awaited<ReturnType<typeof seedBaseData>>
let studentToken: string
let adminToken: string

beforeAll(async () => {
  await setupTestDatabase()
})

afterAll(async () => {
  await cleanDatabase()
  await getPrismaTest().$disconnect()
})

beforeEach(async () => {
  await cleanDatabase()
  testData = await seedBaseData()
  studentToken = generateToken('test001', 'student')
  adminToken   = generateToken('admin001', 'admin')
})

describe('Integration: GET /check-table-availability', () => {
  it('should return OPEN with real table data from DB', async () => {
    // Arrange
    const tomorrow = new Date(Date.now() + 86400000)
    if (tomorrow.getDay() === 0) tomorrow.setDate(tomorrow.getDate() + 1)
    const dateStr = tomorrow.toISOString().split('T')[0]
    // Act
    const res = await bookingService.request(
      `/check-table-availability?lab_id=${testData.lab.lab_id}&date=${dateStr}&slot=Morning`,
      { headers: { 'Authorization': `Bearer ${studentToken}` } }
    )
    // Assert
    expect(res.status).toBe(200)
    const body = await res.json()
    expect(body.status).toBe('OPEN')
    expect(body.data).toHaveLength(1)
    expect(body.data[0].table_code).toBe('A01')
    expect(body.data[0].is_available).toBe(true)
  })

  it('should show table as unavailable after someone books it', async () => {
    // Arrange
    const tomorrow = new Date(Date.now() + 86400000)
    if (tomorrow.getDay() === 0) tomorrow.setDate(tomorrow.getDate() + 1)
    
    await getPrismaTest().bookings.create({
      data: {
        user_id: testData.user.user_id,
        table_id: testData.table.table_id,
        booking_date: new Date(tomorrow.toISOString().split('T')[0]),
        slot: 'Morning'
      }
    })
    // Act
    const res = await bookingService.request(
      `/check-table-availability?lab_id=${testData.lab.lab_id}&date=${tomorrow.toISOString().split('T')[0]}&slot=Morning`,
      { headers: { 'Authorization': `Bearer ${studentToken}` } }
    )
    // Assert
    const body = await res.json()
    expect(body.data[0].is_available).toBe(false)
  })

  it('should return CLOSED when class schedule exists in DB', async () => {
    // Arrange
    const tomorrow = new Date(Date.now() + 86400000)
    if (tomorrow.getDay() === 0) tomorrow.setDate(tomorrow.getDate() + 1)
    await getPrismaTest().class_schedule.create({
      data: {
        lab_id: testData.lab.lab_id,
        day_of_week: tomorrow.getDay(),
        slot: 'Morning',
        subject: 'Algorithm Design'
      }
    })

    // Act
    const res = await bookingService.request(
      `/check-table-availability?lab_id=${testData.lab.lab_id}&date=${tomorrow.toISOString().split('T')[0]}&slot=Morning`,
      { headers: { 'Authorization': `Bearer ${studentToken}` } }
    )

    // Assert
    const body = await res.json()
    expect(body.status).toBe('CLOSED')
    expect(body.message).toContain('Algorithm Design')
  })
})

describe('Integration: POST /book', () => {
  it('should create real booking in DB', async () => {
    // Arrange
    const tomorrow = new Date(Date.now() + 86400000)
    if (tomorrow.getDay() === 0) tomorrow.setDate(tomorrow.getDate() + 1)
    // Act
    const res = await bookingService.request('/book', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${studentToken}`
      },
      body: JSON.stringify({
        table_id:   testData.table.table_id,
        table_code: 'A01',
        date:       tomorrow.toISOString().split('T')[0],
        slot:       'Morning',
        lab_id:     testData.lab.lab_id
      })
    })
    // Assert HTTP
    expect(res.status).toBe(200)
    const body = await res.json()
    expect(body.success).toBe(true)
    // Assert DB
    const bookingInDb = await getPrismaTest().bookings.findUnique({
      where: { booking_id: body.data.booking_id }
    })
    expect(bookingInDb).not.toBeNull()
    expect(bookingInDb!.user_id).toBe('test001')
    expect(bookingInDb!.slot).toBe('Morning')
  })

  it('should return 409 and NOT create booking when table is already taken', async () => {
    // Arrange
    const tomorrow = new Date(Date.now() + 86400000)
    if (tomorrow.getDay() === 0) tomorrow.setDate(tomorrow.getDate() + 1)
    const dateStr = tomorrow.toISOString().split('T')[0]

    await getPrismaTest().bookings.create({
      data: {
        user_id:      testData.user.user_id,
        table_id:     testData.table.table_id,
        booking_date: new Date(dateStr),
        slot:         'Morning'
      }
    })

    // Act
    const anotherUser = await getPrismaTest().users.create({
      data: { user_id: 'test002', name: 'อีกคน', email: 'test002@kmitl.ac.th', user_type: 'student' }
    })
    const anotherToken = generateToken('test002', 'student')

    const res = await bookingService.request('/book', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${anotherToken}` },
      body: JSON.stringify({ table_id: testData.table.table_id, table_code: 'A01', date: dateStr, slot: 'Morning', lab_id: testData.lab.lab_id })
    })

    // Assert HTTP
    expect(res.status).toBe(409)

    // Assert DB
    const count = await getPrismaTest().bookings.count()
    expect(count).toBe(1)
  })
})

describe('Integration: DELETE /cancel/:booking_id', () => {
  it('should delete booking from DB when owner cancels', async () => {
    // Arrange
    const tomorrow = new Date(Date.now() + 86400000)
    if (tomorrow.getDay() === 0) tomorrow.setDate(tomorrow.getDate() + 1)

    const booking = await getPrismaTest().bookings.create({
      data: {
        user_id:      'test001',
        table_id:     testData.table.table_id,
        booking_date: new Date(tomorrow.toISOString().split('T')[0]),
        slot:         'Morning'
      }
    })

    // Act
    const res = await bookingService.request(`/cancel/${booking.booking_id}`, {
      method: 'DELETE',
      headers: { 'Authorization': `Bearer ${studentToken}` }
    })

    // Assert HTTP
    expect(res.status).toBe(200)

    // Assert DB
    const deleted = await getPrismaTest().bookings.findUnique({
      where: { booking_id: booking.booking_id }
    })
    expect(deleted).toBeNull()
  })

  it('should NOT delete booking when different user tries to cancel', async () => {
    // Arrange
    const tomorrow = new Date(Date.now() + 86400000)
    if (tomorrow.getDay() === 0) tomorrow.setDate(tomorrow.getDate() + 1)

    const booking = await getPrismaTest().bookings.create({
      data: {
        user_id:      'test001',   // เจ้าของคือ test001
        table_id:     testData.table.table_id,
        booking_date: new Date(tomorrow.toISOString().split('T')[0]),
        slot:         'Afternoon'
      }
    })

    await getPrismaTest().users.create({
      data: { user_id: 'test003', name: 'คนแปลกหน้า', email: 'test003@kmitl.ac.th', user_type: 'student' }
    })
    const strangerToken = generateToken('test003', 'student')

    // Act
    const res = await bookingService.request(`/cancel/${booking.booking_id}`, {
      method: 'DELETE',
      headers: { 'Authorization': `Bearer ${strangerToken}` }
    })

    // Assert HTTP
    expect(res.status).toBe(403)

    // Assert DB
    const stillExists = await getPrismaTest().bookings.findUnique({
      where: { booking_id: booking.booking_id }
    })
    expect(stillExists).not.toBeNull()
  })

  it('should return 400 and NOT delete when booking date has already passed', async () => {
    // Arrange
    const yesterday = new Date(Date.now() - 86400000)

    const booking = await getPrismaTest().bookings.create({
      data: {
        user_id:      'test001',
        table_id:     testData.table.table_id,
        booking_date: new Date(yesterday.toISOString().split('T')[0]),
        slot:         'Morning'
      }
    })

    // Act
    const res = await bookingService.request(`/cancel/${booking.booking_id}`, {
      method: 'DELETE',
      headers: { 'Authorization': `Bearer ${studentToken}` }
    })

    // Assert HTTP
    expect(res.status).toBe(400)
    const body = await res.json()
    expect(body.error).toBe('Cannot cancel a booking that has already passed')

    // Assert DB
    const stillExists = await getPrismaTest().bookings.findUnique({
      where: { booking_id: booking.booking_id }
    })
    expect(stillExists).not.toBeNull()
  })

  it('should successfully cancel a booking scheduled for tomorrow', async () => {
    // Arrange
    const tomorrow = new Date(Date.now() + 86400000)
    if (tomorrow.getDay() === 0) tomorrow.setDate(tomorrow.getDate() + 1)

    const booking = await getPrismaTest().bookings.create({
      data: {
        user_id:      'test001',
        table_id:     testData.table.table_id,
        booking_date: new Date(tomorrow.toISOString().split('T')[0]),
        slot:         'Lunch'
      }
    })

    // Act
    const res = await bookingService.request(`/cancel/${booking.booking_id}`, {
      method: 'DELETE',
      headers: { 'Authorization': `Bearer ${studentToken}` }
    })

    // Assert HTTP
    expect(res.status).toBe(200)

    // Assert DB
    const deleted = await getPrismaTest().bookings.findUnique({
      where: { booking_id: booking.booking_id }
    })
    expect(deleted).toBeNull()
  })

})

describe('Integration: GET /booking-stats', () => {
  it('should return stats with correct counts', async () => {
    const tomorrow = new Date(Date.now() + 86400000)
    if (tomorrow.getDay() === 0) tomorrow.setDate(tomorrow.getDate() + 1)

    // สร้าง booking จริงก่อน
    await getPrismaTest().bookings.create({
      data: {
        user_id:      testData.user.user_id,
        table_id:     testData.table.table_id,
        booking_date: new Date(tomorrow.toISOString().split('T')[0]),
        slot:         'Morning'
      }
    })

    const res = await bookingService.request('/booking-stats', {
      headers: { 'Authorization': `Bearer ${studentToken}` }
    })

    expect(res.status).toBe(200)
    const body = await res.json()
    expect(body.data.userUpcoming).toBe(1)
    expect(body.data.userTotal).toBe(1)
    expect(body.data.allTotal).toBe(1)
    expect(body.data.percentage).toBe(100)
  })

  it('should return 0 percentage when no bookings exist', async () => {
    const res = await bookingService.request('/booking-stats', {
      headers: { 'Authorization': `Bearer ${studentToken}` }
    })
    const body = await res.json()
    expect(body.data.percentage).toBe(0)
  })
})

describe('Integration: GET /my-bookings', () => {
  it('should return only current user bookings', async () => {
    const tomorrow = new Date(Date.now() + 86400000)
    if (tomorrow.getDay() === 0) tomorrow.setDate(tomorrow.getDate() + 1)

    await getPrismaTest().bookings.create({
      data: {
        user_id:      testData.user.user_id,
        table_id:     testData.table.table_id,
        booking_date: new Date(tomorrow.toISOString().split('T')[0]),
        slot:         'Morning'
      }
    })

    const res = await bookingService.request('/my-bookings', {
      headers: { 'Authorization': `Bearer ${studentToken}` }
    })

    expect(res.status).toBe(200)
    const body = await res.json()
    expect(body.data).toHaveLength(1)
    expect(body.data[0].tables.table_code).toBe('A01')
    expect(body.data[0].tables.labs.lab_name).toBe('Computer Lab 1')
  })

  it('should return empty array when user has no bookings', async () => {
    const res = await bookingService.request('/my-bookings', {
      headers: { 'Authorization': `Bearer ${studentToken}` }
    })
    const body = await res.json()
    expect(body.data).toHaveLength(0)
  })
})