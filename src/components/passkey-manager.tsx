"use client";

import { useRouter } from "next/navigation";
import { useState, useSyncExternalStore } from "react";
import { authClient } from "@/lib/auth-client";
import { formatDateTime } from "@/lib/format";
import { deletePasskey, recordPasskeyAdded } from "@/app/(app)/settings/actions";
import { Alert, Button, Input } from "./ui";
import { ConfirmButton } from "./confirm-button";

export interface PasskeyRow {
  id: string;
  name: string | null;
  deviceType: string;
  backedUp: boolean;
  createdAt: Date | null;
}

export function PasskeyManager({ passkeys }: { passkeys: PasskeyRow[] }) {
  const router = useRouter();
  const [name, setName] = useState("");
  const [message, setMessage] = useState<{ tone: "error" | "success"; text: string } | null>(null);
  const [pending, setPending] = useState(false);
  // 伺服器端一律視為不支援，瀏覽器端再依實際能力更新，避免 hydration 不一致
  const supported = useSyncExternalStore(subscribeNoop, () => Boolean(window.PublicKeyCredential), () => false);

  async function addPasskey() {
    setMessage(null);
    setPending(true);
    const label = name.trim() || defaultDeviceName();
    const result = await authClient.passkey.addPasskey({ name: label });
    setPending(false);
    if (result?.error) {
      if (!/cancel|abort|NotAllowed/i.test(result.error.message ?? "")) setMessage({ tone: "error", text: `建立失敗：${result.error.message ?? "未知錯誤"}` });
      return;
    }
    await recordPasskeyAdded(label);
    setName("");
    setMessage({ tone: "success", text: "Passkey 已建立，下次可直接用 Face ID／指紋登入" });
    router.refresh();
  }

  return (
    <div className="space-y-4">
      {message ? <Alert tone={message.tone}>{message.text}</Alert> : null}
      {passkeys.length === 0 ? (
        <p className="text-sm text-slate-500">尚未建立任何 Passkey。</p>
      ) : (
        <ul className="divide-y divide-slate-200 dark:divide-slate-700">
          {passkeys.map((pk) => (
            <li key={pk.id} className="flex items-center justify-between gap-3 py-2 text-sm">
              <div>
                <p className="font-medium">{pk.name || "未命名裝置"}</p>
                <p className="text-xs text-slate-500">
                  建立於 {formatDateTime(pk.createdAt)}
                  {pk.backedUp ? "・已同步至雲端" : ""}
                </p>
              </div>
              <form action={deletePasskey}>
                <input type="hidden" name="id" value={pk.id} />
                <ConfirmButton variant="ghost" message="確定要移除這個 Passkey 嗎？">
                  移除
                </ConfirmButton>
              </form>
            </li>
          ))}
        </ul>
      )}
      {supported ? (
        <div className="flex flex-col gap-2 sm:flex-row">
          <Input placeholder="裝置名稱（例如：我的 iPhone）" value={name} onChange={(e) => setName(e.target.value)} maxLength={60} />
          <Button type="button" onClick={addPasskey} disabled={pending} className="sm:shrink-0">
            {pending ? "等待裝置驗證…" : "新增 Passkey"}
          </Button>
        </div>
      ) : (
        <p className="text-sm text-slate-500">此瀏覽器不支援 Passkey。</p>
      )}
    </div>
  );
}

function subscribeNoop() {
  return () => {};
}

function defaultDeviceName() {
  const ua = navigator.userAgent;
  if (/iPhone/.test(ua)) return "iPhone";
  if (/iPad/.test(ua)) return "iPad";
  if (/Android/.test(ua)) return "Android 手機";
  if (/Macintosh/.test(ua)) return "Mac";
  if (/Windows/.test(ua)) return "Windows 電腦";
  return "我的裝置";
}
