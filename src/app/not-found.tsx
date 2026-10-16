import { ButtonLink } from "@/components/ui";

export default function NotFound() {
  return (
    <main className="flex min-h-screen flex-col items-center justify-center gap-4 px-4 text-center">
      <h1 className="text-3xl font-bold">找不到頁面</h1>
      <p className="text-slate-500">您要找的資料不存在或已被移除。</p>
      <ButtonLink href="/">回到總覽</ButtonLink>
    </main>
  );
}
