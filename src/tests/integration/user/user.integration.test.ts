import { describe, it, expect, beforeAll, afterAll, beforeEach } from 'vitest'
import { userService } from '../../../services/user_service.js'
import { getPrismaTest, setupTestDatabase, cleanDatabase } from '../helpers/setup.js'
import { seedBaseData, generateToken } from '../helpers/seed.js'

let testData: Awaited<ReturnType<typeof seedBaseData>>
let studentToken: string

beforeAll(async () => { await setupTestDatabase() })
afterAll(async () => { await cleanDatabase(); await getPrismaTest().$disconnect() })
beforeEach(async () => {
    await cleanDatabase()
    testData = await seedBaseData()
    studentToken = generateToken('test001', 'student')
})

describe('Integration: GET /user', () => {

    it('should return service info on root', async () => {
        const res = await userService.request('/')

        expect(res.status).toBe(200)
        const body = await res.json()
        expect(body.message).toContain('User Service')
    })
})

describe('Integration: GET /user/:student_id', () => {

    it('should return user by student id', async () => {
        const res = await userService.request('/test001', {
            headers: { 'Authorization': `Bearer ${studentToken}` }
        })

        expect(res.status).toBe(200)
        const body = await res.json()
        expect(body.user_id).toBe('test001')
        expect(body.email).toBe('test001@kmitl.ac.th')
        expect(body.success).toBe(true)
    })

    it('should return 404 when student id not found', async () => {
        const res = await userService.request('/notexist', {
            headers: { 'Authorization': `Bearer ${studentToken}` }
        })

        expect(res.status).toBe(404)
        const body = await res.json()
        expect(body.success).toBe(false)
    })
})

describe('Integration: POST /user/get-token', () => {

    it('should return token for valid KMITL email', async () => {
        const res = await userService.request('/get-token', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'X-Internal-Secret': process.env.INTERNAL_SECRET!
            },
            body: JSON.stringify({ email: 'test001@kmitl.ac.th' })
        })

        expect(res.status).toBe(200)
        const body = await res.json()
        expect(body.success).toBe(true)
        expect(body.token).toBeDefined()
        expect(typeof body.token).toBe('string')
    })

    it('should return 401 when INTERNAL_SECRET is wrong', async () => {
        const res = await userService.request('/get-token', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'X-Internal-Secret': 'wrong-secret'
            },
            body: JSON.stringify({ email: 'test001@kmitl.ac.th' })
        })

        expect(res.status).toBe(401)
    })

    it('should return 401 when email is not KMITL', async () => {
        const res = await userService.request('/get-token', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'X-Internal-Secret': process.env.INTERNAL_SECRET!
            },
            body: JSON.stringify({ email: 'hacker@gmail.com' })
        })

        expect(res.status).toBe(401)
        const body = await res.json()
        expect(body.error).toBe('Invalid email')
    })

    it('should return 404 when user does not exist in DB', async () => {
        const res = await userService.request('/get-token', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'X-Internal-Secret': process.env.INTERNAL_SECRET!
            },
            body: JSON.stringify({ email: '99999999@kmitl.ac.th' }) 
        })

        expect(res.status).toBe(404)
    })
})

it('should return valid JWT token for existing user', async () => {
    const res = await userService.request('/get-token', {
        method: 'POST',
        headers: {
            'Content-Type': 'application/json',
            'X-Internal-Secret': process.env.INTERNAL_SECRET!
        },
        body: JSON.stringify({ email: 'test001@kmitl.ac.th' })
    })

    expect(res.status).toBe(200)
    const body = await res.json()
    expect(body.success).toBe(true)
    expect(typeof body.token).toBe('string')
    const decoded = JSON.parse(
        Buffer.from(body.token.split('.')[1], 'base64').toString()
    )
    expect(decoded.user_id).toBe('test001')
    expect(decoded.user_type).toBe('student')
})