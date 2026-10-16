import { createAccessControl } from "better-auth/plugins/access";
import { adminAc, defaultStatements } from "better-auth/plugins/admin/access";

/**
 * Better Auth admin 外掛的角色定義。
 * 這裡只決定「誰可以管理帳號」；會員資料的權限由 permissions.ts 控制。
 */
const statement = { ...defaultStatements } as const;
export const ac = createAccessControl(statement);

export const authRoles = {
  admin: ac.newRole({ ...adminAc.statements }),
  staff: ac.newRole({ user: [], session: [] }),
  viewer: ac.newRole({ user: [], session: [] }),
};
