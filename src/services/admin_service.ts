import { Hono } from 'hono'
import { prisma } from '../shared/database/prisma.js'
import { authMiddleware } from '../shared/middleware/auth.js'

const app = new Hono()

app.get('/booking-stats-admin', authMiddleware, async (c) => {
    if (c.get('userType') !== 'admin') {
        return c.json({ success: false, error: 'Unauthorized' }, 403)
    }
    
    const today = new Date()
    today.setHours(0, 0, 0, 0)
    const tomorrow = new Date(today)
    tomorrow.setDate(tomorrow.getDate() + 1)
    const yesterday = new Date(today)
    yesterday.setDate(yesterday.getDate() - 1)

    const [bookingsToday, bookingsYesterday, allBookings, totalLabs, totalTables, totalUsers] = await Promise.all([
        prisma.bookings.count({
            where: {
                booking_date: { gte: today, lt: tomorrow }
            }
        }),
        prisma.bookings.count({
            where: {
                booking_date: { gte: yesterday, lt: today }
            }
        }),
        prisma.bookings.count(),
        prisma.labs.count(),
        prisma.tables.count(),
        prisma.users.count()
    ])

    let bookingRateToday: number
    if (bookingsYesterday > 0) {
        bookingRateToday = ((bookingsToday - bookingsYesterday) / bookingsYesterday) * 100
    } else if (bookingsToday > 0) {
        bookingRateToday = 100
    } else {
        bookingRateToday = 0
    }

    return c.json({
        success: true,
        data: {
            bookingsToday,
            bookingsYesterday,
            bookingRateToday: Math.round(bookingRateToday * 10) / 10,
            allBookings,
            totalLabs,
            totalTables,
            totalUsers
        }
    })
})

app.get('/labs', authMiddleware, async (c) => {
    if (c.get('userType') !== 'admin') {
        return c.json({ success: false, error: 'Unauthorized' }, 403)
    }
    const labs = await prisma.labs.findMany({
        orderBy: { lab_id: 'asc' }
    })
    return c.json({ success: true, data: labs })
})

app.delete('/labs/:lab_id', authMiddleware, async (c) => {
    if (c.get('userType') !== 'admin') {
        return c.json({ success: false, error: 'Unauthorized' }, 403)
    }
    const labId = Number(c.req.param('lab_id'))
    const existing = await prisma.labs.findUnique({
        where: { lab_id: labId }
    })

    if (!existing) {
        return c.json({ success: false, error: 'ไม่พบห้องปฏิบัติการ' }, 404)
    }
    
    await prisma.labs.delete({
        where: { lab_id: labId }
    })

    return c.json({ success: true, message: 'ลบห้องปฏิบัติการสำเร็จ' })
})

app.post('/add_lab', authMiddleware, async (c) => {
    if (c.get('userType') !== 'admin') {
        return c.json({ success: false, error: 'Unauthorized' }, 403)
    }
    const body = await c.req.json()
    const { lab_name } = body
    const existing = await prisma.labs.findUnique({
        where: { lab_name: lab_name }
    })
    if (existing) {
        return c.json({ success: false, error: 'ห้องปฏิบัติการนี้มีอยู่แล้ว' }, 409)
    }
    const newLab = await prisma.labs.create({
        data: { lab_name }
    })
    return c.json({ success: true, data: newLab })
})

