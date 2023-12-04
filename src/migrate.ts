import { migrate } from "drizzle-orm/postgres-js/migrator";
import { drizzle } from "drizzle-orm/postgres-js";
import postgres from "postgres";
import * as schema from "./schema";

const connection = postgres("postgres://0.0.0.0:5432/bookstore_db");

export const db = drizzle(connection, { schema });

// This will run migrations on the database, skipping the ones already applied
(async () => {
  await migrate(db, { migrationsFolder: "drizzle/migrations" });
  await connection.end();
})();
