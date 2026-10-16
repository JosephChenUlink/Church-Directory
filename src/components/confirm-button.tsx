"use client";

import type { ComponentPropsWithoutRef } from "react";
import { useFormStatus } from "react-dom";
import { Button } from "./ui";

/** 送出前先跳出確認對話框的表單按鈕 */
export function ConfirmButton({ message, children, ...props }: ComponentPropsWithoutRef<typeof Button> & { message: string }) {
  const { pending } = useFormStatus();
  return (
    <Button
      type="submit"
      disabled={pending}
      onClick={(event) => {
        if (!window.confirm(message)) event.preventDefault();
      }}
      {...props}
    >
      {pending ? "處理中…" : children}
    </Button>
  );
}
