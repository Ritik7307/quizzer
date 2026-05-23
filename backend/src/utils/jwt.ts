import jwt from "jsonwebtoken";
import type { Role } from "@prisma/client";

export interface JwtPayload {
  userId: string;
  email: string;
  role: Role;
}

const secret = process.env.JWT_SECRET ?? "dev-secret-change-me";
const expiresIn = (process.env.JWT_EXPIRES_IN ?? "7d") as any;

export function signToken(payload: JwtPayload): string {
  return jwt.sign(payload, secret, { expiresIn });
}

export function verifyToken(token: string): JwtPayload {
  return jwt.verify(token, secret) as JwtPayload;
}
