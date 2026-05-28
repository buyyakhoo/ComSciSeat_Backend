import { describe, it, expect, vi, beforeEach } from 'vitest'

const { mockGenerateAuthUrl, mockSetCredentials, mockGetToken, mockVerifyIdToken } = vi.hoisted(() => {
    return {
        mockGenerateAuthUrl: vi.fn(),
        mockSetCredentials: vi.fn(),
        mockGetToken: vi.fn(),
        mockVerifyIdToken: vi.fn(),
    }
})

vi.mock('../../shared/database/prisma.js', () => ({
    prisma: {
        users: {
            upsert: vi.fn(),
        }
    }
}))

vi.mock('google-auth-library', () => ({
    OAuth2Client: vi.fn().mockImplementation(function() {
        return {
            generateAuthUrl: mockGenerateAuthUrl,
            setCredentials: mockSetCredentials,
            getToken: mockGetToken,
            verifyIdToken: mockVerifyIdToken,
        }
    })
}))

vi.mock('jsonwebtoken', () => ({
    default: {
        sign: vi.fn(() => 'fake-session-token-12345'),
    }
}))

import { authService } from '../../routes/auth.routes.js'
import { prisma } from '../../shared/database/prisma.js'
import jwt from 'jsonwebtoken'

describe('Auth Service', () => {
    beforeEach(() => {
        vi.clearAllMocks()
        mockGenerateAuthUrl.mockReset()
        mockSetCredentials.mockReset()
        mockGetToken.mockReset()
        mockVerifyIdToken.mockReset()
    })

    describe('GET /google/authorize', () => {
        it('should generate auth URL with default redirect URI', async () => {
            // Arrange
            const mockAuthUrl = 'https://accounts.google.com/o/oauth2/v2/auth?...'
            mockGenerateAuthUrl.mockReturnValue(mockAuthUrl)

            // Act
            const res = await authService.request('/google/authorize')

            // Assert
            expect(res.status).toBe(200)
            const body = await res.json()
            expect(body.success).toBe(true)
            expect(body.authUrl).toBe(mockAuthUrl)
        })

        it('should generate auth URL with custom redirect URI from query param', async () => {
            // Arrange
            const customRedirectUri = 'http://localhost:3000/callback'
            const mockAuthUrl = 'https://accounts.google.com/o/oauth2/v2/auth?...'
            mockGenerateAuthUrl.mockReturnValue(mockAuthUrl)

            // Act
            const res = await authService.request(`/google/authorize?redirect_uri=${encodeURIComponent(customRedirectUri)}`)

            // Assert
            expect(res.status).toBe(200)
            const body = await res.json()
            expect(body.success).toBe(true)
            expect(body.authUrl).toBe(mockAuthUrl)
        })

        it('should handle errors when generating auth URL', async () => {
            // Arrange
            mockGenerateAuthUrl.mockImplementation(() => {
                throw new Error('Failed to generate URL')
            })

            // Act
            const res = await authService.request('/google/authorize')

            // Assert
            expect(res.status).toBe(500)
            const body = await res.json()
            expect(body.success).toBe(false)
            expect(body.error).toBe('Failed to generate auth URL')
        })
    })

    describe('POST /google/callback', () => {
        it('should return 400 when no code is provided', async () => {
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

        it('should authenticate user and return token on successful callback', async () => {
            // Arrange
            const mockCode = 'auth-code-12345'
            const mockRedirectUri = 'http://localhost:5173/auth/callback'

            mockGetToken.mockResolvedValue({
                tokens: {
                    id_token: 'fake-id-token',
                    access_token: 'fake-access-token'
                }
            })

            mockVerifyIdToken.mockResolvedValue({
                getPayload: () => ({
                    email: 'test001@kmitl.ac.th',
                    name: 'สมชาย'
                })
            })

            vi.mocked(prisma.users.upsert).mockResolvedValue({
                user_id: 'test001',
                email: 'test001@kmitl.ac.th',
                name: 'สมชาย',
                user_type: 'student'
            })

            // Act
            const res = await authService.request('/google/callback', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ code: mockCode, redirectUri: mockRedirectUri })
            })

            // Assert
            expect(res.status).toBe(200)
            const body = await res.json()
            expect(body.success).toBe(true)
            expect(body.token).toBe('fake-session-token-12345')
            expect(body.user.user_id).toBe('test001')
            expect(body.user.email).toBe('test001@kmitl.ac.th')
            expect(body.user.name).toBe('สมชาย')
            expect(body.user.user_type).toBe('student')
        })

        it('should extract student_id (first 8 chars of username) correctly', async () => {
            // Arrange
            const mockCode = 'auth-code-12345'

            mockGetToken.mockResolvedValue({
                tokens: { id_token: 'fake-id-token' }
            })

            mockVerifyIdToken.mockResolvedValue({
                getPayload: () => ({
                    email: 'test001extra@kmitl.ac.th',
                    name: 'Test User'
                })
            })

            vi.mocked(prisma.users.upsert).mockResolvedValue({
                user_id: 'test001e',
                email: 'test001extra@kmitl.ac.th',
                name: 'Test User',
                user_type: 'student'
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
        })

        it('should return 400 when no ID token is received', async () => {
            // Arrange
            const mockCode = 'auth-code-12345'

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

        it('should return 400 when ID token verification returns null payload', async () => {
            // Arrange
            const mockCode = 'auth-code-12345'

            mockGetToken.mockResolvedValue({
                tokens: { id_token: 'fake-id-token' }
            })

            mockVerifyIdToken.mockResolvedValue({
                getPayload: () => null
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
            expect(body.error).toBe('Failed to verify token')
        })

        it('should return 403 when email is not from kmitl.ac.th domain', async () => {
            // Arrange
            const mockCode = 'auth-code-12345'

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
        })

        it('should use default redirect URI when not provided', async () => {
            // Arrange
            const mockCode = 'auth-code-12345'

            mockGetToken.mockResolvedValue({
                tokens: { id_token: 'fake-id-token' }
            })

            mockVerifyIdToken.mockResolvedValue({
                getPayload: () => ({
                    email: 'test001@kmitl.ac.th',
                    name: 'Test'
                })
            })

            vi.mocked(prisma.users.upsert).mockResolvedValue({
                user_id: 'test001',
                email: 'test001@kmitl.ac.th',
                name: 'Test',
                user_type: 'student'
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
        })

        it('should handle OAuth token retrieval errors', async () => {
            // Arrange
            const mockCode = 'invalid-code'

            mockGetToken.mockRejectedValue(new Error('Invalid code'))

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

        it('should handle token verification errors', async () => {
            // Arrange
            const mockCode = 'auth-code-12345'

            mockGetToken.mockResolvedValue({
                tokens: { id_token: 'fake-id-token' }
            })

            mockVerifyIdToken.mockRejectedValue(new Error('Token expired'))

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

        it('should handle database upsert errors', async () => {
            // Arrange
            const mockCode = 'auth-code-12345'

            mockGetToken.mockResolvedValue({
                tokens: { id_token: 'fake-id-token' }
            })

            mockVerifyIdToken.mockResolvedValue({
                getPayload: () => ({
                    email: 'test001@kmitl.ac.th',
                    name: 'Test'
                })
            })

            vi.mocked(prisma.users.upsert).mockRejectedValue(new Error('Database error'))

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

        it('should use user name from Google payload or fallback to Unknown User', async () => {
            // Arrange
            const mockCode = 'auth-code-12345'

            mockGetToken.mockResolvedValue({
                tokens: { id_token: 'fake-id-token' }
            })

            mockVerifyIdToken.mockResolvedValue({
                getPayload: () => ({
                    email: 'test002@kmitl.ac.th',
                    name: null
                })
            })

            vi.mocked(prisma.users.upsert).mockResolvedValue({
                user_id: 'test002',
                email: 'test002@kmitl.ac.th',
                name: 'Unknown User',
                user_type: 'student'
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
        })

        it('should call jwt.sign with correct payload and expiration', async () => {
            // Arrange
            const mockCode = 'auth-code-12345'

            mockGetToken.mockResolvedValue({
                tokens: { id_token: 'fake-id-token' }
            })

            mockVerifyIdToken.mockResolvedValue({
                getPayload: () => ({
                    email: 'test003@kmitl.ac.th',
                    name: 'Test User'
                })
            })

            vi.mocked(prisma.users.upsert).mockResolvedValue({
                user_id: 'test003',
                email: 'test003@kmitl.ac.th',
                name: 'Test User',
                user_type: 'student'
            })

            // Act
            const res = await authService.request('/google/callback', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ code: mockCode })
            })

            // Assert
            expect(res.status).toBe(200)
            expect(vi.mocked(jwt.sign)).toHaveBeenCalledWith(
                expect.objectContaining({
                    sub: 'test003'
                }),
                expect.any(String),
                expect.objectContaining({ expiresIn: '7d' })
            )
        })
    })
})
