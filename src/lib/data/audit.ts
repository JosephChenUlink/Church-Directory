import "server-only";
import { db, type Database } from "@/db";
import { auditLogs } from "@/db/schema";
import type { CurrentUser } from "@/lib/session";

type Executor = Database | Parameters<Parameters<Database["transaction"]>[0]>[0];

export async function logAudit(
  executor: Executor,
  input: {
    actor: CurrentUser;
    action: string;
    entityType: "member" | "member_update" | "member_photo" | "user" | "account";
    entityId?: string | null;
    details?: Record<string, unknown>;
  },
) {
  await executor.insert(auditLogs).values({
    churchId: input.actor.churchId,
    actorId: input.actor.id,
    actorName: input.actor.name,
    action: input.action,
    entityType: input.entityType,
    entityId: input.entityId ?? null,
    details: input.details ?? {},
  });
}

export async function listRecentAudit(churchId: string, limit = 100) {
  return db.query.auditLogs.findMany({
    where: (t, { eq }) => eq(t.churchId, churchId),
    orderBy: (t, { desc }) => desc(t.createdAt),
    limit,
  });
}
