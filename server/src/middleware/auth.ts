import type { NextFunction, Request, Response } from "express";
import jwt from "jsonwebtoken";
import { env } from "../config/env.js";
import { ApiError } from "../utils/http.js";

interface AuthPayload extends jwt.JwtPayload {
  userId: string;
}

declare module "express-serve-static-core" {
  interface Request {
    userId?: string;
  }
}

export const authenticateRequest = (req: Request, _res: Response, next: NextFunction) => {
  const authHeader = req.header("authorization");

  if (!authHeader || !authHeader.startsWith("Bearer ")) {
    return next(new ApiError(401, "Missing or invalid authorization header"));
  }

  const token = authHeader.slice("Bearer ".length);

  try {
    const payload = jwt.verify(token, env.JWT_SECRET) as AuthPayload;

    if (!payload.userId) {
      return next(new ApiError(401, "Invalid auth token"));
    }

    req.userId = payload.userId;
    return next();
  } catch {
    return next(new ApiError(401, "Invalid or expired auth token"));
  }
};
