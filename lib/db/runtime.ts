import { drizzle } from "drizzle-orm/postgres-js";
import postgres from "postgres";
import * as schema from "@/db/schema";

const connectionString =
  process.env.DATABASE_URL ??
  (process.env.NODE_ENV !== "production"
    ? "postgresql://cidadefacil:cidadefacil_dev@localhost:5432/cidadefacil"
    : undefined);
if (!connectionString) throw new Error("DATABASE_URL não configurada.");

const globalDatabase = globalThis as typeof globalThis & {
  cidadeFacilSql?: ReturnType<typeof postgres>;
};

export const sqlClient =
  globalDatabase.cidadeFacilSql ??
  postgres(connectionString, {
    max: process.env.NODE_ENV === "production" ? 10 : 3,
    idle_timeout: 20,
    connect_timeout: 10,
  });

if (process.env.NODE_ENV !== "production") {
  globalDatabase.cidadeFacilSql = sqlClient;
}

export const db = drizzle(sqlClient, { schema });
