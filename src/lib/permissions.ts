/**
 * 角色與權限定義。
 *
 * - admin  管理員：所有權限，含使用者帳號管理
 * - staff  同工：可新增、編輯會員資料、動態與照片，可看敏感欄位
 * - viewer 一般使用者：只能瀏覽基本資料，看不到敏感欄位
 */
export const ROLES = ["admin", "staff", "viewer"] as const;
export type Role = (typeof ROLES)[number];

export const ROLE_LABELS: Record<Role, string> = {
  admin: "管理員",
  staff: "同工",
  viewer: "一般使用者",
};

export const PERMISSIONS = [
  "members:read",
  "members:read_sensitive",
  "members:write",
  "members:delete",
  "updates:write",
  "photos:write",
  "users:manage",
  "audit:read",
] as const;
export type Permission = (typeof PERMISSIONS)[number];

const ROLE_PERMISSIONS: Record<Role, ReadonlySet<Permission>> = {
  admin: new Set(PERMISSIONS),
  staff: new Set([
    "members:read",
    "members:read_sensitive",
    "members:write",
    "updates:write",
    "photos:write",
  ]),
  viewer: new Set(["members:read"]),
};

export function isRole(value: unknown): value is Role {
  return typeof value === "string" && (ROLES as readonly string[]).includes(value);
}

export function normalizeRole(value: unknown): Role {
  return isRole(value) ? value : "viewer";
}

export function can(role: Role, permission: Permission): boolean {
  return ROLE_PERMISSIONS[role].has(permission);
}
