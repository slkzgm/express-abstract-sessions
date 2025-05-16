// /src/main.ts
import { app } from "./app";
import { CONFIG } from "./config";
import { logger } from "./utils/logger";
import { prisma } from "./clients/prismaClient";
import { startSessionClientCleanup } from "./services/sessionClientCache";

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

  // Start local session cleanup
  startSessionClientCleanup();

  const server = app.listen(CONFIG.port, () => {
    logger.info(`Server is running on port ${CONFIG.port}`);
  });

  process.on("SIGTERM", async () => {
    logger.info("SIGTERM signal received. Closing server...");
    server.close(async (closeErr) => {
      if (closeErr) {
        logger.error(`Error closing server: ${closeErr.message}`);
      }
      await prisma.$disconnect();
      logger.info("DB disconnected. Exiting...");
      process.exit(closeErr ? 1 : 0);
    });
  });

  process.on("SIGINT", async () => {
    logger.info("SIGINT signal received. Closing server...");
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
