import "server-only";
import { randomUUID } from "node:crypto";
import { and, eq } from "drizzle-orm";
import { db } from "@/db";
import { memberPhotos, members } from "@/db/schema";
import { getStorage } from "@/lib/storage";
import { ALLOWED_IMAGE_TYPES, MAX_UPLOAD_BYTES, processImage } from "@/lib/storage/images";
import type { CurrentUser } from "@/lib/session";
import { logAudit } from "./audit";

export type PhotoKind = "profile" | "id" | "activity";

export function validateUpload(file: File): string | null {
  if (!file || file.size === 0) return "請選擇照片";
  if (file.size > MAX_UPLOAD_BYTES) return `照片不可超過 ${Math.round(MAX_UPLOAD_BYTES / 1024 / 1024)} MB`;
  if (!ALLOWED_IMAGE_TYPES.has(file.type) && !/\.(jpe?g|png|webp|heic|heif)$/i.test(file.name)) {
    return "只接受 JPG、PNG、WebP 或 HEIC 格式";
  }
  return null;
}

function buildKey(churchId: string, memberId: string, kind: PhotoKind, suffix = ""): string {
  return `${churchId}/members/${memberId}/${kind}/${randomUUID()}${suffix}.jpg`;
}

/** 上傳大頭照或證件照：舊的會被覆蓋並從儲存空間刪除 */
export async function uploadMemberPortrait(actor: CurrentUser, memberId: string, kind: "profile" | "id", file: File) {
  const member = await db.query.members.findFirst({
    where: and(eq(members.id, memberId), eq(members.churchId, actor.churchId)),
  });
  if (!member) throw new Error("找不到會員");

  const processed = await processImage(Buffer.from(await file.arrayBuffer()));
  const storage = getStorage();
  const mainKey = buildKey(actor.churchId, memberId, kind);
  await storage.put(mainKey, processed.main, processed.contentType);

  const oldKeys: string[] = [];
  if (kind === "profile") {
    const thumbKey = buildKey(actor.churchId, memberId, kind, "_thumb");
    await storage.put(thumbKey, processed.thumb, processed.contentType);
    if (member.profilePhotoKey) oldKeys.push(member.profilePhotoKey);
    if (member.profileThumbKey) oldKeys.push(member.profileThumbKey);
    await db.transaction(async (tx) => {
      await tx
        .update(members)
        .set({ profilePhotoKey: mainKey, profileThumbKey: thumbKey, updatedAt: new Date(), updatedBy: actor.id })
        .where(eq(members.id, memberId));
      await logAudit(tx, { actor, action: "member.profile_photo.update", entityType: "member", entityId: memberId });
    });
  } else {
    if (member.idPhotoKey) oldKeys.push(member.idPhotoKey);
    await db.transaction(async (tx) => {
      await tx
        .update(members)
        .set({ idPhotoKey: mainKey, updatedAt: new Date(), updatedBy: actor.id })
        .where(eq(members.id, memberId));
      await logAudit(tx, { actor, action: "member.id_photo.update", entityType: "member", entityId: memberId });
    });
  }
  await storage.delete(oldKeys).catch(() => undefined);
}

export async function removeMemberPortrait(actor: CurrentUser, memberId: string, kind: "profile" | "id") {
  const member = await db.query.members.findFirst({
    where: and(eq(members.id, memberId), eq(members.churchId, actor.churchId)),
  });
  if (!member) throw new Error("找不到會員");
  const keys = kind === "profile" ? [member.profilePhotoKey, member.profileThumbKey] : [member.idPhotoKey];
  await db.transaction(async (tx) => {
    await tx
      .update(members)
      .set(
        kind === "profile"
          ? { profilePhotoKey: null, profileThumbKey: null, updatedAt: new Date(), updatedBy: actor.id }
          : { idPhotoKey: null, updatedAt: new Date(), updatedBy: actor.id },
      )
      .where(eq(members.id, memberId));
    await logAudit(tx, { actor, action: `member.${kind}_photo.remove`, entityType: "member", entityId: memberId });
  });
  await getStorage()
    .delete(keys.filter((k): k is string => Boolean(k)))
    .catch(() => undefined);
}

/** 上傳活動照片，可多張 */
export async function uploadActivityPhoto(
  actor: CurrentUser,
  memberId: string,
  file: File,
  meta: { caption?: string | null; takenOn?: string | null },
) {
  const member = await db.query.members.findFirst({
    where: and(eq(members.id, memberId), eq(members.churchId, actor.churchId)),
    columns: { id: true },
  });
  if (!member) throw new Error("找不到會員");

  const processed = await processImage(Buffer.from(await file.arrayBuffer()));
  const storage = getStorage();
  const mainKey = buildKey(actor.churchId, memberId, "activity");
  const thumbKey = buildKey(actor.churchId, memberId, "activity", "_thumb");
  await Promise.all([
    storage.put(mainKey, processed.main, processed.contentType),
    storage.put(thumbKey, processed.thumb, processed.contentType),
  ]);

  return db.transaction(async (tx) => {
    const [photo] = await tx
      .insert(memberPhotos)
      .values({
        churchId: actor.churchId,
        memberId,
        kind: "activity",
        storageKey: mainKey,
        thumbKey,
        caption: meta.caption?.trim() || null,
        takenOn: meta.takenOn || null,
        width: processed.width,
        height: processed.height,
        sizeBytes: processed.main.byteLength,
        uploadedBy: actor.id,
      })
      .returning();
    await logAudit(tx, { actor, action: "member.photo.add", entityType: "member_photo", entityId: photo.id, details: { memberId } });
    return photo;
  });
}

export async function deleteActivityPhoto(actor: CurrentUser, photoId: string) {
  const photo = await db.query.memberPhotos.findFirst({
    where: and(eq(memberPhotos.id, photoId), eq(memberPhotos.churchId, actor.churchId)),
  });
  if (!photo) throw new Error("找不到照片");
  await db.transaction(async (tx) => {
    await tx.delete(memberPhotos).where(eq(memberPhotos.id, photoId));
    await logAudit(tx, { actor, action: "member.photo.remove", entityType: "member_photo", entityId: photoId, details: { memberId: photo.memberId } });
  });
  await getStorage()
    .delete([photo.storageKey, photo.thumbKey])
    .catch(() => undefined);
  return photo.memberId;
}
