import "server-only";
import { headers } from "next/headers";
import { redirect } from "next/navigation";
import { cache } from "react";
import { auth } from "./auth";
import { can, normalizeRole, type Permission, type Role } from "./permissions";

export interface CurrentUser {
  id: string;
  name: string;
  email: string;
  role: Role;
  churchId: string;
}

/** 讀取目前登入者。同一次請求內多次呼叫只會查一次。 */
export const getCurrentUser = cache(async (): Promise<CurrentUser | null> => {
  const session = await auth.api.getSession({ headers: await headers() });
  if (!session) return null;
  const { user } = session;
  if (user.banned) return null;
  return {
    id: user.id,
    name: user.name,
    email: user.email,
    role: normalizeRole(user.role),
    churchId: user.churchId,
  };
});

/** 頁面用：未登入導向登入頁 */
export async function requireUser(): Promise<CurrentUser> {
  const user = await getCurrentUser();
  if (!user) redirect("/login");
  return user;
}

/** 頁面用：缺少權限導向無權限頁 */
export async function requirePermission(permission: Permission): Promise<CurrentUser> {
  const user = await requireUser();
  if (!can(user.role, permission)) redirect("/forbidden");
  return user;
}

export class AuthorizationError extends Error {
  constructor(message = "您沒有權限執行此操作") {
    super(message);
    this.name = "AuthorizationError";
  }
}

/** Server Action / API 用：缺少權限直接拋錯，由呼叫端轉成錯誤訊息 */
export async function assertPermission(permission: Permission): Promise<CurrentUser> {
  const user = await getCurrentUser();
  if (!user) throw new AuthorizationError("請先登入");
  if (!can(user.role, permission)) throw new AuthorizationError();
  return user;
}
