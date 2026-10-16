"use client";

import { useActionState, useEffect, useRef } from "react";
import { createUser } from "@/app/(app)/admin/users/actions";
import { idle } from "@/lib/action-result";
import { ROLE_LABELS, ROLES } from "@/lib/permissions";
import { Alert, Field, Input, Select } from "./ui";
import { SubmitButton } from "./submit-button";

export function CreateUserForm() {
  const [state, action] = useActionState(createUser, idle);
  const formRef = useRef<HTMLFormElement>(null);
  useEffect(() => {
    if (state.ok && state.message) formRef.current?.reset();
  }, [state]);
  const errors = !state.ok ? state.fieldErrors ?? {} : {};

  return (
    <form ref={formRef} action={action} className="space-y-4">
      {!state.ok ? <Alert tone="error">{state.error}</Alert> : state.message ? <Alert tone="success">{state.message}</Alert> : null}
      <div className="grid gap-4 sm:grid-cols-2">
        <Field label="姓名" htmlFor="new-name" error={errors.name}>
          <Input id="new-name" name="name" required maxLength={100} autoComplete="off" />
        </Field>
        <Field label="電子郵件（登入帳號）" htmlFor="new-email" error={errors.email}>
          <Input id="new-email" name="email" type="email" required autoComplete="off" />
        </Field>
        <Field label="初始密碼" htmlFor="new-password" error={errors.password} hint="至少 8 個字元，請提醒使用者登入後更改">
          <Input id="new-password" name="password" type="text" required minLength={8} autoComplete="off" />
        </Field>
        <Field label="角色" htmlFor="new-role" error={errors.role}>
          <Select id="new-role" name="role" defaultValue="viewer">
            {ROLES.map((r) => (
              <option key={r} value={r}>
                {ROLE_LABELS[r]}
              </option>
            ))}
          </Select>
        </Field>
      </div>
      <SubmitButton pendingText="建立中…">建立帳號</SubmitButton>
    </form>
  );
}
