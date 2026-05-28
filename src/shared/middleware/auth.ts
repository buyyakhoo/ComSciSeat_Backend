import type { Context, Next } from 'hono';
import jwt from 'jsonwebtoken'
import dotenv from 'dotenv'
import { prisma } from '../database/prisma.js'

dotenv.config();

const JWT_SECRET = process.env.JWT_SECRET
const UUID_REGEX = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i
const STUDENT_ID_REGEX = /^\d{8}$/

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
            user_id?: string;
            exp?: number;
            iat?: number;
        };

        const tokenUserId = decoded.sub ?? decoded.user_id;

        if (!tokenUserId) {
            return c.json({
                success: false,
                error: 'Invalid token payload: missing user id'
            }, 401);
        }

        const user = UUID_REGEX.test(tokenUserId)
          ? await prisma.users.findUnique({
            where: { user_id: tokenUserId },
            select: {
                user_id: true,
                email: true,
                user_type: true
            }
          })
          : STUDENT_ID_REGEX.test(tokenUserId)
            ? await prisma.users.findFirst({
              where: { student_id: tokenUserId },
              select: {
                user_id: true,
                email: true,
                user_type: true
              }
            })
            : null;

        if (!user) {
            return c.json({
                success: false,
                error: 'User not found'
            }, 401);
        }
        
        c.set('jwtPayload', {
            sub: user.user_id,
            exp: decoded.exp,
            iat: decoded.iat
        });
        c.set('userId', user.user_id);
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
