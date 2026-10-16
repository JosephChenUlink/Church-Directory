import "server-only";
import { asc, eq } from "drizzle-orm";
import { db } from "@/db";
import { passkey, user } from "@/db/schema";
import { normalizeRole, type Role } from "@/lib/permissions";

export interface DirectoryUser {
  id: string;
  name: string;
  email: string;
  role: Role;
  banned: boolean;
  banReason: string | null;
  createdAt: Date;
}

export async function listChurchUsers(churchId: string): Promise<DirectoryUser[]> {
  const rows = await db.query.user.findMany({
    where: eq(user.churchId, churchId),
    orderBy: [asc(user.name)],
  });
  return rows.map((row) => ({
    id: row.id,
    name: row.name,
    email: row.email,
    role: normalizeRole(row.role),
    banned: Boolean(row.banned),
    banReason: row.banReason ?? null,
    createdAt: row.createdAt,
  }));
}

export async function getChurchUser(churchId: string, userId: string) {
  const row = await db.query.user.findFirst({ where: eq(user.id, userId) });
  if (!row || row.churchId !== churchId) return null;
  return row;
}

export async function listUserPasskeys(userId: string) {
  return db.query.passkey.findMany({
    where: eq(passkey.userId, userId),
    orderBy: [asc(passkey.createdAt)],
    columns: { id: true, name: true, deviceType: true, backedUp: true, createdAt: true, aaguid: true },
  });
}
