import { sql } from "drizzle-orm";
import { NextResponse } from "next/server";
import { db } from "@/db";

/**
 * 健康檢查。也可作為免費方案的「保持喚醒」端點：
 * 定期呼叫此端點會對資料庫做一次查詢，避免 Supabase 免費專案因閒置而暫停。
 */
export async function GET() {
  try {
    await db.execute(sql`select 1`);
    return NextResponse.json({ ok: true, time: new Date().toISOString() });
  } catch (error) {
    return NextResponse.json({ ok: false, error: error instanceof Error ? error.message : "db error" }, { status: 503 });
  }
}
