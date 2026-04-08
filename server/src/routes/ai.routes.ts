import { Router, type Response } from "express";
import { z } from "zod";
import { authenticateRequest } from "../middleware/auth";
import { generateResumeSuggestions, parseJobDescription } from "../services/groq.service";
import { ApiError } from "../utils/http";

const aiRouter = Router();
aiRouter.use(authenticateRequest);

const parseSchema = z.object({
  jobDescription: z
    .string()
    .trim()
    .min(80, "Please provide a richer job description (at least 80 characters)")
    .max(12000),
});

const writeStreamLine = (res: Response, payload: unknown) => {
  // This helper keeps stream output as newline-delimited JSON for easy client parsing.
  res.write(`${JSON.stringify(payload)}\n`);
};

aiRouter.post("/parse-jd", async (req, res, next) => {
  try {
    const payload = parseSchema.parse(req.body);

    const parsed = await parseJobDescription(payload.jobDescription);
    const suggestions = await generateResumeSuggestions(parsed, payload.jobDescription);

    return res.json({
      parsed,
      suggestions,
    });
  } catch (error) {
    return next(error);
  }
});

aiRouter.post("/parse-jd/stream", async (req, res, next) => {
  let streamStarted = false;

  try {
    const payload = parseSchema.parse(req.body);

    res.setHeader("Content-Type", "application/x-ndjson; charset=utf-8");
    res.setHeader("Cache-Control", "no-cache, no-transform");
    res.setHeader("Connection", "keep-alive");
    res.setHeader("X-Accel-Buffering", "no");
    streamStarted = true;

    writeStreamLine(res, { type: "status", message: "Parsing job description..." });

    const parsed = await parseJobDescription(payload.jobDescription);

    writeStreamLine(res, { type: "parsed", parsed });
    writeStreamLine(res, { type: "status", message: "Generating tailored resume bullets..." });

    const suggestions = await generateResumeSuggestions(parsed, payload.jobDescription);

    for (const suggestion of suggestions) {
      writeStreamLine(res, { type: "suggestion", suggestion });
    }

    writeStreamLine(res, {
      type: "done",
      parsed,
      suggestions,
    });

    return res.end();
  } catch (error) {
    if (!streamStarted) {
      return next(error);
    }

    const message = error instanceof ApiError ? error.message : "Streaming parse failed";
    writeStreamLine(res, { type: "error", message });
    return res.end();
  }
});

export { aiRouter };
