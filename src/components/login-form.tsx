"use client";

import { useRouter } from "next/navigation";
import { useEffect, useRef, useState } from "react";
import { authClient } from "@/lib/auth-client";
import { Alert, Button, Field, Input } from "./ui";

export function LoginForm({ nextPath }: { nextPath: string }) {
  const router = useRouter();
  const [error, setError] = useState<string | null>(null);
  const [pending, setPending] = useState<"password" | "passkey" | null>(null);
  const [passkeySupported, setPasskeySupported] = useState(false);
  const autoFillStarted = useRef(false);

  const finish = () => {
    router.replace(nextPath.startsWith("/") ? nextPath : "/");
    router.refresh();
  };

  // 支援 Passkey 的瀏覽器：在帳號欄位顯示已儲存的 Passkey（條件式 UI）
  useEffect(() => {
    if (typeof window === "undefined" || !window.PublicKeyCredential) return;
    const check = PublicKeyCredential.isConditionalMediationAvailable?.() ?? Promise.resolve(false);
    check.then((available) => {
      setPasskeySupported(true);
      if (!available || autoFillStarted.current) return;
      autoFillStarted.current = true;
      authClient.signIn.passkey({ autoFill: true }).then((result) => {
        if (result?.data) finish();
      });
    });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  async function onPasswordSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError(null);
    setPending("password");
    const form = new FormData(event.currentTarget);
    const { error } = await authClient.signIn.email({
      email: String(form.get("email") ?? "").trim(),
      password: String(form.get("password") ?? ""),
    });
    setPending(null);
    if (error) {
      setError(error.status === 403 && /banned/i.test(error.message ?? "") ? "此帳號已被停用，請聯絡管理員" : "電子郵件或密碼不正確");
      return;
    }
    finish();
  }

  async function onPasskey() {
    setError(null);
    setPending("passkey");
    const result = await authClient.signIn.passkey();
    setPending(null);
    if (result?.error) {
      if (!/cancel|abort|NotAllowed/i.test(result.error.message ?? "")) setError("Passkey 登入失敗，請改用密碼登入");
      return;
    }
    finish();
  }

  return (
    <form onSubmit={onPasswordSubmit} className="space-y-4">
      {error ? <Alert tone="error">{error}</Alert> : null}
      <Field label="電子郵件" htmlFor="email">
        <Input id="email" name="email" type="email" autoComplete="username webauthn" required inputMode="email" autoFocus />
      </Field>
      <Field label="密碼" htmlFor="password">
        <Input id="password" name="password" type="password" autoComplete="current-password" required />
      </Field>
      <Button type="submit" className="w-full" disabled={pending !== null}>
        {pending === "password" ? "登入中…" : "登入"}
      </Button>
      {passkeySupported ? (
        <>
          <div className="relative text-center text-xs text-slate-400">
            <span className="relative z-10 bg-white px-2 dark:bg-slate-900">或</span>
            <span className="absolute inset-x-0 top-1/2 -z-0 border-t border-slate-200 dark:border-slate-700" />
          </div>
          <Button type="button" variant="secondary" className="w-full" onClick={onPasskey} disabled={pending !== null}>
            {pending === "passkey" ? "驗證中…" : "使用 Passkey（Face ID／指紋）登入"}
          </Button>
        </>
      ) : null}
    </form>
  );
}
