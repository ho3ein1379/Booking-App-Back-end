import jwt from 'jsonwebtoken';
import type { StringValue } from 'ms';
import { NextFunction, Request, Response } from 'express';
import { AuthenticationError, AuthorizationError } from './errors';

export interface JWTPayload {
  id: string;
  email: string;
  role: string;
}

export interface AuthenticatedRequest extends Request {
  user?: JWTPayload;
}

export const generateToken = (user: JWTPayload): string => {
  const secret = process.env.JWT_SECRET;

  if (!secret) {
    throw new Error('JWT_SECRET is not defined');
  }

  const expiresIn: StringValue = (process.env.JWT_EXPIRE || '7d') as StringValue;

  return jwt.sign(user, secret, {
    expiresIn,
  });
};

export const verifyToken = (token: string): JWTPayload => {
  try {
    return jwt.verify(token, process.env.JWT_SECRET || 'secret') as JWTPayload;
  } catch {
    throw new AuthenticationError('Invalid or expired token');
  }
};

export const authMiddleware = (req: AuthenticatedRequest, res: Response, next: NextFunction) => {
  try {
    const token = req.headers.authorization?.split(' ')[1];

    if (!token) {
      return new AuthenticationError('No token provided');
    }

    req.user = verifyToken(token);
    next();
  } catch (error) {
    next(error);
  }
};

export const requireRole = (allowedRoles: string[]) => {
  return (req: AuthenticatedRequest, res: Response, next: NextFunction) => {
    if (!req.user) {
      return next(new AuthenticationError('User not authenticated'));
    }

    if (!allowedRoles.includes(req.user.role)) {
      return next(
        new AuthorizationError(`Only ${allowedRoles.join(', ')} can access this resource`)
      );
    }

    next();
  };
};
