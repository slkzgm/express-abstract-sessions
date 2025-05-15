// /src/main.ts
import { app } from "./app";
import { CONFIG } from "./config";
import { logger } from "./utils/logger";
import { prisma } from "./clients/prismaClient";

async function startServer() {
  try {
    await prisma.$connect();
    logger.info("Database connected successfully.");
  } catch (error) {
    logger.error(
      `Could not connect to the database: ${(error as Error).message}`,
    );
    throw error;
  }

  const server = app.listen(CONFIG.port, () => {
    logger.info(`Server is running on port ${CONFIG.port}`);
  });

  process.on("SIGTERM", async () => {
    logger.info(
      "SIGTERM signal received: closing HTTP server & DB connection...",
    );
    server.close(async (closeErr) => {
      if (closeErr) {
        logger.error(`Error closing server: ${closeErr.message}`);
      }
      await prisma.$disconnect();
      logger.info("DB connection closed. Exiting process...");
      process.exit(closeErr ? 1 : 0);
    });
  });

  // SIGINT is sent on Ctrl+C in local dev
  process.on("SIGINT", async () => {
    logger.info(
      "SIGINT signal received: closing HTTP server & DB connection...",
    );
    server.close(async (closeErr) => {
      await prisma.$disconnect();
      process.exit(closeErr ? 1 : 0);
    });
  });
}

startServer().catch((error) => {
  logger.error(error.message);
  process.exit(1);
});
