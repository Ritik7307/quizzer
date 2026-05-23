import type { Request, Response, NextFunction } from "express";
import { verifyToken, type JwtPayload } from "../utils/jwt.js";
import type { Role } from "@prisma/client";

export interface AuthRequest extends Request {
  user?: JwtPayload;
}

export function authenticate(req: AuthRequest, res: Response, next: NextFunction) {
  const header = req.headers.authorization;
  const token = header?.startsWith("Bearer ") ? header.slice(7) : req.cookies?.token;

  if (!token) {
    return res.status(401).json({ error: "Authentication required" });
  }

  try {
    req.user = verifyToken(token);
    next();
  } catch {
    return res.status(401).json({ error: "Invalid or expired token" });
  }
}

export function requireRole(...roles: Role[]) {
  return (req: AuthRequest, res: Response, next: NextFunction) => {
    if (!req.user) {
      return res.status(401).json({ error: "Authentication required" });
    }
    if (!roles.includes(req.user.role)) {
      return res.status(403).json({ error: "Insufficient permissions" });
    }
    next();
  };
}
