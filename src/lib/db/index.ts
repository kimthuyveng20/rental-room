import { drizzle } from "drizzle-orm/postgres-js";
import postgres from "postgres";
import * as schema from "./schema";

const connectionString = process.env.DATABASE_URL;

if (!connectionString) {
  throw new Error("❌ DATABASE_URL is missing!");
}

// Disable prefetch as it is not supported for "Transaction" pool mode (e.g., Supabase / PgBouncer)
const clientOptions = { prepare: false };

// Declare a global type for the client to persist across hot-reloads
const globalForDb = global as unknown as {
  conn: postgres.Sql | undefined;
};

// Reuse existing connection if available, otherwise create a new one
const client = globalForDb.conn || postgres(connectionString, clientOptions);

if (process.env.NODE_ENV !== "production") {
  globalForDb.conn = client;
}

export const db = drizzle(client, { schema });