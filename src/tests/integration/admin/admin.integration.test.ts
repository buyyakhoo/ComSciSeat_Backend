import { describe, it, expect, beforeAll, afterAll, beforeEach } from 'vitest'
import { adminService } from '../../../routes/admin.routes.js'
import { getPrismaTest, setupTestDatabase, cleanDatabase } from '../helpers/setup.js'
import { seedBaseData, generateToken } from '../helpers/seed.js'

let testData: Awaited<ReturnType<typeof seedBaseData>>
let studentToken: string
let adminToken: string

beforeAll(async () => { await setupTestDatabase() })
afterAll(async () => { await cleanDatabase(); await getPrismaTest().$disconnect() })
beforeEach(async () => {
    await cleanDatabase()
    testData = await seedBaseData()
    studentToken = generateToken('test001', 'student')
    adminToken   = generateToken('admin001', 'admin')
})

describe('Integration: Authorization guard', () => {

    it('should return 403 when student tries to access admin route', async () => {
        const res = await adminService.request('/labs', {
            headers: { 'Authorization': `Bearer ${studentToken}` }
        })
        expect(res.status).toBe(403)
    })
})

describe('Integration: Labs CRUD', () => {

    it('should return all labs', async () => {
        const res = await adminService.request('/labs', {
            headers: { 'Authorization': `Bearer ${adminToken}` }
        })

        expect(res.status).toBe(200)
        const body = await res.json()
        expect(body.data).toHaveLength(1)
        expect(body.data[0].lab_name).toBe('Computer Lab 1')
    })

    it('should create a new lab', async () => {
        const res = await adminService.request('/add_lab', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${adminToken}` },
            body: JSON.stringify({ lab_name: 'Computer Lab 2' })
        })

        expect(res.status).toBe(200)
        const body = await res.json()
        expect(body.success).toBe(true)
        expect(body.data.lab_name).toBe('Computer Lab 2')

        // Assert DB
        const labInDb = await getPrismaTest().labs.findUnique({ where: { lab_name: 'Computer Lab 2' } })
        expect(labInDb).not.toBeNull()
    })

    it('should return 409 when creating a lab with duplicate name', async () => {
        const res = await adminService.request('/add_lab', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${adminToken}` },
            body: JSON.stringify({ lab_name: 'Computer Lab 1' })
        })

        expect(res.status).toBe(409)
    })

    it('should delete a lab', async () => {
        const res = await adminService.request(`/labs/${testData.lab.lab_id}`, {
            method: 'DELETE',
            headers: { 'Authorization': `Bearer ${adminToken}` }
        })

        expect(res.status).toBe(200)

        // Assert DB
        const labInDb = await getPrismaTest().labs.findUnique({ where: { lab_id: testData.lab.lab_id } })
        expect(labInDb).toBeNull()
    })

    it('should return 404 when deleting non-existent lab', async () => {
        const res = await adminService.request('/labs/99999', {
            method: 'DELETE',
            headers: { 'Authorization': `Bearer ${adminToken}` }
        })

        expect(res.status).toBe(404)
    })
})

describe('Integration: Tables CRUD', () => {

    it('should return all tables with lab info', async () => {
        const res = await adminService.request('/tables', {
            headers: { 'Authorization': `Bearer ${adminToken}` }
        })

        expect(res.status).toBe(200)
        const body = await res.json()
        expect(body.data[0].table_code).toBe('A01')
        expect(body.data[0].labs.lab_name).toBe('Computer Lab 1')
    })

    it('should create a new table', async () => {
        const res = await adminService.request('/add_table', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${adminToken}` },
            body: JSON.stringify({ labId: testData.lab.lab_id, table_code: 'B01' })
        })

        expect(res.status).toBe(200)
        const body = await res.json()
        expect(body.data.table_code).toBe('B01')
    })

    it('should return 409 when creating table with duplicate code', async () => {
        const res = await adminService.request('/add_table', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${adminToken}` },
            body: JSON.stringify({ labId: testData.lab.lab_id, table_code: 'A01' }) // ซ้ำ
        })

        expect(res.status).toBe(409)
    })

    it('should delete a table', async () => {
        const res = await adminService.request(`/tables/${testData.table.table_id}`, {
            method: 'DELETE',
            headers: { 'Authorization': `Bearer ${adminToken}` }
        })

        expect(res.status).toBe(200)

        const tableInDb = await getPrismaTest().tables.findUnique({ where: { table_id: testData.table.table_id } })
        expect(tableInDb).toBeNull()
    })
})

