import type { ReactNode } from "react";
import { churchConfig } from "@/config/church";
import { ROLE_LABELS } from "@/lib/permissions";
import type { CurrentUser } from "@/lib/session";
import { NavLinks } from "./nav-links";
import { SignOutButton } from "./sign-out-button";

export function AppShell({ user, children }: { user: CurrentUser; children: ReactNode }) {
  const isAdmin = user.role === "admin";
  return (
    <div className="min-h-screen bg-slate-50 text-slate-900 dark:bg-slate-950 dark:text-slate-100">
      {/* 桌面側欄 */}
      <aside className="fixed inset-y-0 left-0 hidden w-60 flex-col border-r border-slate-200 bg-white dark:border-slate-800 dark:bg-slate-900 lg:flex">
        <div className="flex h-16 items-center gap-2 px-5">
          <span className="flex h-8 w-8 items-center justify-center rounded-lg bg-accent text-white">✝</span>
          <span className="truncate font-semibold">{churchConfig.appTitle}</span>
        </div>
        <nav className="flex-1 space-y-1 px-3 py-2">
          <NavLinks isAdmin={isAdmin} variant="sidebar" />
        </nav>
        <div className="border-t border-slate-200 p-4 text-sm dark:border-slate-800">
          <p className="truncate font-medium">{user.name}</p>
          <p className="truncate text-xs text-slate-500">{ROLE_LABELS[user.role]}</p>
          <SignOutButton className="mt-3 w-full" />
        </div>
      </aside>

      {/* 手機頂欄 */}
      <header className="sticky top-0 z-20 flex h-14 items-center justify-between border-b border-slate-200 bg-white/90 px-4 backdrop-blur dark:border-slate-800 dark:bg-slate-900/90 lg:hidden">
        <span className="truncate font-semibold">{churchConfig.appTitle}</span>
        <span className="truncate text-xs text-slate-500">
          {user.name}・{ROLE_LABELS[user.role]}
        </span>
      </header>

      <main className="px-4 pb-24 pt-6 sm:px-6 lg:ml-60 lg:px-10 lg:pb-10">
        <div className="mx-auto w-full max-w-6xl">{children}</div>
      </main>

      {/* 手機底部導覽 */}
      <nav className="fixed inset-x-0 bottom-0 z-20 border-t border-slate-200 bg-white pb-[env(safe-area-inset-bottom)] dark:border-slate-800 dark:bg-slate-900 lg:hidden">
        <NavLinks isAdmin={isAdmin} variant="bottom" />
      </nav>
    </div>
  );
}
