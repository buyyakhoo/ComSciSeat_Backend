import { Hono } from 'hono'
import { prisma } from '../shared/database/prisma.js';
import jwt from 'jsonwebtoken'
import dotenv from 'dotenv'
import { OAuth2Client } from 'google-auth-library';

import { authMiddleware, type AuthVariables } from '../shared/middleware/auth.js';

dotenv.config();

const JWT_SECRET = process.env.JWT_SECRET

if (!JWT_SECRET) {
    throw new Error('JWT_SECRET is not defined in environment variables');
}

const client = new OAuth2Client(process.env.AUTH_GOOGLE_ID);

async function verifyGoogleToken(token: string) {
  const ticket = await client.verifyIdToken({
    idToken: token,
    audience: process.env.AUTH_GOOGLE_ID,
  });
  return ticket.getPayload();
}

const app = new Hono<{ Variables: AuthVariables }>()

app.get('/', (c) => {
    return c.json({ 
        message: 'User Service is running',
        endpoints: {
            verifyOrCreate: 'POST /verify-or-create',
            getUser: 'GET /user/:student_id',
            getProfile: 'GET /profile (requires auth)'
        }
    })
})

app.post('/verify-or-create', async (c) => {
    try {
        const authHeader = c.req.header('Authorization');
        if (!authHeader?.startsWith('Bearer ')) {
            return c.json({ success: false, error: 'No Google token provided' }, 401);
        }

        const googleToken = authHeader.split(' ')[1];
        const googleUser = await verifyGoogleToken(googleToken);
        if (!googleUser) {
            return c.json({ success: false, error: 'Invalid Google token' }, 401);
        }

        const body = await c.req.json()

        console.log('OAuth verification request from:', body.email);
        
        // UPSERT: INSERT if not exists, UPDATE if exists
        const user = await prisma.users.upsert({
            where: {
                user_id: body.user_id
            },
            update: {
                name: body.name
            },
            create: {
                user_id: body.user_id,
                name: body.name,
                email: body.email,
                user_type: 'student'
            }
        });

        // now fetch with join Role
        const userFull = await prisma.users.findUnique({
            where: { user_id: user.user_id },
        });

        // create JWT Token (like key card)
        const token = jwt.sign(
            {
                user_id: user.user_id,
                email: user.email,
                user_type: userFull?.user_type
            },
            JWT_SECRET,  
            { expiresIn: '7d' }
        );
        
        return c.json({
            success: true,
            message: 'User authenticated successfully',
            token: token, 
            user: {
                user_id: user.user_id,
                email: user.email,
                name: user.name,
                user_type: userFull?.user_type
            }
        }, 200)
        
    } catch (error) {
        console.error('Error:', error)
        return c.json({
            success: false,
            error: 'Failed to process request'
        }, 500)
    }
})

app.get('/user/:student_id', authMiddleware, async (c) => {
    const student_id = c.req.param('student_id')
    
    console.log(`[PUBLIC] Fetching user with ID: ${student_id}`)

    const user = await prisma.users.findUnique({
        where: { user_id: student_id },
    })

    if (!user) {
        return c.json({ error: 'User not found', success: false }, 404)
    }
    return c.json({ ...user, success: true }, 200)
})

// Protected endpoint
app.get('/profile', authMiddleware, async (c) => {
    const userId = c.get('userId');
    const userEmail = c.get('userEmail');
    const jwtPayload = c.get('jwtPayload');
    
    console.log(`[PROTECTED] User ${userId} (${userEmail}) accessing profile`);

    // fetch user profile
    const user = await prisma.users.findUnique({
        where: { user_id: userId }
    });

    if (!user) {
        return c.json({
            error: 'User not found',
            success: false
        }, 404);
    }

    return c.json({
        ...user,
        success: true,
        message: 'This is protected route - you are authenticated',
        jwt_info: {
            user_id: jwtPayload.user_id,
            email: jwtPayload.email,
            user_type: jwtPayload.user_type
        }
    }, 200);
})


export { app as userService }