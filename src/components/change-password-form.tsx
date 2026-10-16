"use client";

import { useActionState, useEffect, useRef } from "react";
import { changePassword } from "@/app/(app)/settings/actions";
import { idle } from "@/lib/action-result";
import { Alert, Field, Input } from "./ui";
import { SubmitButton } from "./submit-button";

export function ChangePasswordForm() {
  const [state, action] = useActionState(changePassword, idle);
  const formRef = useRef<HTMLFormElement>(null);
  useEffect(() => {
    if (state.ok && state.message) formRef.current?.reset();
  }, [state]);
  const errors = !state.ok ? state.fieldErrors ?? {} : {};

  return (
    <form ref={formRef} action={action} className="max-w-md space-y-4">
      {!state.ok ? <Alert tone="error">{state.error}</Alert> : state.message ? <Alert tone="success">{state.message}</Alert> : null}
      <Field label="目前密碼" htmlFor="currentPassword" error={errors.currentPassword}>
        <Input id="currentPassword" name="currentPassword" type="password" autoComplete="current-password" required />
      </Field>
      <Field label="新密碼" htmlFor="newPassword" error={errors.newPassword} hint="至少 8 個字元">
        <Input id="newPassword" name="newPassword" type="password" autoComplete="new-password" required minLength={8} />
      </Field>
      <Field label="再次輸入新密碼" htmlFor="confirmPassword" error={errors.confirmPassword}>
        <Input id="confirmPassword" name="confirmPassword" type="password" autoComplete="new-password" required minLength={8} />
      </Field>
      <SubmitButton pendingText="更新中…">更新密碼</SubmitButton>
    </form>
  );
}
