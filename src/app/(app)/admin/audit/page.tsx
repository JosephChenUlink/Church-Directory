import { Card, PageHeader } from "@/components/ui";
import { listRecentAudit } from "@/lib/data/audit";
import { formatDateTime } from "@/lib/format";
import { requirePermission } from "@/lib/session";

export const metadata = { title: "操作紀錄" };

const ACTION_LABELS: Record<string, string> = {
  "member.create": "新增會員",
  "member.update": "編輯會員",
  "member.delete": "刪除會員",
  "member.profile_photo.update": "更新大頭照",
  "member.profile_photo.remove": "移除大頭照",
  "member.id_photo.update": "更新證件照",
  "member.id_photo.remove": "移除證件照",
  "member.photo.add": "新增活動照片",
  "member.photo.remove": "刪除活動照片",
  "member.update_note.add": "新增動態",
  "member.update_note.remove": "刪除動態",
  "user.create": "建立帳號",
  "user.role.set": "變更角色",
  "user.enable": "啟用帳號",
  "user.disable": "停用帳號",
  "user.password.reset": "重設密碼",
  "user.remove": "刪除帳號",
  "account.password.change": "更改自己的密碼",
  "account.passkey.add": "新增 Passkey",
  "account.passkey.remove": "移除 Passkey",
};

export default async function AuditPage() {
  const admin = await requirePermission("audit:read");
  const logs = await listRecentAudit(admin.churchId, 200);

  return (
    <div className="space-y-6">
      <PageHeader title="操作紀錄" description="最近 200 筆資料異動，依時間由新到舊。" />
      <Card>
        {logs.length === 0 ? (
          <p className="text-sm text-slate-500">尚無紀錄。</p>
        ) : (
          <ul className="divide-y divide-slate-200 text-sm dark:divide-slate-700">
            {logs.map((log) => (
              <li key={log.id} className="flex flex-wrap items-baseline justify-between gap-2 py-2">
                <span>
                  <span className="font-medium">{log.actorName ?? "系統"}</span>
                  <span className="mx-2 text-slate-500">{ACTION_LABELS[log.action] ?? log.action}</span>
                  {log.details && Object.keys(log.details).length > 0 ? (
                    <span className="text-xs text-slate-500">
                      {Object.entries(log.details)
                        .map(([k, v]) => `${k}: ${String(v)}`)
                        .join("，")}
                    </span>
                  ) : null}
                </span>
                <time className="text-xs text-slate-500">{formatDateTime(log.createdAt)}</time>
              </li>
            ))}
          </ul>
        )}
      </Card>
    </div>
  );
}
