import { describe, it, expect, beforeAll, afterAll, beforeEach } from 'vitest'
import { tableService } from '../../../services/table_service.js'
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

describe('Integration: GET /tables', () => {

    it('should return all tables from DB', async () => {
        const res = await tableService.request('/', {
            headers: { 'Authorization': `Bearer ${studentToken}` }
        })

        expect(res.status).toBe(200)
        const body = await res.json()
        expect(body.success).toBe(true)
        expect(body.data).toHaveLength(1)
        expect(body.data[0].table_code).toBe('A01')
    })

    it('should return empty array when no tables exist', async () => {
        await cleanDatabase()

        const res = await tableService.request('/', {
            headers: { 'Authorization': `Bearer ${studentToken}` }
        })

        const body = await res.json()
        expect(body.data).toHaveLength(0)
    })
})

describe('Integration: GET /tables/:table_id', () => {

    it('should return a specific table by id', async () => {
        const res = await tableService.request(`/${testData.table.table_id}`, {
            headers: { 'Authorization': `Bearer ${studentToken}` }
        })

        expect(res.status).toBe(200)
        const body = await res.json()
        expect(body.success).toBe(true)
        expect(body.data.table_code).toBe('A01')
        expect(body.data.lab_id).toBe(testData.lab.lab_id)
    })

    it('should return null data when table not found', async () => {
        const res = await tableService.request('/99999', {
            headers: { 'Authorization': `Bearer ${studentToken}` }
        })

        const body = await res.json()
        expect(body.data).toBeNull()
    })
})