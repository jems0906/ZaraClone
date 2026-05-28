const { Pool } = require("pg");

const rawUrl = process.env.DATABASE_URL;

if (!rawUrl) {
  throw new Error("DATABASE_URL is not set");
}

const parsed = new URL(rawUrl);

const pool = new Pool({
  host: parsed.hostname,
  port: Number(parsed.port || 5432),
  user: decodeURIComponent(parsed.username),
  password: decodeURIComponent(parsed.password),
  database: parsed.pathname.replace(/^\//, ""),
});

module.exports = pool;
