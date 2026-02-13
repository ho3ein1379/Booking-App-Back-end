import jwt from "jsonwebtoken";
import { Request, Response, NextFunction } from "express";
import { AuthenticationError, AuthorizationError } from "./errors";

export interface JWTPayload {
  id: string;
  email: string;
  role: string;
}

export interface AuthenticatedRequest extends Request {
  user?: JWTPayload;
}

export const generateToken = (user: JWTPayload): string => {
  return jwt.sign(user, process.env.JWT_SECRET || "secret", {
    expiresIn: process.env.JWT_EXPIRE || "7d",
  });
};

export const verifyToken = (token: string): JWTPayload => {
  try {
    return jwt.verify(token, process.env.JWT_SECRET || "secret") as JWTPayload;
  } catch (error) {
    throw new AuthenticationError("Invalid or expired token");
  }
};

export const authMiddleware = (
  req: AuthenticatedRequest,
  res: Response,
  next: NextFunction
) => {
  try {
    const token = req.headers.authorization?.split(" ")[1];

    if (!token) {
      throw new AuthenticationError("No token provided");
    }

    const decoded = verifyToken(token);
    req.user = decoded;
    next();
  } catch (error) {
    next(error);
  }
};

export const requireRole = (allowedRoles: string[]) => {
  return (req: AuthenticatedRequest, res: Response, next: NextFunction) => {
    if (!req.user) {
      return next(new AuthenticationError("User not authenticated"));
    }

    if (!allowedRoles.includes(req.user.role)) {
      return next(
        new AuthorizationError(
          `Only ${allowedRoles.join(", ")} can access this resource`
        )
      );
    }

    next();
  };
};
