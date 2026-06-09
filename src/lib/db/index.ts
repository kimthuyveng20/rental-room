import { drizzle } from "drizzle-orm/postgres-js";
import postgres from "postgres";
import * as schema from "./schema";

const globalForDb = global as unknown as {
  conn: postgres.Sql | undefined;
};

export function getDb() {
  const connectionString = process.env.DATABASE_URL;

  if (!connectionString) {
    throw new Error("DATABASE_URL is missing");
  }

  const client =
    globalForDb.conn ||
    postgres(connectionString, {
      prepare: false,
    });

  if (process.env.NODE_ENV !== "production") {
    globalForDb.conn = client;
  }

  return drizzle(client, { schema });
}