"use client";

import { useActionState, useState } from "react";
import { resetUserPassword } from "@/app/(app)/admin/users/actions";
import { idle } from "@/lib/action-result";
import { Button, Input } from "./ui";
import { SubmitButton } from "./submit-button";

export function ResetPasswordForm({ userId }: { userId: string }) {
  const [open, setOpen] = useState(false);
  const [state, action] = useActionState(resetUserPassword, idle);

  if (!open) {
    return (
      <Button type="button" variant="secondary" className="px-3 py-1 text-sm" onClick={() => setOpen(true)}>
        重設密碼
      </Button>
    );
  }
  return (
    <form action={action} className="flex flex-wrap items-center gap-2">
      <input type="hidden" name="userId" value={userId} />
      <Input name="newPassword" type="text" placeholder="新密碼（至少 8 字）" minLength={8} required className="w-44 py-1 text-sm" autoComplete="off" />
      <SubmitButton className="px-3 py-1 text-sm" pendingText="重設中…">
        確認
      </SubmitButton>
      <Button type="button" variant="ghost" className="px-2 py-1 text-sm" onClick={() => setOpen(false)}>
        取消
      </Button>
      {!state.ok ? <span className="text-xs text-red-600">{state.error}</span> : state.message ? <span className="text-xs text-emerald-600">{state.message}</span> : null}
    </form>
  );
}
