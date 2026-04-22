import { describe, it, expect, beforeAll, afterAll, beforeEach } from 'vitest'
import { labService } from '../../../routes/lab.routes.js'
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

describe('Integration: GET /labs', () => {

    it('should return all labs from DB', async () => {
        const res = await labService.request('/', {
            headers: { 'Authorization': `Bearer ${studentToken}` }
        })

        expect(res.status).toBe(200)
        const body = await res.json()
        expect(body.success).toBe(true)
        expect(body.data).toHaveLength(1)
        expect(body.data[0].lab_name).toBe('Computer Lab 1')
    })

    it('should return empty array when no labs exist', async () => {
        await cleanDatabase()

        const res = await labService.request('/', {
            headers: { 'Authorization': `Bearer ${studentToken}` }
        })

        const body = await res.json()
        expect(body.data).toHaveLength(0)
    })
})

describe('Integration: GET /labs/:lab_id/tables', () => {

    it('should return tables for a specific lab', async () => {
        const res = await labService.request(`/${testData.lab.lab_id}/tables`, {
            headers: { 'Authorization': `Bearer ${studentToken}` }
        })

        expect(res.status).toBe(200)
        const body = await res.json()
        expect(body.success).toBe(true)
        expect(body.data).toHaveLength(1)
        expect(body.data[0].table_code).toBe('A01')
    })

    it('should return empty array when lab has no tables', async () => {
        const emptyLab = await getPrismaTest().labs.create({
            data: { lab_name: 'Empty Lab' }
        })

        const res = await labService.request(`/${emptyLab.lab_id}/tables`, {
            headers: { 'Authorization': `Bearer ${studentToken}` }
        })

        const body = await res.json()
        expect(body.data).toHaveLength(0)
    })
})

describe('Integration: GET /labs/:lab_id/class_schedule', () => {

    it('should return class schedule for a specific lab', async () => {
        await getPrismaTest().class_schedule.create({
        data: {
            lab_id: testData.lab.lab_id,
            day_of_week: 1,
            slot: 'Morning',
            subject: 'Data Structures'
        }
        })

        const res = await labService.request(`/${testData.lab.lab_id}/class_schedule`, {
            headers: { 'Authorization': `Bearer ${studentToken}` }
        })

        expect(res.status).toBe(200)
        const body = await res.json()
        expect(body.data).toHaveLength(1)
        expect(body.data[0].subject).toBe('Data Structures')
    })

    it('should return empty array when no class schedule exists', async () => {
        const res = await labService.request(`/${testData.lab.lab_id}/class_schedule`, {
            headers: { 'Authorization': `Bearer ${studentToken}` }
        })

        const body = await res.json()
        expect(body.data).toHaveLength(0)
    })
})