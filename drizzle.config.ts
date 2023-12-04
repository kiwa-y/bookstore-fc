import type { Config } from "drizzle-kit";

export default {
  schema: "./src/schema.ts",
  out: "./drizzle/migrations",
  driver: "pg", // 'pg' | 'mysql2' | 'better-sqlite' | 'libsql' | 'turso'
  dbCredentials: {
    user: process.env["USERNAME"],
    host: "localhost",
    database: "bookstore_db",
  },
} satisfies Config;
