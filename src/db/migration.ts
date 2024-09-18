import { Pool } from "pg";
import fs from "fs";

export class Migration {
  pool: Pool;

  constructor(pool: Pool) {
    this.pool = pool;
  }

  public async migrate(): Promise<void> {
    const sql = fs.readFileSync("src/db/migration.sql").toString();

    await this.pool.query(sql);
    await this.pool.query(`SET timezone = 'UTC';`);
  }

  public async drop(): Promise<void> {
    await this.pool.query(`
        DROP TABLE IF EXISTS user_session CASCADE;
        DROP TABLE IF EXISTS company CASCADE;
        DROP TABLE IF EXISTS address CASCADE;
        DROP TABLE IF EXISTS github_issue CASCADE;
        DROP TABLE IF EXISTS github_repository CASCADE;
        DROP TABLE IF EXISTS github_owner CASCADE;
        DROP TABLE IF EXISTS user_company CASCADE;
        DROP TABLE IF EXISTS third_party_user_company CASCADE;
        DROP TABLE IF EXISTS app_user CASCADE;
        DROP TABLE IF EXISTS stripe_invoice_line CASCADE;
        DROP TABLE IF EXISTS stripe_invoice CASCADE;
        DROP TABLE IF EXISTS stripe_customer CASCADE;
        DROP TABLE IF EXISTS stripe_product CASCADE;
    `);
  }
}
