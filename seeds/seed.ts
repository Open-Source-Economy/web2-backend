import { pool } from "../src/dbPool";
import { config, logger, NodeEnv } from "../src/config";
import * as fs from "fs";
import * as path from "path";

const ALLOWED_ENVS: NodeEnv[] = [NodeEnv.Development, NodeEnv.Local];

async function main() {
  const env = config.env;

  if (!ALLOWED_ENVS.includes(env)) {
    logger.error(`Seeding is not allowed in "${env}" environment. Allowed: ${ALLOWED_ENVS.join(", ")}`);
    process.exit(1);
  }

  const seedDir = getSeedDir(env);
  if (!seedDir) {
    logger.error(`No seed directory found for environment: ${env}`);
    process.exit(1);
  }

  const files = fs
    .readdirSync(seedDir)
    .filter((f) => f.endsWith(".sql"))
    .sort();

  if (files.length === 0) {
    logger.info(`No seed files found in ${seedDir}`);
    process.exit(0);
  }

  logger.info(`Seeding database for environment: ${env}`);
  logger.info(`Running ${files.length} seed file(s) from ${seedDir}`);

  const client = await pool.connect();
  try {
    await client.query("BEGIN");

    for (const file of files) {
      const filePath = path.join(seedDir, file);
      const sql = fs.readFileSync(filePath, "utf-8");
      logger.info(`  → ${file}`);
      await client.query(sql);
    }

    await client.query("COMMIT");
    logger.info("Seeding complete.");
  } catch (error) {
    await client.query("ROLLBACK");
    logger.error("Seeding failed, rolled back.", error);
    process.exit(1);
  } finally {
    client.release();
    await pool.end();
  }
}

function getSeedDir(env: NodeEnv): string | null {
  const envToDir: Partial<Record<NodeEnv, string>> = {
    [NodeEnv.Development]: "dev",
    [NodeEnv.Local]: "dev",
  };

  const dir = envToDir[env];
  if (!dir) return null;

  const fullPath = path.join(__dirname, dir);
  return fs.existsSync(fullPath) ? fullPath : null;
}

main();
