import Link from "next/link";
import { ButtonLink, Card, EmptyState, Input } from "@/components/ui";
import { getDashboardStats, listRecentUpdates, MEMBERSHIP_STATUS_LABELS } from "@/lib/data/members";
import { formatDate } from "@/lib/format";
import { can } from "@/lib/permissions";
import { requireUser } from "@/lib/session";

export const metadata = { title: "總覽" };

export default async function DashboardPage() {
  const user = await requireUser();
  const [stats, recent] = await Promise.all([getDashboardStats(user.churchId), listRecentUpdates(user.churchId)]);
  const tiles: { label: string; value: number; href: string }[] = [
    { label: "全部會員", value: stats.total, href: "/members" },
    { label: MEMBERSHIP_STATUS_LABELS.active, value: stats.byStatus.active ?? 0, href: "/members?status=active" },
    { label: MEMBERSHIP_STATUS_LABELS.visitor, value: stats.byStatus.visitor ?? 0, href: "/members?status=visitor" },
    { label: "近 30 天動態", value: stats.recentUpdates, href: "/members" },
  ];

  return (
    <div className="space-y-6">
      <div>
        <p className="text-sm text-slate-500">您好，{user.name}</p>
        <h1 className="text-2xl font-bold tracking-tight">總覽</h1>
      </div>

      <form action="/members" method="get" className="flex gap-2">
        <Input name="q" type="search" placeholder="搜尋姓名、手機、小組…" aria-label="搜尋會員" />
        <button type="submit" className="shrink-0 rounded-lg bg-accent px-4 text-sm font-medium text-white">
          搜尋
        </button>
      </form>

      <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
        {tiles.map((tile) => (
          <Link key={tile.label} href={tile.href} className="rounded-xl border border-slate-200 bg-white p-4 shadow-sm transition hover:border-accent/50 dark:border-slate-700 dark:bg-slate-900">
            <p className="text-xs text-slate-500">{tile.label}</p>
            <p className="mt-1 text-2xl font-bold tabular-nums">{tile.value}</p>
          </Link>
        ))}
      </div>

      <Card
        title="最新動態"
        actions={can(user.role, "members:write") ? <ButtonLink href="/members/new" variant="secondary">＋ 新增會員</ButtonLink> : null}
      >
        {recent.length === 0 ? (
          <EmptyState title="還沒有任何動態" description="在會員頁面新增近況更新後，會顯示在這裡。" />
        ) : (
          <ul className="divide-y divide-slate-200 dark:divide-slate-700">
            {recent.map((item) => (
              <li key={item.id} className="py-3">
                <div className="flex items-baseline justify-between gap-3">
                  <Link href={`/members/${item.memberId}`} className="font-medium text-accent hover:underline">
                    {item.memberName}
                  </Link>
                  <span className="shrink-0 text-xs text-slate-500">{formatDate(item.occurredOn ?? item.createdAt)}</span>
                </div>
                <p className="mt-1 line-clamp-2 text-sm text-slate-700 dark:text-slate-300">{item.body}</p>
              </li>
            ))}
          </ul>
        )}
      </Card>
    </div>
  );
}
