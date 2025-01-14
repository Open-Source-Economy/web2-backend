import { Pool } from "pg";
import * as dotenv from "dotenv";
import { config, logger, NodeEnv } from "./config";

dotenv.config();

export const pool: Pool = getPool();

function getPool(): Pool {
  if (config.env === NodeEnv.Local) {
    logger.debug("Connecting to local postgres");
    return new Pool({
      user: config.postgres.user,
      password: config.postgres.password,
      host: config.postgres.host,
      port: config.postgres.port,
      database: config.postgres.database,
      max: config.postgres.pool.maxSize,
      min: config.postgres.pool.minSize,
      idleTimeoutMillis: config.postgres.pool.idleTimeoutMillis,
    });
  } else {
    logger.debug("Connecting to remote postgres");
    return new Pool({
      connectionString: config.postgres.connectionString,
      ssl: {
        rejectUnauthorized: false,
      },
    });
  }
}
