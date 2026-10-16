"use client";

import { useRouter } from "next/navigation";
import { useRef, useState } from "react";
import { Alert, Button, Input } from "./ui";

type Kind = "profile" | "id" | "activity";

const labels: Record<Kind, { button: string; hint: string }> = {
  profile: { button: "上傳大頭照", hint: "會自動裁切為方形縮圖" },
  id: { button: "上傳證件照", hint: "僅同工與管理員可見" },
  activity: { button: "上傳活動照片", hint: "可一次選擇多張" },
};

export function PhotoUploader({ memberId, kind }: { memberId: string; kind: Kind }) {
  const router = useRouter();
  const inputRef = useRef<HTMLInputElement>(null);
  const [pending, setPending] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [caption, setCaption] = useState("");
  const [takenOn, setTakenOn] = useState("");

  async function upload(files: FileList | null) {
    if (!files || files.length === 0) return;
    setError(null);
    setPending(true);
    const form = new FormData();
    form.set("kind", kind);
    for (const file of Array.from(files)) form.append("file", file);
    if (kind === "activity") {
      form.set("caption", caption);
      form.set("takenOn", takenOn);
    }
    try {
      const response = await fetch(`/api/members/${memberId}/photos`, { method: "POST", body: form });
      const payload = (await response.json().catch(() => ({}))) as { error?: string };
      if (!response.ok) throw new Error(payload.error ?? "上傳失敗");
      setCaption("");
      setTakenOn("");
      router.refresh();
    } catch (e) {
      setError(e instanceof Error ? e.message : "上傳失敗");
    } finally {
      setPending(false);
      if (inputRef.current) inputRef.current.value = "";
    }
  }

  return (
    <div className="space-y-2">
      {error ? <Alert tone="error">{error}</Alert> : null}
      {kind === "activity" ? (
        <div className="grid gap-2 sm:grid-cols-2">
          <Input placeholder="說明（選填，例如：2026 夏令營）" value={caption} onChange={(e) => setCaption(e.target.value)} maxLength={200} />
          <Input type="date" value={takenOn} onChange={(e) => setTakenOn(e.target.value)} aria-label="拍攝日期" />
        </div>
      ) : null}
      <input
        ref={inputRef}
        type="file"
        accept="image/*"
        multiple={kind === "activity"}
        className="hidden"
        onChange={(e) => upload(e.target.files)}
      />
      <div className="flex items-center gap-3">
        <Button type="button" variant="secondary" disabled={pending} onClick={() => inputRef.current?.click()}>
          {pending ? "上傳中…" : labels[kind].button}
        </Button>
        <span className="text-xs text-slate-500">{labels[kind].hint}</span>
      </div>
    </div>
  );
}
