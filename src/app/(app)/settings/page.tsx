import { ChangePasswordForm } from "@/components/change-password-form";
import { PasskeyManager } from "@/components/passkey-manager";
import { Badge, Card, DescriptionList } from "@/components/ui";
import { listUserPasskeys } from "@/lib/data/users";
import { ROLE_LABELS } from "@/lib/permissions";
import { requireUser } from "@/lib/session";

export const metadata = { title: "我的帳號" };

export default async function SettingsPage() {
  const user = await requireUser();
  const passkeys = await listUserPasskeys(user.id);

  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-bold tracking-tight">我的帳號</h1>

      <Card title="帳號資料">
        <DescriptionList
          items={[
            { label: "姓名", value: user.name },
            { label: "電子郵件", value: user.email },
            { label: "角色", value: <Badge tone={user.role}>{ROLE_LABELS[user.role]}</Badge> },
          ]}
        />
      </Card>

      <Card title="Passkey（Face ID／指紋／Windows Hello）">
        <p className="mb-4 text-sm text-slate-500">
          在手機或電腦上建立 Passkey 後，下次登入不需輸入密碼，直接以生物辨識驗證。每個裝置各建立一個即可。
        </p>
        <PasskeyManager passkeys={passkeys} />
      </Card>

      <Card title="更改密碼">
        <ChangePasswordForm />
      </Card>
    </div>
  );
}
