import type { Context, Next } from 'hono';
import jwt from 'jsonwebtoken'
import dotenv from 'dotenv'

dotenv.config();

const JWT_SECRET = process.env.JWT_SECRET

export type AuthVariables = {
    jwtPayload: {
        user_id: string;
        email: string;
        user_type: string;
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
        if (!JWT_SECRET) throw new Error("JWT_SECRET missing");

        const decoded = jwt.verify(token, JWT_SECRET) as {
            user_id: string;
            email: string;
            user_type: string;
        };
        
        // ยัดข้อมูลใส่ Context
        c.set('jwtPayload', decoded);
        c.set('userId', decoded.user_id);
        c.set('userEmail', decoded.email);
        c.set('userType', decoded.user_type);
        
        await next();
    } catch (error) {
        return c.json({
            success: false,
            error: 'Invalid or expired token',
            detail: error
        }, 401);
    }
}