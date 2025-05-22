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
    ];

    const migrations = migrationFiles.map((file) => {
      return fs.readFileSync(`src/db/migration/${file}`).toString();
    });

    for (const migration of migrations) {
      await this.pool.query(migration);
    }

    await this.pool.query(`SET timezone = 'UTC';`);
  }

  public async drop(): Promise<void> {
    await this.pool.query(`
    DROP SCHEMA public CASCADE;
    CREATE SCHEMA public;
  `);
  }
}
