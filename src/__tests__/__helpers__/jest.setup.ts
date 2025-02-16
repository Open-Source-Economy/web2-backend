import { Migration } from "../../db/migration/migration";
import { afterAll, beforeEach } from "@jest/globals";
import { pool } from "../../dbPool";
import { logger } from "../../config";

export const setupTestDB = () => {
  const migration = new Migration(pool);

  beforeEach(async () => {
    try {
      await migration.drop();
      await migration.migrate();
    } catch (error) {
      logger.error("Error during migration in beforeAll: ", error);
      throw error;
    }
  });

  afterAll(async () => {
    await pool.end();
  });
};
