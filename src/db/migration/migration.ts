import { Pool } from "pg";
import fs from "fs";

export class Migration {
  pool: Pool;

  constructor(pool: Pool) {
    this.pool = pool;
  }

  public async migrate(): Promise<void> {
    const sql1 = fs.readFileSync("src/db/migration/1.sql").toString();
    const sql2 = fs.readFileSync("src/db/migration/2.sql").toString();
    const stripe = fs.readFileSync("src/db/migration/stripe.sql").toString();

    await this.pool.query(sql1);
    await this.pool.query(sql2);
    await this.pool.query(stripe);
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
        DROP TABLE IF EXISTS stripe_price CASCADE;
        DROP TABLE IF EXISTS issue_funding CASCADE;
        DROP TABLE IF EXISTS managed_issue CASCADE;
        DROP TABLE IF EXISTS repository_user_permission_token CASCADE;
        DROP TABLE IF EXISTS company_user_permission_token CASCADE;
        DROP TABLE IF EXISTS repository_user_permission_token CASCADE;
        DROP TABLE IF EXISTS manual_invoice CASCADE;
        DROP TABLE IF EXISTS user_repository CASCADE;
    `);
  }
}
