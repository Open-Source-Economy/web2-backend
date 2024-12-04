import { Pool } from "pg";
import * as dotenv from "dotenv";
import { config } from "./config";

dotenv.config();

export function getPool(): Pool {
  return new Pool({
    connectionString: config.postgres.connectionString,
    ssl: {
      rejectUnauthorized: false,
    },

    // user: config.postgres.user,
    // password: config.postgres.password,
    // host: config.postgres.host,
    // port: config.postgres.port,
    // database: config.postgres.database,
    // max: config.postgres.pool.maxSize,
    // min: config.postgres.pool.minSize,
    // idleTimeoutMillis: config.postgres.pool.idleTimeoutMillis,
  });
}
