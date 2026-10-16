"use server";

import { and, eq } from "drizzle-orm";
import { headers } from "next/headers";
import { revalidatePath } from "next/cache";
import { z } from "zod";
import { db } from "@/db";
import { passkey } from "@/db/schema";
import { errorMessage, type ActionResult } from "@/lib/action-result";
import { auth } from "@/lib/auth";
import { logAudit } from "@/lib/data/audit";
import { assertPermission } from "@/lib/session";

const passwordSchema = z
  .object({
    currentPassword: z.string().min(1, "請輸入目前密碼"),
    newPassword: z.string().min(8, "新密碼至少 8 個字元").max(128),
    confirmPassword: z.string(),
  })
  .refine((v) => v.newPassword === v.confirmPassword, { message: "兩次輸入的新密碼不一致", path: ["confirmPassword"] });

export async function changePassword(_prev: ActionResult, formData: FormData): Promise<ActionResult> {
  try {
    const actor = await assertPermission("members:read");
    const parsed = passwordSchema.safeParse({
      currentPassword: formData.get("currentPassword") ?? "",
      newPassword: formData.get("newPassword") ?? "",
      confirmPassword: formData.get("confirmPassword") ?? "",
    });
    if (!parsed.success) {
      return { ok: false, error: "請檢查欄位", fieldErrors: z.flattenError(parsed.error).fieldErrors as Record<string, string[]> };
    }
    await auth.api.changePassword({
      body: {
        currentPassword: parsed.data.currentPassword,
        newPassword: parsed.data.newPassword,
        revokeOtherSessions: true,
      },
      headers: await headers(),
    });
    await logAudit(db, { actor, action: "account.password.change", entityType: "account", entityId: actor.id });
    return { ok: true, message: "密碼已更新，其他裝置已登出" };
  } catch (error) {
    const message = errorMessage(error);
    return { ok: false, error: /invalid password|incorrect/i.test(message) ? "目前密碼不正確" : message };
  }
}

export async function deletePasskey(formData: FormData): Promise<void> {
  const actor = await assertPermission("members:read");
  const id = String(formData.get("id") ?? "");
  await db.transaction(async (tx) => {
    const [removed] = await tx
      .delete(passkey)
      .where(and(eq(passkey.id, id), eq(passkey.userId, actor.id)))
      .returning({ id: passkey.id, name: passkey.name });
    if (removed) {
      await logAudit(tx, { actor, action: "account.passkey.remove", entityType: "account", entityId: actor.id, details: { name: removed.name } });
    }
  });
  revalidatePath("/settings");
}

export async function recordPasskeyAdded(name: string | null): Promise<void> {
  const actor = await assertPermission("members:read");
  await logAudit(db, { actor, action: "account.passkey.add", entityType: "account", entityId: actor.id, details: { name } });
  revalidatePath("/settings");
}
