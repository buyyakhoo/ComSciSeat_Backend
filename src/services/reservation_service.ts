import { Hono } from 'hono'
import { prisma } from '../shared/database/prisma.js'
import { authMiddleware } from '../shared/middleware/auth.js' // หรือ import จากไฟล์เดิมถ้ายังไม่แยก

const app = new Hono()

// 1. เช็คสถานะโต๊ะ (หัวใจสำคัญ)
// Frontend ส่ง: ?lab_id=1&date=2024-02-14&slot=Morning
app.get('/availability', async (c) => {
    const labId = Number.parseInt(c.req.query('lab_id') || '0')
    const dateStr = c.req.query('date') // "2024-02-14"
    const slot = c.req.query('slot') as 'Morning' | 'Afternoon' | 'Lunch'

    console.log(`${labId} ${dateStr} ${slot}`)

    if (!labId || !dateStr || !slot) {
        return c.json({ error: 'Missing parameters' }, 400)
    }

    const requestDate = new Date(dateStr)
    const dayOfWeek = requestDate.getDay() // 1-6

    // เช็คว่าเป็นวันอาทิตย์ไหม
    const isSunday = new Date(dateStr).getDay() === 0;
    if (isSunday) {
        return c.json({
            success: true,
            status: 'CLOSED',
            message: 'ห้องแลปได้ปิดทำการในวันอาทิตย์',
            data: []
        })
    }

    // เช็คตารางเรียนก่อน (ClassSchedule)
    const hasClass = await prisma.class_schedule.findFirst({
        where: {
            lab_id: labId,
            day_of_week: dayOfWeek,
            slot: slot
        }
    })

    if (hasClass) {
        return c.json({ 
            success: true,
            status: 'CLOSED', 
            message: `ห้องแลปนี้ได้ทำการเรียนการสอนในเวลานี้ รายวิชา ${hasClass.subject}`,
            class: hasClass,
            data: [] 
        })
    }

    //ถ้าไม่มีเรียนไปดึงโต๊ะทั้งหมด + การจอง
    const tables = await prisma.tables.findMany({
        where: { lab_id: labId },
        include: {
            bookings: {
                where: {
                    booking_date: requestDate, // Prisma จัดการ Type Date ให้
                    slot: slot
                }
            }
        },
        orderBy: { table_id: 'asc' }
    })

    const tableStatus = tables.map(t => ({
        table_id: t.table_id,
        table_code: t.table_code,
        is_available: t.bookings.length === 0, // ถ้ามี booking array = 0 แปลว่าว่าง
    }))

    const isReserved = tableStatus.some(t => t.is_available === false)

    return c.json({
        success: true,
        status: 'OPEN',
        isReserved: isReserved,
        data: tableStatus
    })
})

// 2. จองโต๊ะ (ต้อง Login)
app.post('/book', authMiddleware, async (c) => {
    // ดึง user_id จาก middleware
    const userId = c.get('userId') 
    const body = await c.req.json()
    const { table_id, date, slot } = body

    try {
        // Validation: กันจองซ้ำ (Database Constraint ช่วยระดับนึง แต่เช็คก่อนดีกว่า)
        const existing = await prisma.bookings.findFirst({
            where: {
                table_id: table_id,
                booking_date: new Date(date),
                slot: slot
            }
        })

        if (existing) {
            return c.json({ success: false, error: 'Table already booked' }, 409)
        }

        // Create Booking
        const newBooking = await prisma.bookings.create({
            data: {
                user_id: userId,
                table_id: table_id,
                booking_date: new Date(date),
                slot: slot
            }
        })

        return c.json({ success: true, data: newBooking })

    } catch (e) {
        console.error(e)
        return c.json({ success: false, error: 'Booking failed' }, 500)
    }
})

// 3. ดูการจองของฉัน
app.get('/my-bookings', authMiddleware, async (c) => {
    const userId = c.get('userId')

    const myBookings = await prisma.bookings.findMany({
        where: { user_id: userId },
        select: {
            booking_id: true,
            table_id: true,
            booking_date: true,
            slot: true,
            tables: {
                select: {
                    table_code: true,
                    lab_id: true,
                    labs: {
                        select: {
                            lab_name: true
                        }
                    }
                }
            }
        },
        orderBy: { booking_date: 'desc' }
    })

    return c.json({ success: true, data: myBookings })
})

// 4. ยกเลิกจอง
app.delete('/cancel/:booking_id', authMiddleware, async (c) => {
    const userId = c.get('userId')
    const bookingId = Number.parseInt(c.req.param('booking_id'))

    // เช็คก่อนว่าเป็นเจ้าของ booking หรือไม่
    const booking = await prisma.bookings.findUnique({
        where: { booking_id: bookingId }
    })

    if (booking?.user_id !== userId) {
        return c.json({ success: false, error: 'Not authorized or not found' }, 403)
    }

    await prisma.bookings.delete({
        where: { booking_id: bookingId }
    })

    return c.json({ success: true, message: 'Booking cancelled' })
})

export { app as reservationService }