app.get('/tables', authMiddleware, async (c) => {
    if (c.get('userType') !== 'admin') {
        return c.json({ success: false, error: 'Unauthorized' }, 403)
    }
    const tables = await prisma.tables.findMany({
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
    return c.json({ success: true, data: tables })
})

app.delete('/tables/:table_id', authMiddleware, async (c) => {
    if (c.get('userType') !== 'admin') {
        return c.json({ success: false, error: 'Unauthorized' }, 403)
    }
    const tableId = Number(c.req.param('table_id'))
    const existing = await prisma.tables.findUnique({
        where: { table_id: tableId }
    })
    if (!existing) {
        return c.json({ success: false, error: 'ไม่พบโต๊ะ' }, 404)
    }
    await prisma.tables.delete({
        where: { table_id: tableId }
    })
    return c.json({ success: true, message: 'ลบโต๊ะสำเร็จ' })
})

app.post('/add_table', authMiddleware, async (c) => {
    if (c.get('userType') !== 'admin') {
        return c.json({ success: false, error: 'Unauthorized' }, 403)
    }
    const body = await c.req.json()
    const { labId, table_code } = body
    const existing = await prisma.tables.findFirst({
        where: {
            lab_id: Number(labId),
            table_code: table_code
        }
    })
    if (existing) {
        return c.json({ success: false, error: 'โต๊ะนี้มีอยู่แล้วในห้องปฏิบัติการนี้' }, 409)
    }
    const newTable = await prisma.tables.create({
        data: {
            lab_id: Number(labId),
            table_code: table_code
        }
    })
    return c.json({ success: true, data: newTable })
})



app.get('/class_schedule', authMiddleware, async (c) => {
    if (c.get('userType') !== 'admin') {
        return c.json({ success: false, error: 'Unauthorized' }, 403)
    }

    const schedules = await prisma.class_schedule.findMany({
        include: {
            labs: {
                select: { lab_name: true }
            }
        },
        orderBy: [
            { lab_id: 'asc' },
            { day_of_week: 'asc' },
            { slot: 'asc' }
        ]
    })

    return c.json({ success: true, data: schedules })
})

app.delete('/class_schedule/:class_id', authMiddleware, async (c) => {
    if (c.get('userType') !== 'admin') {
        return c.json({ success: false, error: 'Unauthorized' }, 403)
    }

    const classId = Number(c.req.param('class_id'))

    const existing = await prisma.class_schedule.findUnique({
        where: { class_id: classId }
    })

    if (!existing) {
        return c.json({ success: false, error: 'ไม่พบตารางเรียน' }, 404)
    }

    await prisma.class_schedule.delete({
        where: { class_id: classId }
    })

    return c.json({ success: true, message: 'ลบตารางเรียนสำเร็จ' })
})

app.post('/add_class_schedule', authMiddleware, async (c) => {
    if (c.get('userType') !== 'admin') {
        return c.json({ success: false, error: 'Unauthorized' }, 403)
    }

    const body = await c.req.json()
    const { labId, day_of_week, slot,subject } = body

    const existing = await prisma.class_schedule.findFirst({
        where: {
            lab_id: Number(labId),
            day_of_week: Number(day_of_week),
            slot: slot
        }
    })

    if (existing) {
        return c.json({ success: false, error: 'ตารางเรียนนี้มีอยู่แล้ว' }, 409)
    }

    const newSchedule = await prisma.class_schedule.create({
        data: {
            lab_id: Number(labId),
            day_of_week: Number(day_of_week),
            slot: slot,
            subject: subject
        }
    })

    return c.json({ success: true, data: newSchedule })

})

app.get('/users', authMiddleware, async (c) => {
    if (c.get('userType') !== 'admin') {
        return c.json({ success: false, error: 'Unauthorized' }, 403)
    }

    const users = await prisma.users.findMany({
        select: {
            user_id: true,
            name: true,
            email: true,
            user_type: true,
            _count: {
                select: { bookings: true }
            }
        },
        orderBy: { user_id: 'asc' }
    })

    return c.json({ success: true, data: users })
})

app.patch('/users/:user_id', authMiddleware, async (c) => {
    if (c.get('userType') !== 'admin') {
        return c.json({ success: false, error: 'Unauthorized' }, 403)
    }
    const userId = c.req.param('user_id')
    const body = await c.req.json()
    const { userType } = body
    
    if (!['student', 'admin'].includes(userType)) {
        return c.json({ success: false, error: 'Invalid user type' }, 400)
    }

    const updatedUser = await prisma.users.update({
        where: { user_id: userId },
        data: { user_type: userType }
    })

    return c.json({ success: true, data: updatedUser })
})

export { app as adminService }