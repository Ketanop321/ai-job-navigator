import mongoose from "mongoose";
import { app } from "./app.js";
import { connectDatabase } from "./config/database.js";
import { env } from "./config/env.js";

const bootstrap = async () => {
  await connectDatabase();

  const serverPort = Number(process.env.PORT ?? env.SERVER_PORT);

  const server = app.listen(serverPort, () => {
    console.log(`API server listening on port ${serverPort}`);
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
