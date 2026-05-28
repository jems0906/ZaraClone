const fs = require("node:fs");
const path = require("node:path");
const pool = require("../src/config/db");

async function run() {
  const schemaPath = path.resolve(__dirname, "../sql/schema.sql");
  const schemaSql = fs.readFileSync(schemaPath, "utf8");
  await pool.query(schemaSql);
  await pool.end();
  console.log("Database schema initialized");
}

run().catch(async (error) => {
  console.error("Failed to initialize database schema", error);
  try {
    await pool.end();
  } catch {
    // Ignore cleanup failures.
  }
  process.exit(1);
});
