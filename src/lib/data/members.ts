import "server-only";
import { and, asc, count, desc, eq, ilike, isNull, or, sql, type SQL } from "drizzle-orm";
import { db } from "@/db";
import { memberPhotos, memberUpdates, members, type Member, type MemberPhoto, type MemberUpdate } from "@/db/schema";
import { SENSITIVE_FIELDS, type MemberView } from "@/lib/members-shared";
import { can, type Role } from "@/lib/permissions";

export { GENDER_LABELS, MEMBERSHIP_STATUS_LABELS, SENSITIVE_FIELDS } from "@/lib/members-shared";
export type { MemberView, SensitiveField } from "@/lib/members-shared";

/** 依角色移除敏感欄位，避免敏感資料送到瀏覽器 */
export function redactMember(member: Member, role: Role): MemberView {
  if (can(role, "members:read_sensitive")) return member;
  const copy: Record<string, unknown> = { ...member };
  for (const field of SENSITIVE_FIELDS) delete copy[field];
  return copy as MemberView;
}

export interface MemberListFilters {
  q?: string;
  status?: Member["membershipStatus"] | "all";
  group?: string;
  page?: number;
  pageSize?: number;
}

export interface MemberListItem {
  id: string;
  fullName: string;
  englishName: string | null;
  mobile: string | null;
  fellowshipGroup: string | null;
  membershipStatus: Member["membershipStatus"];
  profileThumbKey: string | null;
}

export async function listMembers(churchId: string, filters: MemberListFilters = {}) {
  const pageSize = Math.min(Math.max(filters.pageSize ?? 50, 10), 200);
  const page = Math.max(filters.page ?? 1, 1);
  const conditions: SQL[] = [eq(members.churchId, churchId), isNull(members.deletedAt)];

  const q = filters.q?.trim();
  if (q) {
    const pattern = `%${q.replace(/[%_\\]/g, "\\$&")}%`;
    conditions.push(
      or(
        ilike(members.fullName, pattern),
        ilike(members.englishName, pattern),
        ilike(members.mobile, pattern),
        ilike(members.phone, pattern),
        ilike(members.email, pattern),
        ilike(members.fellowshipGroup, pattern),
      )!,
    );
  }
  if (filters.status && filters.status !== "all") {
    conditions.push(eq(members.membershipStatus, filters.status));
  }
  if (filters.group) {
    conditions.push(eq(members.fellowshipGroup, filters.group));
  }

  const where = and(...conditions);
  const [rows, [{ total }]] = await Promise.all([
    db
      .select({
        id: members.id,
        fullName: members.fullName,
        englishName: members.englishName,
        mobile: members.mobile,
        fellowshipGroup: members.fellowshipGroup,
        membershipStatus: members.membershipStatus,
        profileThumbKey: members.profileThumbKey,
      })
      .from(members)
      .where(where)
      .orderBy(asc(members.fullName), asc(members.createdAt))
      .limit(pageSize)
      .offset((page - 1) * pageSize),
    db.select({ total: count() }).from(members).where(where),
  ]);

  return { items: rows satisfies MemberListItem[], total, page, pageSize, pageCount: Math.max(1, Math.ceil(total / pageSize)) };
}

export async function listFellowshipGroups(churchId: string): Promise<string[]> {
  const rows = await db
    .selectDistinct({ group: members.fellowshipGroup })
    .from(members)
    .where(and(eq(members.churchId, churchId), isNull(members.deletedAt), sql`${members.fellowshipGroup} <> ''`))
    .orderBy(asc(members.fellowshipGroup));
  return rows.map((r) => r.group).filter((g): g is string => Boolean(g));
}

export async function getMember(churchId: string, memberId: string): Promise<Member | null> {
  const row = await db.query.members.findFirst({
    where: and(eq(members.id, memberId), eq(members.churchId, churchId), isNull(members.deletedAt)),
  });
  return row ?? null;
}

export async function listMemberUpdates(memberId: string): Promise<(MemberUpdate & { authorName: string | null })[]> {
  const rows = await db.query.memberUpdates.findMany({
    where: eq(memberUpdates.memberId, memberId),
    orderBy: [desc(memberUpdates.occurredOn), desc(memberUpdates.createdAt)],
    with: { author: { columns: { name: true } } },
  });
  return rows.map(({ author, ...rest }) => ({ ...rest, authorName: author?.name ?? null }));
}

export async function listMemberPhotos(memberId: string): Promise<MemberPhoto[]> {
  return db.query.memberPhotos.findMany({
    where: eq(memberPhotos.memberId, memberId),
    orderBy: [desc(memberPhotos.takenOn), desc(memberPhotos.createdAt)],
  });
}

export async function getDashboardStats(churchId: string) {
  const [statusRows, [{ recentUpdates }]] = await Promise.all([
    db
      .select({ status: members.membershipStatus, total: count() })
      .from(members)
      .where(and(eq(members.churchId, churchId), isNull(members.deletedAt)))
      .groupBy(members.membershipStatus),
    db
      .select({ recentUpdates: count() })
      .from(memberUpdates)
      .where(and(eq(memberUpdates.churchId, churchId), sql`${memberUpdates.createdAt} > now() - interval '30 days'`)),
  ]);
  const byStatus = Object.fromEntries(statusRows.map((r) => [r.status, r.total])) as Partial<Record<Member["membershipStatus"], number>>;
  const total = statusRows.reduce((sum, r) => sum + r.total, 0);
  return { total, byStatus, recentUpdates };
}

export async function listRecentUpdates(churchId: string, limit = 8) {
  return db
    .select({
      id: memberUpdates.id,
      body: memberUpdates.body,
      occurredOn: memberUpdates.occurredOn,
      createdAt: memberUpdates.createdAt,
      memberId: members.id,
      memberName: members.fullName,
    })
    .from(memberUpdates)
    .innerJoin(members, eq(memberUpdates.memberId, members.id))
    .where(and(eq(memberUpdates.churchId, churchId), isNull(members.deletedAt)))
    .orderBy(desc(memberUpdates.createdAt))
    .limit(limit);
}
