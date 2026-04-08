import bcrypt from "bcryptjs";
import { Router } from "express";
import jwt, { type SignOptions } from "jsonwebtoken";
import { z } from "zod";
import { env } from "../config/env.js";
import { authenticateRequest } from "../middleware/auth.js";
import { UserModel } from "../models/User.js";
import { ApiError } from "../utils/http.js";

const authRouter = Router();

const signToken = (userId: string) => {
  const options: SignOptions = {
    expiresIn: env.JWT_EXPIRES_IN as SignOptions["expiresIn"],
  };

  return jwt.sign({ userId }, env.JWT_SECRET, options);
};

const registerSchema = z.object({
  name: z.string().trim().min(2, "Name must be at least 2 characters"),
  email: z.string().email().transform((value) => value.toLowerCase()),
  password: z.string().min(8, "Password must be at least 8 characters"),
});

authRouter.post("/register", async (req, res, next) => {
  try {
    const payload = registerSchema.parse(req.body);

    const existing = await UserModel.findOne({ email: payload.email });
    if (existing) {
      throw new ApiError(409, "Email already registered");
    }

    const passwordHash = await bcrypt.hash(payload.password, 12);
    const user = await UserModel.create({
      name: payload.name,
      email: payload.email,
      passwordHash,
    });

    const token = signToken(user.id);

    return res.status(201).json({
      token,
      user: {
        id: user.id,
        name: user.name,
        email: user.email,
      },
    });
  } catch (error) {
    return next(error);
  }
});

const loginSchema = z.object({
  email: z.string().email().transform((value) => value.toLowerCase()),
  password: z.string().min(8),
});

authRouter.post("/login", async (req, res, next) => {
  try {
    const payload = loginSchema.parse(req.body);

    const user = await UserModel.findOne({ email: payload.email });
    if (!user) {
      throw new ApiError(401, "Invalid credentials");
    }

    const isValid = await user.comparePassword(payload.password);
    if (!isValid) {
      throw new ApiError(401, "Invalid credentials");
    }

    const token = signToken(user.id);

    return res.json({
      token,
      user: {
        id: user.id,
        name: user.name,
        email: user.email,
      },
    });
  } catch (error) {
    return next(error);
  }
});

authRouter.get("/me", authenticateRequest, async (req, res, next) => {
  try {
    const user = await UserModel.findById(req.userId).select("_id name email");

    if (!user) {
      throw new ApiError(404, "User not found");
    }

    return res.json({
      user: {
        id: user.id,
        name: user.name,
        email: user.email,
      },
    });
  } catch (error) {
    return next(error);
  }
});

export { authRouter };
