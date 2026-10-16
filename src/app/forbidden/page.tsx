import { ButtonLink } from "@/components/ui";

export const metadata = { title: "沒有權限" };

export default function ForbiddenPage() {
  return (
    <main className="flex min-h-screen flex-col items-center justify-center gap-4 px-4 text-center">
      <h1 className="text-3xl font-bold">沒有權限</h1>
      <p className="text-slate-500">您的帳號無法存取此頁面，如有需要請聯絡管理員。</p>
      <ButtonLink href="/">回到總覽</ButtonLink>
    </main>
  );
}
