/**
 * 初始化資料：建立教會與第一位管理員。
 * 執行：npm run db:seed（會讀取 .env）
 * 重複執行是安全的：已存在的教會或管理員會被略過。
 */
import { randomUUID } from "node:crypto";
import { eq } from "drizzle-orm";
import { hashPassword } from "better-auth/crypto";
import { db } from "../src/db";
import { account, churches, user } from "../src/db/schema";

async function main() {
  const slug = process.env.CHURCH_SLUG ?? "default";
  const name = process.env.NEXT_PUBLIC_CHURCH_NAME ?? "教會";
  const adminEmail = process.env.SEED_ADMIN_EMAIL;
  const adminPassword = process.env.SEED_ADMIN_PASSWORD;
  const adminName = process.env.SEED_ADMIN_NAME ?? "系統管理員";

  if (!adminEmail || !adminPassword) {
    throw new Error("請在 .env 設定 SEED_ADMIN_EMAIL 與 SEED_ADMIN_PASSWORD");
  }
  if (adminPassword.length < 8) {
    throw new Error("SEED_ADMIN_PASSWORD 至少需要 8 個字元");
  }

  let church = await db.query.churches.findFirst({ where: eq(churches.slug, slug) });
  if (!church) {
    [church] = await db.insert(churches).values({ slug, name }).returning();
    console.log(`✔ 已建立教會：${name}（${slug}）`);
  } else {
    console.log(`· 教會已存在：${church.name}（${slug}）`);
  }

  const existing = await db.query.user.findFirst({ where: eq(user.email, adminEmail.toLowerCase()) });
  if (existing) {
    console.log(`· 管理員已存在：${adminEmail}`);
    return;
  }

  const userId = randomUUID();
  const now = new Date();
  await db.transaction(async (tx) => {
    await tx.insert(user).values({
      id: userId,
      name: adminName,
      email: adminEmail.toLowerCase(),
      emailVerified: true,
      role: "admin",
      churchId: church!.id,
      createdAt: now,
      updatedAt: now,
    });
    await tx.insert(account).values({
      id: randomUUID(),
      accountId: userId,
      providerId: "credential",
      userId,
      password: await hashPassword(adminPassword),
      createdAt: now,
      updatedAt: now,
    });
  });
  console.log(`✔ 已建立管理員：${adminEmail}`);
  console.log("  請登入後立即到「我的帳號」更改密碼。");
}

main()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error("初始化失敗：", error);
    process.exit(1);
  });
