/**
 * 檢查 .env 的 DATABASE_URL 能否連上資料庫，並用白話說明常見錯誤。
 * 執行：npm run db:check
 */
import { Client } from "pg";

function describe(url: string) {
  try {
    const u = new URL(url);
    const user = decodeURIComponent(u.username);
    const host = u.hostname;
    const port = u.port || "5432";
    const problems: string[] = [];
    if (!u.password) problems.push("連線字串裡沒有密碼，請確認 [YOUR-PASSWORD] 已換成實際密碼");
    if (u.password.includes("[") || u.password.includes("]")) problems.push("密碼還包含中括號，[YOUR-PASSWORD] 要整段換掉，包含 [ 和 ]");
    if (host.endsWith("supabase.com") || host.endsWith("supabase.co")) {
      if (host.includes("pooler") && !user.includes(".")) problems.push(`使用 Supabase 連線池時使用者名稱應為「postgres.專案代碼」，目前是「${user}」，請改用 Connect 畫面的 Transaction pooler 字串`);
      if (!host.includes("pooler")) problems.push("這是 Direct connection 字串（port 5432），家用網路常無法連線，請改用 Transaction pooler（port 6543）");
    }
    return { user, host, port, problems };
  } catch {
    return { user: "?", host: "?", port: "?", problems: ["DATABASE_URL 格式不正確，應以 postgresql:// 開頭"] };
  }
}

async function main() {
  const url = process.env.DATABASE_URL;
  if (!url) {
    console.error("✘ .env 裡沒有 DATABASE_URL");
    process.exit(1);
  }
  const info = describe(url);
  console.log(`主機：${info.host}　port：${info.port}　使用者：${info.user}`);
  for (const p of info.problems) console.log(`⚠ ${p}`);

  const client = new Client({
    connectionString: url,
    ssl: /localhost|127\.0\.0\.1/.test(url) ? undefined : { rejectUnauthorized: false },
    connectionTimeoutMillis: 15000,
  });
  try {
    await client.connect();
    const version = await client.query("select version()");
    const tables = await client.query(
      "select table_name from information_schema.tables where table_schema = 'public' order by table_name",
    );
    console.log(`✔ 連線成功：${String(version.rows[0].version).split(" ").slice(0, 2).join(" ")}`);
    if (tables.rowCount === 0) {
      console.log("· 資料庫目前沒有任何資料表，接著請執行 npm run db:migrate");
    } else {
      console.log(`· 已有 ${tables.rowCount} 個資料表：${tables.rows.map((r) => r.table_name).join("、")}`);
      if (!tables.rows.some((r) => r.table_name === "members")) console.log("· 還沒有 members 資料表，請執行 npm run db:migrate");
    }
    await client.end();
  } catch (error) {
    const e = error as NodeJS.ErrnoException & { code?: string };
    const hints: Record<string, string> = {
      "28P01": "密碼不正確。請到 Supabase 的 Project Settings → Database → Reset database password 重設一組只含英文和數字的密碼，再更新 .env",
      ENOTFOUND: "找不到主機名稱，請確認連線字串是從 Supabase 的 Connect 畫面完整複製",
      ECONNREFUSED: "主機拒絕連線，請確認 port 是 6543（Transaction pooler）",
      ETIMEDOUT: "連線逾時，可能是網路或防火牆問題，請改用 Transaction pooler（port 6543）",
      "3D000": "資料庫名稱不存在，連線字串結尾應為 /postgres",
    };
    console.error(`✘ 連線失敗：${e.message}`);
    const hint = hints[e.code ?? ""] ?? (/timeout/i.test(e.message) ? hints.ETIMEDOUT : null);
    if (hint) console.error(`→ ${hint}`);
    process.exit(1);
  }
}

main();
