import { createServer } from "http";
import app from "./app";
import { logger } from "./lib/logger";
import { setupWebSocket } from "./lib/live-scores";
import { cancelExpiredBookings } from "./routes/bookings";
import { connectDB } from "@workspace/db";

const rawPort = process.env["PORT"];

if (!rawPort) {
  throw new Error("PORT environment variable is required but was not provided.");
}

const port = Number(rawPort);

if (Number.isNaN(port) || port <= 0) {
  throw new Error(`Invalid PORT value: "${rawPort}"`);
}

connectDB()
  .then(() => {
    const server = createServer(app);
    setupWebSocket(server);

    // Cancel expired pending bookings on startup and every 60 seconds
    cancelExpiredBookings().catch(() => {});
    setInterval(() => cancelExpiredBookings().catch(() => {}), 60_000);

    server.listen(port, () => {
      logger.info({ port }, "Server listening");
    });
    server.on("error", (err) => {
      logger.error({ err }, "Error listening on port");
      process.exit(1);
    });
  })
  .catch((err) => {
    logger.error({ err }, "Failed to connect to MongoDB");
    process.exit(1);
  });
