import { ConfirmButton } from "@/components/confirm-button";
import { CreateUserForm } from "@/components/create-user-form";
import { ResetPasswordForm } from "@/components/reset-password-form";
import { Badge, Card, PageHeader, Select } from "@/components/ui";
import { listChurchUsers } from "@/lib/data/users";
import { formatDate } from "@/lib/format";
import { ROLE_LABELS, ROLES } from "@/lib/permissions";
import { requirePermission } from "@/lib/session";
import { removeUser, setUserRole, toggleUserBan } from "./actions";

export const metadata = { title: "使用者管理" };

export default async function UsersPage() {
  const admin = await requirePermission("users:manage");
  const users = await listChurchUsers(admin.churchId);

  return (
    <div className="space-y-6">
      <PageHeader title="使用者管理" description="管理可以登入本系統的帳號與權限。會員資料請到「會員」頁面管理。" />

      <Card title="權限說明">
        <ul className="grid gap-2 text-sm sm:grid-cols-3">
          <li>
            <Badge tone="admin">管理員</Badge>
            <p className="mt-1 text-slate-600 dark:text-slate-400">所有權限，含建立帳號、刪除會員、查看操作紀錄。</p>
          </li>
          <li>
            <Badge tone="staff">同工</Badge>
            <p className="mt-1 text-slate-600 dark:text-slate-400">新增與編輯會員、動態、照片，可查看敏感資料與證件照。</p>
          </li>
          <li>
            <Badge tone="viewer">一般使用者</Badge>
            <p className="mt-1 text-slate-600 dark:text-slate-400">只能瀏覽基本資料與活動照片，看不到敏感欄位。</p>
          </li>
        </ul>
      </Card>

      <Card title="新增帳號">
        <CreateUserForm />
      </Card>

      <Card title={`帳號列表（${users.length}）`}>
        <ul className="divide-y divide-slate-200 dark:divide-slate-700">
          {users.map((u) => {
            const isSelf = u.id === admin.id;
            return (
              <li key={u.id} className="py-4">
                <div className="flex flex-wrap items-start justify-between gap-3">
                  <div className="min-w-0">
                    <p className="font-medium">
                      {u.name}
                      {isSelf ? <span className="ml-2 text-xs text-slate-500">（您自己）</span> : null}
                    </p>
                    <p className="truncate text-sm text-slate-500">{u.email}</p>
                    <p className="mt-1 flex flex-wrap items-center gap-2 text-xs text-slate-500">
                      <Badge tone={u.role}>{ROLE_LABELS[u.role]}</Badge>
                      {u.banned ? <Badge tone="danger">已停用</Badge> : null}
                      <span>建立於 {formatDate(u.createdAt)}</span>
                    </p>
                  </div>
                  {!isSelf ? (
                    <div className="flex flex-wrap items-center gap-2">
                      <form action={setUserRole} className="flex items-center gap-1">
                        <input type="hidden" name="userId" value={u.id} />
                        <Select name="role" defaultValue={u.role} className="w-auto py-1 text-sm" aria-label="角色">
                          {ROLES.map((r) => (
                            <option key={r} value={r}>
                              {ROLE_LABELS[r]}
                            </option>
                          ))}
                        </Select>
                        <button type="submit" className="rounded-lg px-2 py-1 text-sm text-accent hover:bg-accent/10">
                          變更角色
                        </button>
                      </form>
                      <form action={toggleUserBan}>
                        <input type="hidden" name="userId" value={u.id} />
                        <ConfirmButton variant="secondary" className="px-3 py-1 text-sm" message={u.banned ? `要重新啟用 ${u.email} 嗎？` : `停用後 ${u.email} 將無法登入，確定嗎？`}>
                          {u.banned ? "啟用" : "停用"}
                        </ConfirmButton>
                      </form>
                      <ResetPasswordForm userId={u.id} />
                      <form action={removeUser}>
                        <input type="hidden" name="userId" value={u.id} />
                        <ConfirmButton variant="danger" className="px-3 py-1 text-sm" message={`確定要刪除帳號 ${u.email} 嗎？此操作無法復原。`}>
                          刪除
                        </ConfirmButton>
                      </form>
                    </div>
                  ) : null}
                </div>
              </li>
            );
          })}
        </ul>
      </Card>
    </div>
  );
}
