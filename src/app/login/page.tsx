import { redirect } from "next/navigation";
import { LoginForm } from "@/components/login-form";
import { churchConfig } from "@/config/church";
import { getCurrentUser } from "@/lib/session";

export const metadata = { title: "登入" };

export default async function LoginPage({ searchParams }: { searchParams: Promise<{ next?: string }> }) {
  const user = await getCurrentUser();
  if (user) redirect("/");
  const { next } = await searchParams;

  return (
    <main className="flex min-h-screen items-center justify-center bg-slate-50 px-4 py-10 dark:bg-slate-950">
      <div className="w-full max-w-sm">
        <div className="mb-8 text-center">
          <span className="mx-auto mb-4 flex h-14 w-14 items-center justify-center rounded-2xl bg-accent text-2xl text-white shadow">✝</span>
          <h1 className="text-2xl font-bold text-slate-900 dark:text-slate-50">{churchConfig.appTitle}</h1>
          <p className="mt-1 text-sm text-slate-500">請使用管理員提供的帳號登入</p>
        </div>
        <div className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm dark:border-slate-800 dark:bg-slate-900">
          <LoginForm nextPath={next ?? "/"} />
        </div>
        <p className="mt-6 text-center text-xs text-slate-400">本系統含會友個人資料，請勿與他人共用帳號。</p>
      </div>
    </main>
  );
}
