import { Hono } from 'hono'
import { prisma } from '../shared/database/prisma.js'
import { authMiddleware } from '../shared/middleware/auth.js'
import { cancelationTemplate, reservationTemplate } from '../lib/shared/utils/mail.js'
import { isPastDate } from '../lib/shared/utils/time.js'
import { Resend } from 'resend'

const app = new Hono()
const resend = new Resend(process.env.RESEND_API_KEY)

app.get('/check-table-availability', authMiddleware, async (c) => {
    const labId = Number.parseInt(c.req.query('lab_id') || '0')
    const dateStr = c.req.query('date') 
    const slot = c.req.query('slot') as 'Morning' | 'Afternoon' | 'Lunch'

    if (!labId || !dateStr || !slot) {
        return c.json({ error: 'Missing parameters' }, 400)
    }

    const requestDate = new Date(dateStr)
    const dayOfWeek = requestDate.getDay() 

    const isSunday = new Date(dateStr).getDay() === 0;
    if (isSunday) {
        return c.json({
            success: true,
            status: 'CLOSED',
            message: 'ห้องแลปได้ปิดทำการในวันอาทิตย์',
            data: []
        })
    }

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

    const tables = await prisma.tables.findMany({
        where: { lab_id: labId },
        include: {
            bookings: {
                where: {
                    booking_date: requestDate,
                    slot: slot
                }
            }
        },
        orderBy: { table_id: 'asc' }
    })

    const tableStatus = tables.map(t => ({
        table_id: t.table_id,
        table_code: t.table_code,
        is_available: t.bookings.length === 0, 
    }))

    const userId = c.get('userId')
    const userExistingBooking = await prisma.bookings.findFirst({
        where: {
            user_id: userId,
            booking_date: requestDate,
            slot: slot,
        }
    })
    const isReserved = userExistingBooking !== null

    return c.json({
        success: true,
        status: 'OPEN',
        isReserved: isReserved,
        data: tableStatus
    })
})

app.get('/booking-stats', authMiddleware, async (c) => {
    const userId = c.get('userId')
    const today = new Date()
    today.setHours(0, 0, 0, 0)

    const [userUpcoming, userTotal, allTotal] = await Promise.all([
        prisma.bookings.count({
            where: {
                user_id: userId,
                booking_date: { gte: today }
            }
        }),
        prisma.bookings.count({
            where: {
                user_id: userId
            }
        }),
        prisma.bookings.count()
    ])

    const percentage = allTotal > 0 ? ((userTotal / allTotal) * 100) : 0
    const stats = {
        userUpcoming,
        userTotal,
        allTotal,
        percentage
    }

    return c.json({ success: true, data: stats })
})

app.post('/book', authMiddleware, async (c) => {
    const userId = c.get('userId') 
    const body = await c.req.json()
    const { table_id, table_code, date, slot, lab_id } = body

    if (isPastDate(date)) {
         return c.json({ success: false, error: 'Cannot book a date in the past' }, 400);
    }

    try {
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

        const newBooking = await prisma.bookings.create({
            data: {
                user_id: userId,
                table_id: table_id,
                booking_date: new Date(date),
                slot: slot
            }
        })

        const userInfo = await prisma.users.findUnique({
            where: { user_id: userId },
            select: { email: true, name: true }
        })
        const labInfo = await prisma.labs.findUnique({
            where: { lab_id: lab_id },
            select: { lab_name: true }
        })

        try {
            const { error: emailError } = await resend.emails.send({
                from: `ComSciSeat <${process.env.RESEND_FROM_EMAIL}>`,
                to: `${userInfo?.email}`,
                subject: 'Booking Confirmation',
                html: reservationTemplate(userInfo, labInfo, table_code, newBooking)
            })
            if (emailError) {
                console.error('Failed to send confirmation email:', emailError)
            }
        } catch (emailError) {
            console.error('Failed to send confirmation email:', emailError)
        }

        return c.json({ success: true, data: newBooking })

    } catch (e) {
        console.error(e)
        return c.json({ success: false, error: 'Booking failed' }, 500)
    }
})

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

app.delete('/cancel/:booking_id', authMiddleware, async (c) => {
    const userId = c.get('userId')
    const bookingId = Number.parseInt(c.req.param('booking_id'))

    const booking = await prisma.bookings.findUnique({
        where: { booking_id: bookingId },
        include: {
            users: true,   
            tables: {     
                include: { 
                    labs: true 
                } 
            }
        }
    })

    if (booking?.user_id !== userId) {
        return c.json({ success: false, error: 'Not authorized or not found' }, 403)
    }

    await prisma.bookings.delete({
        where: { booking_id: bookingId }    
    })

    const userInfo = await prisma.users.findUnique({
        where: { user_id: userId },
        select: { email: true, name: true }
    })

    try {
        const { error: emailError } = await resend.emails.send({
            from: `ComSciSeat <${process.env.RESEND_FROM_EMAIL}>`,
            to: `${userInfo?.email}`,
            subject: 'Booking Cancellation',
            html: cancelationTemplate(userInfo, booking)
        })
        if (emailError) {
            console.error('Failed to send cancellation email:', emailError)
        }
    } catch (error) {
        console.error('Failed to send cancellation email:', error)
    }

    return c.json({ success: true, message: 'Booking cancelled' })
})

export { app as reservationService }