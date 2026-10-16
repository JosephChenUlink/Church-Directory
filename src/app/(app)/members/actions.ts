"use server";

import { and, eq } from "drizzle-orm";
import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";
import { z } from "zod";
import { db } from "@/db";
import { memberUpdates, members } from "@/db/schema";
import { errorMessage, type ActionResult } from "@/lib/action-result";
import { logAudit } from "@/lib/data/audit";
import { deleteActivityPhoto, removeMemberPortrait } from "@/lib/data/photos";
import { assertPermission } from "@/lib/session";

const text = (max = 200) => z.string().trim().max(max, `不可超過 ${max} 個字`).transform((v) => (v === "" ? null : v));
const dateField = z
  .string()
  .trim()
  .regex(/^(\d{4}-\d{2}-\d{2})?$/, "日期格式須為 YYYY-MM-DD")
  .transform((v) => (v === "" ? null : v));

const memberSchema = z.object({
  fullName: z.string().trim().min(1, "請輸入姓名").max(100),
  englishName: text(100),
  gender: z.enum(["", "male", "female", "other"]).transform((v) => (v === "" ? null : v)),
  birthDate: dateField,
  mobile: text(50),
  phone: text(50),
  email: z.union([z.literal(""), z.email("電子郵件格式不正確")]).transform((v) => (v === "" ? null : v)),
  fellowshipGroup: text(100),
  membershipStatus: z.enum(["active", "visitor", "inactive", "transferred", "deceased"]),
  baptismDate: dateField,
  joinedAt: dateField,
  occupation: text(100),
  nationalId: text(30),
  address: text(300),
  emergencyContactName: text(100),
  emergencyContactPhone: text(50),
  internalNotes: text(5000),
});

export type MemberFormValues = z.input<typeof memberSchema>;
const MEMBER_FIELDS = Object.keys(memberSchema.shape) as (keyof MemberFormValues)[];

function readForm(formData: FormData, keys: readonly string[]) {
  return Object.fromEntries(keys.map((key) => [key, String(formData.get(key) ?? "")]));
}

export async function saveMember(_prev: ActionResult, formData: FormData): Promise<ActionResult> {
  let actor;
  try {
    actor = await assertPermission("members:write");
  } catch (error) {
    return { ok: false, error: errorMessage(error) };
  }

  const parsed = memberSchema.safeParse(readForm(formData, MEMBER_FIELDS));
  if (!parsed.success) {
    const flattened = z.flattenError(parsed.error);
    return { ok: false, error: "請檢查紅色欄位", fieldErrors: flattened.fieldErrors as Record<string, string[]> };
  }

  const memberId = String(formData.get("id") ?? "");
  const values = parsed.data;

  try {
    const savedId = await db.transaction(async (tx) => {
      if (memberId) {
        const [updated] = await tx
          .update(members)
          .set({ ...values, updatedAt: new Date(), updatedBy: actor.id })
          .where(and(eq(members.id, memberId), eq(members.churchId, actor.churchId)))
          .returning({ id: members.id });
        if (!updated) throw new Error("找不到會員");
        await logAudit(tx, { actor, action: "member.update", entityType: "member", entityId: memberId });
        return updated.id;
      }
      const [created] = await tx
        .insert(members)
        .values({ ...values, churchId: actor.churchId, createdBy: actor.id, updatedBy: actor.id })
        .returning({ id: members.id });
      await logAudit(tx, { actor, action: "member.create", entityType: "member", entityId: created.id, details: { fullName: values.fullName } });
      return created.id;
    });
    revalidatePath("/members");
    revalidatePath(`/members/${savedId}`);
    redirect(`/members/${savedId}`);
  } catch (error) {
    if (isRedirectError(error)) throw error;
    return { ok: false, error: errorMessage(error) };
  }
}

export async function deleteMember(formData: FormData): Promise<void> {
  const actor = await assertPermission("members:delete");
  const memberId = String(formData.get("id") ?? "");
  await db.transaction(async (tx) => {
    const [deleted] = await tx
      .update(members)
      .set({ deletedAt: new Date(), updatedBy: actor.id })
      .where(and(eq(members.id, memberId), eq(members.churchId, actor.churchId)))
      .returning({ id: members.id, fullName: members.fullName });
    if (!deleted) throw new Error("找不到會員");
    await logAudit(tx, { actor, action: "member.delete", entityType: "member", entityId: memberId, details: { fullName: deleted.fullName } });
  });
  revalidatePath("/members");
  redirect("/members");
}

const updateSchema = z.object({
  memberId: z.uuid(),
  body: z.string().trim().min(1, "請輸入內容").max(5000, "內容不可超過 5000 字"),
  occurredOn: dateField,
});

export async function addMemberUpdate(_prev: ActionResult, formData: FormData): Promise<ActionResult> {
  try {
    const actor = await assertPermission("updates:write");
    const parsed = updateSchema.safeParse(readForm(formData, ["memberId", "body", "occurredOn"]));
    if (!parsed.success) {
      return { ok: false, error: "請檢查欄位", fieldErrors: z.flattenError(parsed.error).fieldErrors as Record<string, string[]> };
    }
    const { memberId, body, occurredOn } = parsed.data;
    const member = await db.query.members.findFirst({
      where: and(eq(members.id, memberId), eq(members.churchId, actor.churchId)),
      columns: { id: true },
    });
    if (!member) return { ok: false, error: "找不到會員" };

    await db.transaction(async (tx) => {
      const [row] = await tx
        .insert(memberUpdates)
        .values({ churchId: actor.churchId, memberId, authorId: actor.id, body, occurredOn })
        .returning({ id: memberUpdates.id });
      await logAudit(tx, { actor, action: "member.update_note.add", entityType: "member_update", entityId: row.id, details: { memberId } });
    });
    revalidatePath(`/members/${memberId}`);
    revalidatePath("/");
    return { ok: true, message: "已新增動態" };
  } catch (error) {
    return { ok: false, error: errorMessage(error) };
  }
}

export async function deleteMemberUpdate(formData: FormData): Promise<void> {
  const actor = await assertPermission("updates:write");
  const updateId = String(formData.get("id") ?? "");
  const row = await db.query.memberUpdates.findFirst({
    where: and(eq(memberUpdates.id, updateId), eq(memberUpdates.churchId, actor.churchId)),
  });
  if (!row) return;
  if (row.authorId !== actor.id && actor.role !== "admin") {
    throw new Error("只能刪除自己新增的動態");
  }
  await db.transaction(async (tx) => {
    await tx.delete(memberUpdates).where(eq(memberUpdates.id, updateId));
    await logAudit(tx, { actor, action: "member.update_note.remove", entityType: "member_update", entityId: updateId, details: { memberId: row.memberId } });
  });
  revalidatePath(`/members/${row.memberId}`);
}

export async function removePortrait(formData: FormData): Promise<void> {
  const actor = await assertPermission("photos:write");
  const memberId = String(formData.get("memberId") ?? "");
  const kind = formData.get("kind") === "id" ? "id" : "profile";
  await removeMemberPortrait(actor, memberId, kind);
  revalidatePath(`/members/${memberId}`);
  revalidatePath("/members");
}

export async function deletePhoto(formData: FormData): Promise<void> {
  const actor = await assertPermission("photos:write");
  const memberId = await deleteActivityPhoto(actor, String(formData.get("id") ?? ""));
  revalidatePath(`/members/${memberId}`);
}

function isRedirectError(error: unknown): boolean {
  return typeof error === "object" && error !== null && "digest" in error && String((error as { digest: unknown }).digest).startsWith("NEXT_REDIRECT");
}