describe('Integration: Class schedule CRUD', () => {

    it('should create a new class schedule', async () => {
        const res = await adminService.request('/add_class_schedule', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${adminToken}` },
            body: JSON.stringify({
                labId: testData.lab.lab_id,
                day_of_week: 1,
                slot: 'Morning',
                subject: 'Algorithm Design'
            })
        })

        expect(res.status).toBe(200)
        const body = await res.json()
        expect(body.data.subject).toBe('Algorithm Design')
    })

    it('should return 409 when creating duplicate class schedule', async () => {
        await getPrismaTest().class_schedule.create({
            data: { lab_id: testData.lab.lab_id, day_of_week: 1, slot: 'Morning', subject: 'Existing' }
        })

        const res = await adminService.request('/add_class_schedule', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${adminToken}` },
            body: JSON.stringify({ labId: testData.lab.lab_id, day_of_week: 1, slot: 'Morning', subject: 'Duplicate' })
        })

        expect(res.status).toBe(409)
    })

    it('should delete a class schedule', async () => {
        const schedule = await getPrismaTest().class_schedule.create({
            data: { lab_id: testData.lab.lab_id, day_of_week: 2, slot: 'Afternoon', subject: 'ToDelete' }
        })

        const res = await adminService.request(`/class_schedule/${schedule.class_id}`, {
            method: 'DELETE',
            headers: { 'Authorization': `Bearer ${adminToken}` }
        })

        expect(res.status).toBe(200)

        const scheduleInDb = await getPrismaTest().class_schedule.findUnique({ where: { class_id: schedule.class_id } })
        expect(scheduleInDb).toBeNull()
    })
})

describe('Integration: Bookings admin', () => {

  it('should return all bookings with user and table info', async () => {
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

    const res = await adminService.request('/bookings', {
        headers: { 'Authorization': `Bearer ${adminToken}` }
    })

    expect(res.status).toBe(200)
    const body = await res.json()
    expect(body.data).toHaveLength(1)
    expect(body.data[0].users.user_id).toBe('test001')
    expect(body.data[0].tables.table_code).toBe('A01')
  })

  it('should delete a booking as admin', async () => {
    const tomorrow = new Date(Date.now() + 86400000)
    if (tomorrow.getDay() === 0) tomorrow.setDate(tomorrow.getDate() + 1)

    const booking = await getPrismaTest().bookings.create({
        data: {
            user_id:      testData.user.user_id,
            table_id:     testData.table.table_id,
            booking_date: new Date(tomorrow.toISOString().split('T')[0]),
            slot:         'Morning'
        }
    })

    const res = await adminService.request(`/bookings/${booking.booking_id}`, {
        method: 'DELETE',
        headers: { 'Authorization': `Bearer ${adminToken}` }
    })

    expect(res.status).toBe(200)

    const bookingInDb = await getPrismaTest().bookings.findUnique({ where: { booking_id: booking.booking_id } })
    expect(bookingInDb).toBeNull()
  })
})

describe('Integration: Users admin', () => {

    it('should return all users with booking count', async () => {
        const res = await adminService.request('/users', {
            headers: { 'Authorization': `Bearer ${adminToken}` }
        })

        expect(res.status).toBe(200)
        const body = await res.json()
        expect(body.data.length).toBeGreaterThanOrEqual(1)
        expect(body.data[0]).toHaveProperty('_count')
    })

    it('should update user type to admin', async () => {
        const res = await adminService.request(`/users/${testData.user.user_id}`, {
            method: 'PATCH',
            headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${adminToken}` },
            body: JSON.stringify({ userType: 'admin' })
        })

        expect(res.status).toBe(200)

        // Assert DB
        const userInDb = await getPrismaTest().users.findUnique({ where: { user_id: testData.user.user_id } })
        expect(userInDb!.user_type).toBe('admin')
    })

    it('should return 400 when userType is invalid', async () => {
        const res = await adminService.request(`/users/${testData.user.user_id}`, {
            method: 'PATCH',
            headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${adminToken}` },
            body: JSON.stringify({ userType: 'superadmin' }) // invalid
        })

        expect(res.status).toBe(400)
    })
})

describe('Integration: Admin booking stats', () => {
  it('should return stats with all counts', async () => {
    const res = await adminService.request('/booking-stats-admin', {
      headers: { 'Authorization': `Bearer ${adminToken}` }
    })
    expect(res.status).toBe(200)
    const body = await res.json()
    expect(body.data).toHaveProperty('bookingsToday')
    expect(body.data).toHaveProperty('bookingsYesterday')
    expect(body.data).toHaveProperty('allBookings')
    expect(body.data).toHaveProperty('totalLabs')
    expect(body.data).toHaveProperty('totalTables')
    expect(body.data).toHaveProperty('totalUsers')
    expect(body.data.totalLabs).toBe(1)
    expect(body.data.totalTables).toBe(1)
    expect(body.data.totalUsers).toBe(2)
  })
})

