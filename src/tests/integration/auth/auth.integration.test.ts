import { describe, it, expect, beforeAll, afterAll, beforeEach, vi } from 'vitest'
import { authService } from '../../../routes/auth.routes.js'
import { getPrismaTest, setupTestDatabase, cleanDatabase } from '../helpers/setup.js'

const { mockGenerateAuthUrl, mockGetToken, mockVerifyIdToken } = vi.hoisted(() => {
    return {
        mockGenerateAuthUrl: vi.fn(),
        mockGetToken: vi.fn(),
        mockVerifyIdToken: vi.fn(),
    }
})

vi.mock('google-auth-library', () => ({
    OAuth2Client: vi.fn().mockImplementation(function() {
        return {
            generateAuthUrl: mockGenerateAuthUrl,
            setCredentials: vi.fn(),
            getToken: mockGetToken,
            verifyIdToken: mockVerifyIdToken,
        }
    })
}))

beforeAll(async () => {
    await setupTestDatabase()
})

afterAll(async () => {
    await cleanDatabase()
    await getPrismaTest().$disconnect()
})

beforeEach(async () => {
    await cleanDatabase()
    vi.clearAllMocks()
})

describe('Integration: Auth Service', () => {
    describe('GET /google/authorize', () => {
        it('should return auth URL', async () => {
            // Arrange
            const mockAuthUrl = 'https://accounts.google.com/o/oauth2/v2/auth?client_id=test'
            mockGenerateAuthUrl.mockReturnValue(mockAuthUrl)

            // Act
            const res = await authService.request('/google/authorize')

            // Assert
            expect(res.status).toBe(200)
            const body = await res.json()
            expect(body.success).toBe(true)
            expect(body.authUrl).toBe(mockAuthUrl)
        })

        it('should use custom redirect_uri from query params', async () => {
            // Arrange
            const customRedirectUri = 'http://localhost:3000/callback'
            const mockAuthUrl = 'https://accounts.google.com/o/oauth2/v2/auth?redirect_uri=...'
            mockGenerateAuthUrl.mockReturnValue(mockAuthUrl)

            // Act
            const res = await authService.request(
                `/google/authorize?redirect_uri=${encodeURIComponent(customRedirectUri)}`
            )

            // Assert
            expect(res.status).toBe(200)
            const body = await res.json()
            expect(body.success).toBe(true)
            expect(mockGenerateAuthUrl).toHaveBeenCalled()
        })
    })

    describe('POST /google/callback', () => {
        it('should create new user and return token on successful auth', async () => {
            // Arrange
            const mockCode = 'auth-code-xyz'
            const prisma = getPrismaTest()

            mockGetToken.mockResolvedValue({
                tokens: { id_token: 'fake-id-token' }
            })

            mockVerifyIdToken.mockResolvedValue({
                getPayload: () => ({
                    email: 'newuser@kmitl.ac.th',
                    name: 'New User'
                })
            })

            // Act
            const res = await authService.request('/google/callback', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ code: mockCode })
            })

            // Assert
            expect(res.status).toBe(200)
            const body = await res.json()
            expect(body.success).toBe(true)
            expect(body.token).toBeDefined()
            expect(body.user.user_id).toBe('newuser')
            expect(body.user.email).toBe('newuser@kmitl.ac.th')
            expect(body.user.name).toBe('New User')

            // Verify user was created in database
            const createdUser = await prisma.users.findUnique({
                where: { user_id: 'newuser' }
            })
            expect(createdUser).toBeDefined()
            expect(createdUser?.email).toBe('newuser@kmitl.ac.th')
            expect(createdUser?.user_type).toBe('student')
        })

        it('should update existing user on re-authentication', async () => {
            // Arrange
            const prisma = getPrismaTest()
            const mockCode = 'auth-code-abc'

            // Create initial user
            await prisma.users.create({
                data: {
                    user_id: 'test001',
                    email: 'test001@kmitl.ac.th',
                    name: 'Old Name',
                    user_type: 'student'
                }
            })

            mockGetToken.mockResolvedValue({
                tokens: { id_token: 'fake-id-token' }
            })

            mockVerifyIdToken.mockResolvedValue({
                getPayload: () => ({
                    email: 'test001@kmitl.ac.th',
                    name: 'Updated Name'
                })
            })

            // Act
            const res = await authService.request('/google/callback', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ code: mockCode })
            })

            // Assert
            expect(res.status).toBe(200)
            const body = await res.json()
            expect(body.success).toBe(true)
            expect(body.user.name).toBe('Updated Name')

            // Verify user was updated in database
            const updatedUser = await prisma.users.findUnique({
                where: { user_id: 'test001' }
            })
            expect(updatedUser?.name).toBe('Updated Name')
        })

        it('should reject non-kmitl.ac.th email addresses', async () => {
            // Arrange
            const mockCode = 'auth-code-xyz'

            mockGetToken.mockResolvedValue({
                tokens: { id_token: 'fake-id-token' }
            })

            mockVerifyIdToken.mockResolvedValue({
                getPayload: () => ({
                    email: 'attacker@gmail.com',
                    name: 'Attacker'
                })
            })

            // Act
            const res = await authService.request('/google/callback', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ code: mockCode })
            })

            // Assert
            expect(res.status).toBe(403)
            const body = await res.json()
            expect(body.success).toBe(false)
            expect(body.error).toBe('Email not authorized')

            // Verify no user was created
            const prisma = getPrismaTest()
            const createdUser = await prisma.users.findUnique({
                where: { user_id: 'attacker' }
            })
            expect(createdUser).toBeNull()
        })

        it('should reject requests without authorization code', async () => {
            // Act
            const res = await authService.request('/google/callback', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ redirectUri: 'http://localhost:5173/auth/callback' })
            })

            // Assert
            expect(res.status).toBe(400)
            const body = await res.json()
            expect(body.success).toBe(false)
            expect(body.error).toBe('No authorization code provided')
        })

        it('should handle missing ID token from OAuth provider', async () => {
            // Arrange
            const mockCode = 'auth-code-xyz'

            mockGetToken.mockResolvedValue({
                tokens: { access_token: 'fake-access-token' }
            })

            // Act
            const res = await authService.request('/google/callback', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ code: mockCode })
            })

            // Assert
            expect(res.status).toBe(400)
            const body = await res.json()
            expect(body.success).toBe(false)
            expect(body.error).toBe('No ID token received')
        })

        it('should handle token verification failures', async () => {
            // Arrange
            const mockCode = 'invalid-code'

            mockGetToken.mockResolvedValue({
                tokens: { id_token: 'invalid-token' }
            })

            mockVerifyIdToken.mockRejectedValue(new Error('Invalid token'))

            // Act
            const res = await authService.request('/google/callback', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ code: mockCode })
            })

            // Assert
            expect(res.status).toBe(500)
            const body = await res.json()
            expect(body.success).toBe(false)
            expect(body.error).toBe('Authentication failed')
        })

        it('should extract 8-character student_id from email username', async () => {
            // Arrange
            const mockCode = 'auth-code-xyz'
            const prisma = getPrismaTest()

            mockGetToken.mockResolvedValue({
                tokens: { id_token: 'fake-id-token' }
            })

            mockVerifyIdToken.mockResolvedValue({
                getPayload: () => ({
                    email: 'test001234@kmitl.ac.th',
                    name: 'Test User'
                })
            })

            // Act
            const res = await authService.request('/google/callback', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ code: mockCode })
            })

            // Assert
            expect(res.status).toBe(200)
            const body = await res.json()
            expect(body.user.user_id).toBe('test0012')

            // Verify correct student_id in database
            const user = await prisma.users.findUnique({
                where: { user_id: 'test0012' }
            })
            expect(user).toBeDefined()
            expect(user?.email).toBe('test001234@kmitl.ac.th')
        })

        it('should return valid JWT token with correct claims', async () => {
            // Arrange
            const mockCode = 'auth-code-xyz'

            mockGetToken.mockResolvedValue({
                tokens: { id_token: 'fake-id-token' }
            })

            mockVerifyIdToken.mockResolvedValue({
                getPayload: () => ({
                    email: 'tokentest@kmitl.ac.th',
                    name: 'Token Test'
                })
            })

            // Act
            const res = await authService.request('/google/callback', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ code: mockCode })
            })

            // Assert
            expect(res.status).toBe(200)
            const body = await res.json()
            expect(body.success).toBe(true)
            expect(body.token).toBeDefined()

            // Token should be a valid JWT (3 parts separated by dots)
            const tokenParts = body.token.split('.')
            expect(tokenParts).toHaveLength(3)
        })

        it('should handle user with null name from OAuth provider', async () => {
            // Arrange
            const mockCode = 'auth-code-xyz'
            const prisma = getPrismaTest()

            mockGetToken.mockResolvedValue({
                tokens: { id_token: 'fake-id-token' }
            })

            mockVerifyIdToken.mockResolvedValue({
                getPayload: () => ({
                    email: 'noname@kmitl.ac.th',
                    name: null
                })
            })

            // Act
            const res = await authService.request('/google/callback', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ code: mockCode })
            })

            // Assert
            expect(res.status).toBe(200)
            const body = await res.json()
            expect(body.user.name).toBe('Unknown User')

            // Verify fallback name in database
            const user = await prisma.users.findUnique({
                where: { user_id: 'noname' }
            })
            expect(user?.name).toBe('Unknown User')
        })
    })
})
