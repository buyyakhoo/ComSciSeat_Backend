
import { Hono } from 'hono'
import { OAuth2Client } from 'google-auth-library'
import jwt from 'jsonwebtoken'
import dotenv from 'dotenv'
import { upsertUserFromGoogle } from '../services/auth.service.js'

dotenv.config()

const JWT_SECRET = process.env.JWT_SECRET
const AUTH_GOOGLE_ID = process.env.AUTH_GOOGLE_ID
const AUTH_GOOGLE_SECRET = process.env.AUTH_GOOGLE_SECRET

if (!JWT_SECRET || !AUTH_GOOGLE_ID || !AUTH_GOOGLE_SECRET) {
  throw new Error('JWT_SECRET, AUTH_GOOGLE_ID, and AUTH_GOOGLE_SECRET must be defined')
}

const oauth2Client = new OAuth2Client(
  AUTH_GOOGLE_ID,
  AUTH_GOOGLE_SECRET,
  'http://localhost:5173/auth/callback'
)

const app = new Hono()

app.get('/google/authorize', async (c) => {
  try {
    const redirectUri = c.req.query('redirect_uri') || 'http://localhost:5173/auth/callback'

    const authUrl = oauth2Client.generateAuthUrl({
      access_type: 'offline',
      scope: ['openid', 'email', 'profile'],
      redirect_uri: redirectUri,
    })

    return c.json({ success: true, authUrl })
  } catch (error) {
    console.error('Error generating auth URL:', error)
    return c.json({ success: false, error: 'Failed to generate auth URL' }, 500)
  }
})

app.post('/google/callback', async (c) => {
  try {
    const body = await c.req.json()
    const { code, redirectUri } = body

    if (!code) {
      return c.json({ success: false, error: 'No authorization code provided' }, 400)
    }

    oauth2Client.setCredentials({})

    const { tokens } = await oauth2Client.getToken({
      code,
      redirect_uri: redirectUri || 'http://localhost:5173/auth/callback',
    })

    const idToken = tokens.id_token
    if (!idToken) {
      return c.json({ success: false, error: 'No ID token received' }, 400)
    }

    const ticket = await oauth2Client.verifyIdToken({
      idToken,
      audience: AUTH_GOOGLE_ID,
    })

    const googlePayload = ticket.getPayload()
    if (!googlePayload) {
      console.error('No payload from Google token')
      return c.json({ success: false, error: 'Failed to verify token' }, 400)
    }

    const email = googlePayload.email
    console.log('Google payload email:', email)
    console.log('Email domain check:', email?.endsWith('@kmitl.ac.th'))

    if (!email?.endsWith('@kmitl.ac.th')) {
      console.error('Email not authorized:', email)
      return c.json({ success: false, error: 'Email not authorized' }, 403)
    }

    const username = email.split('@')[0]
    const student_id = username.substring(0, 8)

    console.log('Google Payload:', {
      email: googlePayload.email,
      name: googlePayload.name,
      picture: googlePayload.picture
    })

    const user = await upsertUserFromGoogle(
      student_id,
      email,
      googlePayload.name || 'Unknown User'
    )

    console.log('User created/updated:', user)

    const sessionToken = jwt.sign(
      {
        sub: user.user_id
      },
      JWT_SECRET,
      { expiresIn: '7d' }
    )

    return c.json({
      success: true,
      token: sessionToken,
      user: {
        user_id: user.user_id,
        email: user.email,
        name: user.name,
        picture: googlePayload.picture,
        user_type: user.user_type,
      },
    })
  } catch (error) {
    console.error('OAuth callback error:', error)
    return c.json({ success: false, error: 'Authentication failed' }, 500)
  }
})

export { app as authService }
