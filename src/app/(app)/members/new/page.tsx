import { MemberForm } from "@/components/member-form";
import { PageHeader } from "@/components/ui";
import { can } from "@/lib/permissions";
import { requirePermission } from "@/lib/session";

export const metadata = { title: "新增會員" };

export default async function NewMemberPage() {
  const user = await requirePermission("members:write");
  return (
    <div>
      <PageHeader title="新增會員" />
      <MemberForm canEditSensitive={can(user.role, "members:read_sensitive")} />
    </div>
  );
}
