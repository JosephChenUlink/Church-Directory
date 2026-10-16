import { drizzle } from "drizzle-orm/node-postgres";
import { Pool } from "pg";
import { env } from "@/lib/env";
import * as schema from "./schema";

declare global {
  var __churchPgPool: Pool | undefined;
}

// 開發模式下 Next.js 會熱重載模組，用全域變數避免重複建立連線池
const pool =
  globalThis.__churchPgPool ??
  new Pool({
    connectionString: env.databaseUrl,
    max: 10,
    // Supabase 連線池需要 SSL；本機 Postgres 不需要
    ssl: env.databaseUrl.includes("localhost") || env.databaseUrl.includes("127.0.0.1") ? undefined : { rejectUnauthorized: false },
  });
if (process.env.NODE_ENV !== "production") globalThis.__churchPgPool = pool;

export const db = drizzle(pool, { schema });
export type Database = typeof db;
