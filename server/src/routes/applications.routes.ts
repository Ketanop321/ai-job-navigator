import { Router } from "express";
import mongoose from "mongoose";
import { z } from "zod";
import { authenticateRequest } from "../middleware/auth.js";
import { ApplicationModel } from "../models/Application.js";
import { applicationStatuses } from "../types/application.js";
import { ApiError } from "../utils/http.js";

const applicationRouter = Router();
applicationRouter.use(authenticateRequest);

const parsedDetailsSchema = z.object({
  companyName: z.string().optional().default(""),
  role: z.string().optional().default(""),
  requiredSkills: z.array(z.string()).optional().default([]),
  niceToHaveSkills: z.array(z.string()).optional().default([]),
  seniority: z.string().optional().default(""),
  location: z.string().optional().default(""),
});

const createApplicationSchema = z.object({
  company: z.string().trim().min(1),
  role: z.string().trim().min(1),
  jdLink: z.string().trim().optional().default(""),
  notes: z.string().trim().optional().default(""),
  dateApplied: z.string().trim().optional(),
  status: z.enum(applicationStatuses).optional().default("Applied"),
  salaryRange: z.string().trim().optional().default(""),
  jobDescription: z.string().trim().optional().default(""),
  parsedDetails: parsedDetailsSchema.optional().default({
    companyName: "",
    role: "",
    requiredSkills: [],
    niceToHaveSkills: [],
    seniority: "",
    location: "",
  }),
  resumeSuggestions: z.array(z.string()).optional().default([]),
});

const updateApplicationSchema = createApplicationSchema.partial();

const parseDate = (value?: string) => {
  if (!value) {
    return new Date();
  }

  const parsed = new Date(value);
  if (Number.isNaN(parsed.getTime())) {
    throw new ApiError(400, "Invalid dateApplied value");
  }

  return parsed;
};

applicationRouter.get("/", async (req, res, next) => {
  try {
    const applications = await ApplicationModel.find({ userId: req.userId })
      .sort({ dateApplied: -1, createdAt: -1 })
      .lean();

    return res.json({ applications });
  } catch (error) {
    return next(error);
  }
});

applicationRouter.post("/", async (req, res, next) => {
  try {
    const payload = createApplicationSchema.parse(req.body);

    const application = await ApplicationModel.create({
      ...payload,
      userId: req.userId,
      dateApplied: parseDate(payload.dateApplied),
    });

    return res.status(201).json({ application });
  } catch (error) {
    return next(error);
  }
});

applicationRouter.get("/:id", async (req, res, next) => {
  try {
    if (!mongoose.Types.ObjectId.isValid(req.params.id)) {
      throw new ApiError(400, "Invalid application id");
    }

    const application = await ApplicationModel.findOne({
      _id: req.params.id,
      userId: req.userId,
    });

    if (!application) {
      throw new ApiError(404, "Application not found");
    }

    return res.json({ application });
  } catch (error) {
    return next(error);
  }
});

applicationRouter.put("/:id", async (req, res, next) => {
  try {
    if (!mongoose.Types.ObjectId.isValid(req.params.id)) {
      throw new ApiError(400, "Invalid application id");
    }

    const payload = updateApplicationSchema.parse(req.body);

    const updates: Record<string, unknown> = {
      ...payload,
    };

    if (payload.dateApplied) {
      updates.dateApplied = parseDate(payload.dateApplied);
    }

    const application = await ApplicationModel.findOneAndUpdate(
      { _id: req.params.id, userId: req.userId },
      updates,
      { new: true },
    );

    if (!application) {
      throw new ApiError(404, "Application not found");
    }

    return res.json({ application });
  } catch (error) {
    return next(error);
  }
});

applicationRouter.patch("/:id/status", async (req, res, next) => {
  try {
    if (!mongoose.Types.ObjectId.isValid(req.params.id)) {
      throw new ApiError(400, "Invalid application id");
    }

    const payload = z.object({ status: z.enum(applicationStatuses) }).parse(req.body);

    const application = await ApplicationModel.findOneAndUpdate(
      { _id: req.params.id, userId: req.userId },
      { status: payload.status },
      { new: true },
    );

    if (!application) {
      throw new ApiError(404, "Application not found");
    }

    return res.json({ application });
  } catch (error) {
    return next(error);
  }
});

applicationRouter.delete("/:id", async (req, res, next) => {
  try {
    if (!mongoose.Types.ObjectId.isValid(req.params.id)) {
      throw new ApiError(400, "Invalid application id");
    }

    const deleted = await ApplicationModel.findOneAndDelete({
      _id: req.params.id,
      userId: req.userId,
    });

    if (!deleted) {
      throw new ApiError(404, "Application not found");
    }

    return res.status(204).send();
  } catch (error) {
    return next(error);
  }
});

export { applicationRouter };
