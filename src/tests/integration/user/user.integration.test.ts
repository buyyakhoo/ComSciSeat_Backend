import { describe, it, expect, beforeAll, afterAll, beforeEach } from 'vitest'
import { userService } from '../../../routes/user.routes.js'
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

