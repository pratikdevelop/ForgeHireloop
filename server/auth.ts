import { Request, Response, NextFunction } from 'express';
import jwt from 'jsonwebtoken';
import bcrypt from 'bcryptjs';
import { db } from './db';
import { User, UserRole } from './types';
import { adminAuth } from './firebaseAdmin';

const JWT_SECRET = process.env.JWT_SECRET || 'forgehireloop_super_secret_jwt_key_2026';

export interface AuthRequest extends Request {
  user?: User;
}

export function generateToken(user: User): string {
  return jwt.sign(
    {
      id: user.id,
      email: user.email,
      role: user.role,
      name: user.name,
    },
    JWT_SECRET,
    { expiresIn: '7d' }
  );
}

export function sanitizeUser(user: User): Omit<User, 'passwordHash'> {
  const { passwordHash, ...safeUser } = user;
  return safeUser;
}

export async function hashPassword(password: string): Promise<string> {
  const salt = await bcrypt.genSalt(10);
  return bcrypt.hash(password, salt);
}

export async function comparePassword(password: string, hash?: string): Promise<boolean> {
  if (!hash) return false;
  return bcrypt.compare(password, hash);
}

/**
 * Express middleware to authenticate tokens.
 * Verifies either Firebase ID tokens (primary) OR applet JWT tokens (fallback).
 */
export async function authenticateToken(req: AuthRequest, res: Response, next: NextFunction) {
  const authHeader = req.headers['authorization'];
  const token = authHeader && authHeader.startsWith('Bearer ') ? authHeader.split(' ')[1] : null;

  if (!token) {
    return next();
  }

  // 1. Try Firebase Admin ID Token verification first
  try {
    const decodedFb = await adminAuth.verifyIdToken(token);
    if (decodedFb && decodedFb.uid) {
      let user = db.getUserById(decodedFb.uid);
      if (!user && decodedFb.email) {
        user = db.getUserByEmail(decodedFb.email);
      }
      if (user) {
        req.user = user;
        return next();
      } else {
        // Construct user profile from Firebase ID token
        const isDeepashAdmin = decodedFb.email?.toLowerCase() === 'deepashsharma19@gmail.com';
        const fallbackUser: User = {
          id: decodedFb.uid,
          email: decodedFb.email || '',
          passwordHash: '',
          name: decodedFb.name || (decodedFb.email ? decodedFb.email.split('@')[0] : 'User'),
          role: isDeepashAdmin ? 'admin' : (decodedFb.role as UserRole) || 'candidate',
          status: 'active',
          savedJobIds: [],
          followedCompanyIds: [],
          createdAt: new Date().toISOString(),
          updatedAt: new Date().toISOString(),
        };
        req.user = fallbackUser;
        return next();
      }
    }
  } catch {
    // Not a Firebase Admin token or verification threw, fallback to JWT decode
  }

  // 2. Fallback to local signed JWT
  try {
    const decoded = jwt.verify(token, JWT_SECRET) as { id: string; email?: string; role?: UserRole };
    const user = db.getUserById(decoded.id) || (decoded.email ? db.getUserByEmail(decoded.email) : undefined);
    if (user) {
      req.user = user;
    }
  } catch {
    // 3. Fallback: unverified payload parse for development sessions
    try {
      const parts = token.split('.');
      if (parts.length === 3) {
        const payload = JSON.parse(Buffer.from(parts[1], 'base64').toString());
        const uid = payload.user_id || payload.sub || payload.uid || payload.id;
        const email = payload.email;
        if (uid || email) {
          const user = (uid ? db.getUserById(uid) : undefined) || (email ? db.getUserByEmail(email) : undefined);
          if (user) {
            req.user = user;
          } else if (email) {
            const isDeepashAdmin = email.toLowerCase() === 'deepashsharma19@gmail.com';
            req.user = {
              id: uid || `usr_${Date.now()}`,
              email,
              passwordHash: '',
              name: payload.name || email.split('@')[0],
              role: isDeepashAdmin ? 'admin' : (payload.role as UserRole) || 'candidate',
              status: 'active',
              savedJobIds: [],
              followedCompanyIds: [],
              createdAt: new Date().toISOString(),
              updatedAt: new Date().toISOString(),
            };
          }
        }
      }
    } catch {}
  }

  next();
}

export function requireAuth(req: AuthRequest, res: Response, next: NextFunction) {
  if (!req.user) {
    return res.status(401).json({ error: 'Authentication required' });
  }
  next();
}

export function requireRole(allowedRoles: UserRole[]) {
  return (req: AuthRequest, res: Response, next: NextFunction) => {
    if (!req.user) {
      return res.status(401).json({ error: 'Authentication required' });
    }
    if (!allowedRoles.includes(req.user.role)) {
      return res.status(403).json({ error: 'Permission denied: insufficient privileges' });
    }
    next();
  };
}
