import { pool } from "../src/dbPool";
import { Migration } from "../src/db/migration/migration";

async function main() {
  const migration = new Migration(pool);
  await migration.migrate();
}

main();