describe('Integration: Admin class schedule GET', () => {
  it('should return schedules with lab name included', async () => {
    await getPrismaTest().class_schedule.create({
      data: { lab_id: testData.lab.lab_id, day_of_week: 1, slot: 'Morning', subject: 'OS' }
    })

    const res = await adminService.request('/class_schedule', {
      headers: { 'Authorization': `Bearer ${adminToken}` }
    })

    expect(res.status).toBe(200)
    const body = await res.json()
    expect(body.data).toHaveLength(1)
    expect(body.data[0].labs.lab_name).toBe('Computer Lab 1')
  })

  it('should return 404 when deleting non-existent schedule', async () => {
    const res = await adminService.request('/class_schedule/99999', {
      method: 'DELETE',
      headers: { 'Authorization': `Bearer ${adminToken}` }
    })
    expect(res.status).toBe(404)
  })
})

describe('Integration: Admin POST /bookings (3 error paths)', () => {
    it('should return 404 when user not found', async () => {
        const tomorrow = new Date(Date.now() + 86400000)
        if (tomorrow.getDay() === 0) tomorrow.setDate(tomorrow.getDate() + 1)

        const res = await adminService.request('/bookings', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${adminToken}` },
            body: JSON.stringify({
                userId: 'notexist',
                tableId: testData.table.table_id,
                booking_date: tomorrow.toISOString().split('T')[0],
                slot: 'Morning'
            })
        })
        expect(res.status).toBe(404)
    })

    it('should return 409 when table already booked at that time', async () => {
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

        await getPrismaTest().users.create({
            data: { user_id: 'test002', name: 'คนอื่น', email: 'test002@kmitl.ac.th', user_type: 'student' }
        })

        const res = await adminService.request('/bookings', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${adminToken}` },
            body: JSON.stringify({
                userId: 'test002',
                tableId: testData.table.table_id,
                booking_date: dateStr,
                slot: 'Morning'
            })
        })
        expect(res.status).toBe(409)
        const body = await res.json()
        expect(body.error).toBe('โต๊ะนี้ถูกจองแล้วในช่วงเวลานี้')
    })

    it('should return 409 when same user already has booking at that time', async () => {
        const tomorrow = new Date(Date.now() + 86400000)
        if (tomorrow.getDay() === 0) tomorrow.setDate(tomorrow.getDate() + 1)
        const dateStr = tomorrow.toISOString().split('T')[0]

        const table2 = await getPrismaTest().tables.create({
            data: { lab_id: testData.lab.lab_id, table_code: 'A02' }
        })

        await getPrismaTest().bookings.create({
            data: {
                user_id:      testData.user.user_id,
                table_id:     table2.table_id,
                booking_date: new Date(dateStr),
                slot:         'Morning'
            }
        })

        const res = await adminService.request('/bookings', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${adminToken}` },
            body: JSON.stringify({
                userId: testData.user.user_id,
                tableId: testData.table.table_id,
                booking_date: dateStr,
                slot: 'Morning'
            })
        })
        expect(res.status).toBe(409)
        const body = await res.json()
        expect(body.error).toBe('นักศึกษาคนนี้จองช่วงเวลานี้ไปแล้ว')
    })

    it('should create booking successfully', async () => {
        const tomorrow = new Date(Date.now() + 86400000)
        if (tomorrow.getDay() === 0) tomorrow.setDate(tomorrow.getDate() + 1)

        const res = await adminService.request('/bookings', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${adminToken}` },
            body: JSON.stringify({
                userId:       testData.user.user_id,
                tableId:      testData.table.table_id,
                booking_date: tomorrow.toISOString().split('T')[0],
                slot:         'Afternoon'
            })
        })
        expect(res.status).toBe(200)
        const count = await getPrismaTest().bookings.count()
        expect(count).toBe(1)
    })
})

describe('Integration: Admin DELETE /bookings 404', () => {
    it('should return 404 when booking not found', async () => {
        const res = await adminService.request('/bookings/99999', {
            method: 'DELETE',
            headers: { 'Authorization': `Bearer ${adminToken}` }
        })
        expect(res.status).toBe(404)
    })
})

describe('Integration: Admin DELETE /tables 404', () => {
    it('should return 404 when table not found', async () => {
        const res = await adminService.request('/tables/99999', {
            method: 'DELETE',
            headers: { 'Authorization': `Bearer ${adminToken}` }
        })
        expect(res.status).toBe(404)
    })
})