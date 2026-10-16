"use client";

import { useActionState, useEffect, useRef } from "react";
import { addMemberUpdate } from "@/app/(app)/members/actions";
import { idle } from "@/lib/action-result";
import { Alert, Field, Input, Textarea } from "./ui";
import { SubmitButton } from "./submit-button";

export function UpdateForm({ memberId }: { memberId: string }) {
  const [state, action] = useActionState(addMemberUpdate, idle);
  const formRef = useRef<HTMLFormElement>(null);
  useEffect(() => {
    if (state.ok && state.message) formRef.current?.reset();
  }, [state]);
  const errors = !state.ok ? state.fieldErrors ?? {} : {};

  return (
    <form ref={formRef} action={action} className="space-y-3">
      <input type="hidden" name="memberId" value={memberId} />
      {!state.ok ? <Alert tone="error">{state.error}</Alert> : state.message ? <Alert tone="success">{state.message}</Alert> : null}
      <Field label="動態內容" htmlFor="body" error={errors.body}>
        <Textarea id="body" name="body" placeholder="例如：本週參加小組聚會，分享近況…" required maxLength={5000} />
      </Field>
      <div className="flex flex-wrap items-end justify-between gap-3">
        <Field label="日期（選填）" htmlFor="occurredOn" error={errors.occurredOn}>
          <Input id="occurredOn" name="occurredOn" type="date" className="w-auto" />
        </Field>
        <SubmitButton pendingText="新增中…">新增動態</SubmitButton>
      </div>
    </form>
  );
}
