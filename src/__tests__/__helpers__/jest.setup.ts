import { Migration } from "../../db/migration/migration";
import { afterAll, afterEach, beforeEach } from "@jest/globals";
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

  afterEach(async () => {
    try {
      await migration.drop();
    } catch (error) {
      logger.error("Error during migration drop in afterAll: ", error);
      throw error;
    }
  });

  afterAll(async () => {
    await pool.end();
  });
};
