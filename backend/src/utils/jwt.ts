import jwt from 'jsonwebtoken';
import type { Response } from 'express';

// Get JWT_SECRET with runtime validation
const getJwtSecret = (): string => {
  const secret = process.env.JWT_SECRET;
  if (!secret) {
    throw new Error('JWT_SECRET environment variable is required');
  }
  return secret;
};

export interface JWTPayload {
  userId: string;
  email: string;
  role: string;
  tokenVersion: number;
}

const TOKEN_TTL = '48h'; // Reduced from 7d for better security
const TOKEN_TTL_MS = 48 * 60 * 60 * 1000;

export const generateToken = (payload: JWTPayload): string => {
  return jwt.sign(payload, getJwtSecret(), {
    expiresIn: TOKEN_TTL,
  });
};

export const verifyToken = (token: string): JWTPayload => {
  return jwt.verify(token, getJwtSecret()) as JWTPayload;
};

export const AUTH_COOKIE_NAME = 'autotek_token';

/**
 * sameSite: 'lax' (not 'strict') because PayChangu redirects the browser back to the
 * app after checkout via a top-level cross-site navigation (return_url/callback_url).
 * 'strict' would drop the cookie on that return and silently log the user out mid-checkout.
 */
export const setAuthCookie = (res: Response, token: string): void => {
  res.cookie(AUTH_COOKIE_NAME, token, {
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production',
    sameSite: 'lax',
    maxAge: TOKEN_TTL_MS,
    path: '/',
  });
};

export const clearAuthCookie = (res: Response): void => {
  res.clearCookie(AUTH_COOKIE_NAME, {
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production',
    sameSite: 'lax',
    path: '/',
  });
};
