import Link from "next/link";
import { MemberAvatar } from "@/components/avatar";
import { Badge, ButtonLink, EmptyState, Input, PageHeader, Select } from "@/components/ui";
import { listFellowshipGroups, listMembers, MEMBERSHIP_STATUS_LABELS } from "@/lib/data/members";
import { can } from "@/lib/permissions";
import { requireUser } from "@/lib/session";

export const metadata = { title: "會員" };

type Search = { q?: string; status?: string; group?: string; page?: string };

const statusKeys = Object.keys(MEMBERSHIP_STATUS_LABELS) as (keyof typeof MEMBERSHIP_STATUS_LABELS)[];

export default async function MembersPage({ searchParams }: { searchParams: Promise<Search> }) {
  const user = await requireUser();
  const params = await searchParams;
  const status = statusKeys.includes(params.status as (typeof statusKeys)[number]) ? (params.status as (typeof statusKeys)[number]) : "all";
  const page = Number(params.page) || 1;

  const [result, groups] = await Promise.all([
    listMembers(user.churchId, { q: params.q, status, group: params.group || undefined, page }),
    listFellowshipGroups(user.churchId),
  ]);

  const pageLink = (p: number) => {
    const sp = new URLSearchParams();
    if (params.q) sp.set("q", params.q);
    if (status !== "all") sp.set("status", status);
    if (params.group) sp.set("group", params.group);
    sp.set("page", String(p));
    return `/members?${sp.toString()}`;
  };

  return (
    <div>
      <PageHeader
        title="會員"
        description={`共 ${result.total} 位`}
        actions={can(user.role, "members:write") ? <ButtonLink href="/members/new">＋ 新增會員</ButtonLink> : undefined}
      />

      <form method="get" className="mb-4 grid gap-2 sm:grid-cols-[1fr_auto_auto_auto]">
        <Input name="q" type="search" defaultValue={params.q ?? ""} placeholder="搜尋姓名、手機、電郵、小組…" aria-label="搜尋" />
        <Select name="status" defaultValue={status} aria-label="身分">
          <option value="all">所有身分</option>
          {statusKeys.map((key) => (
            <option key={key} value={key}>
              {MEMBERSHIP_STATUS_LABELS[key]}
            </option>
          ))}
        </Select>
        <Select name="group" defaultValue={params.group ?? ""} aria-label="小組">
          <option value="">所有小組</option>
          {groups.map((g) => (
            <option key={g} value={g}>
              {g}
            </option>
          ))}
        </Select>
        <button type="submit" className="rounded-lg bg-accent px-4 py-2 text-sm font-medium text-white">
          篩選
        </button>
      </form>

      {result.items.length === 0 ? (
        <EmptyState
          title="沒有符合的會員"
          description={params.q || status !== "all" || params.group ? "試試其他關鍵字或清除篩選條件。" : "開始新增第一位會員吧。"}
          action={can(user.role, "members:write") && !params.q ? <ButtonLink href="/members/new">新增會員</ButtonLink> : undefined}
        />
      ) : (
        <ul className="overflow-hidden rounded-xl border border-slate-200 bg-white shadow-sm dark:border-slate-700 dark:bg-slate-900">
          {result.items.map((m) => (
            <li key={m.id} className="border-b border-slate-100 last:border-b-0 dark:border-slate-800">
              <Link href={`/members/${m.id}`} className="flex items-center gap-3 px-4 py-3 transition hover:bg-slate-50 dark:hover:bg-slate-800">
                <MemberAvatar name={m.fullName} thumbKey={m.profileThumbKey} />
                <div className="min-w-0 flex-1">
                  <p className="truncate font-medium">
                    {m.fullName}
                    {m.englishName ? <span className="ml-2 text-sm text-slate-500">{m.englishName}</span> : null}
                  </p>
                  <p className="truncate text-sm text-slate-500">
                    {[m.fellowshipGroup, m.mobile].filter(Boolean).join("・") || "—"}
                  </p>
                </div>
                <Badge tone={m.membershipStatus}>{MEMBERSHIP_STATUS_LABELS[m.membershipStatus]}</Badge>
              </Link>
            </li>
          ))}
        </ul>
      )}

      {result.pageCount > 1 ? (
        <nav className="mt-4 flex items-center justify-between text-sm" aria-label="分頁">
          {result.page > 1 ? <Link href={pageLink(result.page - 1)} className="text-accent hover:underline">← 上一頁</Link> : <span />}
          <span className="text-slate-500">
            第 {result.page} / {result.pageCount} 頁
          </span>
          {result.page < result.pageCount ? <Link href={pageLink(result.page + 1)} className="text-accent hover:underline">下一頁 →</Link> : <span />}
        </nav>
      ) : null}
    </div>
  );
}
