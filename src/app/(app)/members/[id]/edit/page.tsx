import { notFound } from "next/navigation";
import { MemberForm } from "@/components/member-form";
import { PageHeader } from "@/components/ui";
import { getMember, redactMember } from "@/lib/data/members";
import { can } from "@/lib/permissions";
import { requirePermission } from "@/lib/session";

export const metadata = { title: "編輯會員" };

export default async function EditMemberPage({ params }: { params: Promise<{ id: string }> }) {
  const user = await requirePermission("members:write");
  const { id } = await params;
  const member = await getMember(user.churchId, id);
  if (!member) notFound();
  return (
    <div>
      <PageHeader title={`編輯：${member.fullName}`} />
      <MemberForm member={redactMember(member, user.role)} canEditSensitive={can(user.role, "members:read_sensitive")} />
    </div>
  );
}
