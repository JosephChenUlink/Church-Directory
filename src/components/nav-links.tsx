"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

const links = [
  { href: "/", label: "總覽", icon: "⌂", exact: true },
  { href: "/members", label: "會員", icon: "☺" },
  { href: "/settings", label: "我的帳號", icon: "⚙" },
  { href: "/admin/users", label: "使用者管理", icon: "⚿", adminOnly: true },
  { href: "/admin/audit", label: "操作紀錄", icon: "≣", adminOnly: true },
];

export function NavLinks({ isAdmin, variant }: { isAdmin: boolean; variant: "sidebar" | "bottom" }) {
  const pathname = usePathname();
  const visible = links.filter((l) => !l.adminOnly || isAdmin);
  const isActive = (href: string, exact?: boolean) => (exact ? pathname === href : pathname === href || pathname.startsWith(href + "/"));

  if (variant === "bottom") {
    return (
      <ul className="grid auto-cols-fr grid-flow-col">
        {visible.map((link) => {
          const active = isActive(link.href, link.exact);
          return (
            <li key={link.href}>
              <Link
                href={link.href}
                className={`flex flex-col items-center gap-0.5 py-2 text-xs ${active ? "text-accent" : "text-slate-500"}`}
                aria-current={active ? "page" : undefined}
              >
                <span className="text-lg leading-none" aria-hidden>
                  {link.icon}
                </span>
                {link.label}
              </Link>
            </li>
          );
        })}
      </ul>
    );
  }

  return (
    <>
      {visible.map((link) => {
        const active = isActive(link.href, link.exact);
        return (
          <Link
            key={link.href}
            href={link.href}
            aria-current={active ? "page" : undefined}
            className={`flex items-center gap-3 rounded-lg px-3 py-2 text-sm font-medium transition ${
              active ? "bg-accent/10 text-accent" : "text-slate-700 hover:bg-slate-100 dark:text-slate-300 dark:hover:bg-slate-800"
            }`}
          >
            <span className="w-5 text-center" aria-hidden>
              {link.icon}
            </span>
            {link.label}
          </Link>
        );
      })}
    </>
  );
}
