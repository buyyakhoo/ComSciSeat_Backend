import { describe, it, expect, vi, beforeEach } from 'vitest'

vi.mock('../../shared/database/prisma.js', () => ({
    prisma: {
        users: {
            findUnique: vi.fn(),
            upsert:     vi.fn(),
        }
    }
}))

// mock google-auth-library ป้องกัน verifyGoogleToken ต่อ Google จริง
vi.mock('google-auth-library', () => ({
    OAuth2Client: vi.fn().mockImplementation(function() {
        return {
            verifyIdToken: vi.fn().mockResolvedValue({
                getPayload: () => ({
                sub: '12345', email: 'test001@kmitl.ac.th', name: 'สมชาย'
                })
            })
        }
    })
}))

vi.mock('../../shared/middleware/auth.js', () => ({
    authMiddleware: vi.fn(async (c: any, next: any) => {
        c.set('userId', 'test001')
        c.set('userType', 'student')
        await next()
    })
}))

import { prisma } from '../../shared/database/prisma.js'
import { userService } from '../../routes/user.routes.js'

describe('GET /user', () => {
    it('should require admin role for listing users', async () => {
        // Act
        const res = await userService.request('/')

        // Assert
        expect(res.status).toBe(403)
        const body = await res.json()
        expect(body.error).toBe('Unauthorized')
    })
})

// ════════════════════════════════════════════════════════
describe('GET /user/:student_id', () => {
    beforeEach(() => vi.clearAllMocks())

    it('should return user when found', async () => {
        // Arrange
        vi.mocked(prisma.users.findUnique).mockResolvedValue({
            user_id: 'test001', name: 'สมชาย',
            email: 'test001@kmitl.ac.th', user_type: 'student'
        })

        // Act
        const res = await userService.request('/test001', {
            headers: { 'Authorization': 'Bearer test-token' }
        })

        // Assert
        expect(res.status).toBe(200)
        const body = await res.json()
        expect(body.user_id).toBe('test001')
        expect(body.success).toBe(true)
    })

    it('should return 404 when user not found', async () => {
        // Arrange
        vi.mocked(prisma.users.findUnique).mockResolvedValue(null)

        // Act
        const res = await userService.request('/notexist', {
            headers: { 'Authorization': 'Bearer test-token' }
        })

        // Assert
        expect(res.status).toBe(404)
        const body = await res.json()
        expect(body.success).toBe(false)
        expect(body.error).toBe('User not found')
    })
})

// ════════════════════════════════════════════════════════

describe('POST /user/verify-or-create', () => {
    beforeEach(() => vi.clearAllMocks())

    it('should return 401 when no Bearer token provided', async () => {
        // Act — ไม่ส่ง Authorization header
        const res = await userService.request('/verify-or-create', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ user_id: 'test001', name: 'สมชาย', email: 'test001@kmitl.ac.th' })
        })

        // Assert
        expect(res.status).toBe(401)
        const body = await res.json()
        expect(body.error).toBe('No Google token provided')
    })

    it('should upsert user and return token when Google token is valid', async () => {
        // Arrange
        vi.mocked(prisma.users.upsert).mockResolvedValue({
            user_id: 'test001', name: 'สมชาย',
            email: 'test001@kmitl.ac.th', user_type: 'student'
        })
        vi.mocked(prisma.users.findUnique).mockResolvedValue({
            user_id: 'test001', name: 'สมชาย',
            email: 'test001@kmitl.ac.th', user_type: 'student'
        })

        // Act
        const res = await userService.request('/verify-or-create', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': 'Bearer fake-google-token'
                // google-auth-library ถูก mock แล้ว จึงผ่านได้
            },
            body: JSON.stringify({
                user_id: 'test001', name: 'สมชาย', email: 'test001@kmitl.ac.th'
            })
        })

        // Assert
        expect(res.status).toBe(200)
        const body = await res.json()
        expect(body.success).toBe(true)
        expect(body.token).toBeDefined()
        expect(body.user.user_id).toBe('test001')
    })
})
