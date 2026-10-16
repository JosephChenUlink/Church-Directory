"use server";

import { headers } from "next/headers";
import { revalidatePath } from "next/cache";
import { z } from "zod";
import { db } from "@/db";
import { errorMessage, type ActionResult } from "@/lib/action-result";
import { auth } from "@/lib/auth";
import { logAudit } from "@/lib/data/audit";
import { getChurchUser } from "@/lib/data/users";
import { ROLES, isRole } from "@/lib/permissions";
import { assertPermission } from "@/lib/session";

const createSchema = z.object({
  name: z.string().trim().min(1, "請輸入姓名").max(100),
  email: z.email("電子郵件格式不正確").transform((v) => v.toLowerCase()),
  password: z.string().min(8, "密碼至少 8 個字元").max(128),
  role: z.enum(ROLES),
});

export async function createUser(_prev: ActionResult, formData: FormData): Promise<ActionResult> {
  try {
    const actor = await assertPermission("users:manage");
    const parsed = createSchema.safeParse({
      name: formData.get("name") ?? "",
      email: formData.get("email") ?? "",
      password: formData.get("password") ?? "",
      role: formData.get("role") ?? "viewer",
    });
    if (!parsed.success) {
      return { ok: false, error: "請檢查欄位", fieldErrors: z.flattenError(parsed.error).fieldErrors as Record<string, string[]> };
    }
    const { name, email, password, role } = parsed.data;
    const result = await auth.api.createUser({
      body: { name, email, password, role, data: { churchId: actor.churchId } },
      headers: await headers(),
    });
    await logAudit(db, { actor, action: "user.create", entityType: "user", entityId: result.user.id, details: { email, role } });
    revalidatePath("/admin/users");
    return { ok: true, message: `已建立帳號 ${email}` };
  } catch (error) {
    const message = errorMessage(error);
    return { ok: false, error: /already exists/i.test(message) ? "此電子郵件已被使用" : message };
  }
}

async function targetUser(actorChurchId: string, formData: FormData) {
  const userId = String(formData.get("userId") ?? "");
  const target = await getChurchUser(actorChurchId, userId);
  if (!target) throw new Error("找不到使用者");
  return target;
}

export async function setUserRole(formData: FormData): Promise<void> {
  const actor = await assertPermission("users:manage");
  const target = await targetUser(actor.churchId, formData);
  const role = formData.get("role");
  if (!isRole(role)) throw new Error("角色不正確");
  if (target.id === actor.id && role !== "admin") throw new Error("不能移除自己的管理員權限");
  await auth.api.setRole({ body: { userId: target.id, role }, headers: await headers() });
  await logAudit(db, { actor, action: "user.role.set", entityType: "user", entityId: target.id, details: { role } });
  revalidatePath("/admin/users");
}

export async function toggleUserBan(formData: FormData): Promise<void> {
  const actor = await assertPermission("users:manage");
  const target = await targetUser(actor.churchId, formData);
  if (target.id === actor.id) throw new Error("不能停用自己的帳號");
  const requestHeaders = await headers();
  if (target.banned) {
    await auth.api.unbanUser({ body: { userId: target.id }, headers: requestHeaders });
    await logAudit(db, { actor, action: "user.enable", entityType: "user", entityId: target.id });
  } else {
    await auth.api.banUser({ body: { userId: target.id, banReason: "由管理員停用" }, headers: requestHeaders });
    await logAudit(db, { actor, action: "user.disable", entityType: "user", entityId: target.id });
  }
  revalidatePath("/admin/users");
}

export async function resetUserPassword(_prev: ActionResult, formData: FormData): Promise<ActionResult> {
  try {
    const actor = await assertPermission("users:manage");
    const target = await targetUser(actor.churchId, formData);
    const newPassword = String(formData.get("newPassword") ?? "");
    if (newPassword.length < 8) return { ok: false, error: "新密碼至少 8 個字元" };
    await auth.api.setUserPassword({ body: { userId: target.id, newPassword }, headers: await headers() });
    await auth.api.revokeUserSessions({ body: { userId: target.id }, headers: await headers() });
    await logAudit(db, { actor, action: "user.password.reset", entityType: "user", entityId: target.id });
    revalidatePath("/admin/users");
    return { ok: true, message: `已重設 ${target.email} 的密碼` };
  } catch (error) {
    return { ok: false, error: errorMessage(error) };
  }
}

export async function removeUser(formData: FormData): Promise<void> {
  const actor = await assertPermission("users:manage");
  const target = await targetUser(actor.churchId, formData);
  if (target.id === actor.id) throw new Error("不能刪除自己的帳號");
  await auth.api.removeUser({ body: { userId: target.id }, headers: await headers() });
  await logAudit(db, { actor, action: "user.remove", entityType: "user", entityId: target.id, details: { email: target.email } });
  revalidatePath("/admin/users");
}
