import cors from "cors";
import express from "express";
import { env } from "./config/env";
import { aiRouter } from "./routes/ai.routes";
import { applicationRouter } from "./routes/applications.routes";
import { authRouter } from "./routes/auth.routes";
import { ApiError, errorHandler } from "./utils/http";

const app = express();

app.use(
  cors({
    origin: env.CLIENT_ORIGIN,
    credentials: true,
  }),
);
app.use(express.json({ limit: "2mb" }));

app.get("/api/health", (_req, res) => {
  res.json({ ok: true, message: "AI Job Tracker API is running" });
});

app.use("/api/auth", authRouter);
app.use("/api/applications", applicationRouter);
app.use("/api/ai", aiRouter);

app.use((_req, _res, next) => {
  next(new ApiError(404, "Route not found"));
});

app.use(errorHandler);

export { app };
