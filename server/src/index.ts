import mongoose from "mongoose";
import { app } from "./app";
import { connectDatabase } from "./config/database";
import { env } from "./config/env";

const bootstrap = async () => {
  await connectDatabase();

  const server = app.listen(env.SERVER_PORT, () => {
    console.log(`API server listening on port ${env.SERVER_PORT}`);
  });

  const shutdown = async () => {
    server.close();
    await mongoose.disconnect();
    process.exit(0);
  };

  process.on("SIGINT", shutdown);
  process.on("SIGTERM", shutdown);
};

bootstrap().catch((error) => {
  console.error("Failed to start API server", error);
  process.exit(1);
});
