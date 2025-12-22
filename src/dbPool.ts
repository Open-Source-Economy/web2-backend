import { Pool } from "pg";
import * as dotenv from "dotenv";
import { config, logger, NodeEnv } from "./config";

dotenv.config();

export const pool: Pool = getPool();

function getPool(): Pool {
  let poolInstance: Pool;

  if (config.env === NodeEnv.Local) {
    logger.debug("Connecting to local postgres");
    poolInstance = new Pool({
      user: config.postgres.user,
      password: config.postgres.password,
      host: config.postgres.host,
      port: config.postgres.port,
      database: config.postgres.database,
      max: config.postgres.pool.maxSize,
      min: config.postgres.pool.minSize,
      idleTimeoutMillis: config.postgres.pool.idleTimeoutMillis,
      connectionTimeoutMillis: 10000, // 10 seconds
      keepAlive: true,
      keepAliveInitialDelayMillis: 10000,
    });
  } else {
    logger.debug("Connecting to remote postgres");
    poolInstance = new Pool({
      connectionString: config.postgres.connectionString,
      ssl: {
        rejectUnauthorized: false,
      },
      max: config.postgres.pool.maxSize,
      min: config.postgres.pool.minSize,
      idleTimeoutMillis: config.postgres.pool.idleTimeoutMillis,
      connectionTimeoutMillis: 10000, // 10 seconds
      keepAlive: true,
      keepAliveInitialDelayMillis: 10000,
    });
  }

  // Handle pool errors gracefully
  poolInstance.on("error", (err) => {
    // Log connection errors but don't crash the app
    // ECONNRESET errors are common in serverless environments and can be safely ignored
    if (
      (err as NodeJS.ErrnoException).code === "ECONNRESET" ||
      (err as NodeJS.ErrnoException).code === "EPIPE"
    ) {
      logger.warn(
        "Database connection reset (this is normal in serverless environments):",
        err.message,
      );
    } else {
      logger.error("Unexpected database pool error:", err);
    }
  });

  // Handle client connection errors
  poolInstance.on("connect", (client) => {
    client.on("error", (err) => {
      // Log client errors but don't crash the app
      if (
        (err as NodeJS.ErrnoException).code === "ECONNRESET" ||
        (err as NodeJS.ErrnoException).code === "EPIPE"
      ) {
        logger.warn("Database client connection reset:", err.message);
      } else {
        logger.error("Database client error:", err);
      }
    });
  });

  return poolInstance;
}
