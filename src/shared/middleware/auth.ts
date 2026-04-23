import type { Context, Next } from 'hono';
import jwt from 'jsonwebtoken'
import dotenv from 'dotenv'
import { prisma } from '../database/prisma.js'

dotenv.config();

const JWT_SECRET = process.env.JWT_SECRET

export type AuthVariables = {
    jwtPayload: {
        sub: string;
        exp?: number;
        iat?: number;
    };
    userId: string;
    userEmail: string;
    userType: string;
}

export async function authMiddleware(c: Context<{ Variables: AuthVariables }>, next: Next) {
    const authHeader = c.req.header('Authorization');
    
    if (!authHeader?.startsWith('Bearer ')) {
        return c.json({
            success: false,
            error: 'No token provided'
        }, 401);
    }
    
    const token = authHeader.split(' ')[1];
    
    try {
        if (!JWT_SECRET) throw new Error('JWT_SECRET missing');

        const decoded = jwt.verify(token, JWT_SECRET) as {
            sub?: string;
            exp?: number;
            iat?: number;
        };

        const userId = decoded.sub;

        if (!userId) {
            return c.json({
                success: false,
                error: 'Invalid token payload: missing sub'
            }, 401);
        }

        const user = await prisma.users.findUnique({
            where: { user_id: userId },
            select: {
                email: true,
                user_type: true
            }
        });

        if (!user) {
            return c.json({
                success: false,
                error: 'User not found'
            }, 401);
        }
        
        c.set('jwtPayload', {
            sub: userId,
            exp: decoded.exp,
            iat: decoded.iat
        });
        c.set('userId', userId);
        c.set('userEmail', user.email ?? '');
        c.set('userType', user.user_type ?? 'student');
        
        await next();
    } catch (error) {
        return c.json({
            success: false,
            error: 'Invalid or expired token',
            detail: error
        }, 401);
    }
}
