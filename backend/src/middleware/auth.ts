import { Request, Response, NextFunction } from 'express';
import { verifyToken, AUTH_COOKIE_NAME } from '../utils/jwt';
import User, { IUser } from '../models/User';

export interface AuthRequest extends Request {
  user?: IUser;
}

export const authMiddleware = async (
  req: AuthRequest,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    const token = req.cookies?.[AUTH_COOKIE_NAME];

    if (!token) {
      res.status(401).json({ message: 'No token provided' });
      return;
    }

    const decoded = verifyToken(token);
    const user = await User.findById(decoded.userId).select('-password');

    if (!user) {
      res.status(401).json({ message: 'User not found' });
      return;
    }

    // Token issued before a password change / explicit logout has a stale
    // version and must be rejected even though it hasn't expired yet.
    if (decoded.tokenVersion !== user.tokenVersion) {
      res.status(401).json({ message: 'Session expired, please log in again' });
      return;
    }

    if (!user.isActive) {
      res.status(401).json({ message: 'Account has been deactivated' });
      return;
    }

    req.user = user;
    next();
  } catch (error) {
    res.status(401).json({ message: 'Invalid token' });
  }
};

export const adminMiddleware = (
  req: AuthRequest,
  res: Response,
  next: NextFunction
): void => {
  if (!req.user || req.user.role !== 'admin') {
    res.status(403).json({ message: 'Admin access required' });
    return;
  }
  next();
};

export const mechanicMiddleware = (
  req: AuthRequest,
  res: Response,
  next: NextFunction
): void => {
  if (!req.user || (req.user.role !== 'admin' && req.user.role !== 'mechanic')) {
    res.status(403).json({ message: 'Mechanic access required' });
    return;
  }
  next();
};

// Optional auth middleware - allows both authenticated and guest requests
export const optionalAuthMiddleware = async (
  req: AuthRequest,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    const token = req.cookies?.[AUTH_COOKIE_NAME];

    if (token) {
      try {
        const decoded = verifyToken(token);
        const user = await User.findById(decoded.userId).select('-password');
        if (user && decoded.tokenVersion === user.tokenVersion && user.isActive) {
          req.user = user;
        }
      } catch (error) {
        // Token invalid, but continue as guest
      }
    }
    next();
  } catch (error) {
    next();
  }
};
