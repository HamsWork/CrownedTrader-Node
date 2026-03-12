import "dotenv/config";
import { Pool } from "pg";
import fs from "node:fs";
import path from "node:path";

async function main() {
  const databaseUrl = process.env.DATABASE_URL;

  if (!databaseUrl) {
    console.error("DATABASE_URL is not set in environment.");
    process.exit(1);
  }

  // Reuse same pool config as server/db.ts
  const pool = new Pool({
    connectionString: databaseUrl,
    // let pg/connection string handle SSL options
  });

  try {
    // Locate connect-pg-simple's table.sql inside node_modules
    const tableSqlPath = require.resolve("connect-pg-simple/table.sql");
    const sql = fs.readFileSync(tableSqlPath, "utf8");

    console.log(`Executing session table SQL from: ${tableSqlPath}`);

    await pool.query(sql);

    console.log("Session table created (or already exists).");
  } catch (err) {
    console.error("Failed to create session table:", err);
    process.exitCode = 1;
  } finally {
    await pool.end();
  }
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});

