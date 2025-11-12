import { Pool } from "pg";
import fs from "fs";

export class Migration {
  pool: Pool;

  constructor(pool: Pool) {
    this.pool = pool;
  }

  public async migrate(): Promise<void> {
    const migrationFiles = [
      "1.sql",
      "2.sql",
      "3.sql",
      "4.sql",
      "5.sql",
      "6.sql",
      "7.sql",
      "8.sql",
      "9.sql",
      "10.sql",
      "11.sql",
      "12.sql", // Project polymorphic structure
      "13.sql", // Developer onboarding tables
      "14.sql", // No-op migration (bug fix)
      "15.sql",
      "16.sql",
      "17.sql",
    ];

    const migrations = migrationFiles.map((file) => {
      return fs.readFileSync(`src/db/migration/${file}`).toString();
    });

    for (let i = 0; i < migrations.length; i++) {
      console.log(`Running migration ${migrationFiles[i]}...`);
      try {
        await this.pool.query(migrations[i]);
        console.log(`✓ Migration ${migrationFiles[i]} completed`);
      } catch (error) {
        console.error(`✗ Migration ${migrationFiles[i]} failed:`, error);
        throw error;
      }
    }

    await this.pool.query(`SET timezone = 'UTC';`);
    console.log("✓ All migrations completed successfully");
  }

  public async drop(): Promise<void> {
    await this.pool.query(`
    DROP SCHEMA public CASCADE;
    CREATE SCHEMA public;
  `);
  }
}
