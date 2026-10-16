import { notFound } from "next/navigation";
import { MemberAvatar } from "@/components/avatar";
import { ConfirmButton } from "@/components/confirm-button";
import { PhotoUploader } from "@/components/photo-uploader";
import { Badge, ButtonLink, Card, DescriptionList, EmptyState } from "@/components/ui";
import { UpdateForm } from "@/components/update-form";
import { GENDER_LABELS, getMember, listMemberPhotos, listMemberUpdates, MEMBERSHIP_STATUS_LABELS, redactMember } from "@/lib/data/members";
import { calcAge, fileUrl, formatDate, formatDateTime } from "@/lib/format";
import { can } from "@/lib/permissions";
import { requireUser } from "@/lib/session";
import { deleteMember, deleteMemberUpdate, deletePhoto, removePortrait } from "../actions";

export async function generateMetadata({ params }: { params: Promise<{ id: string }> }) {
  const user = await requireUser();
  const member = await getMember(user.churchId, (await params).id);
  return { title: member?.fullName ?? "會員" };
}

export default async function MemberDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const user = await requireUser();
  const { id } = await params;
  const raw = await getMember(user.churchId, id);
  if (!raw) notFound();
  const member = redactMember(raw, user.role);
  const [updates, photos] = await Promise.all([listMemberUpdates(id), listMemberPhotos(id)]);

  const canWrite = can(user.role, "members:write");
  const canPhotos = can(user.role, "photos:write");
  const canSensitive = can(user.role, "members:read_sensitive");
  const canUpdates = can(user.role, "updates:write");
  const age = calcAge(member.birthDate, member.birthYear);

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
        <div className="flex items-center gap-4">
          <MemberAvatar name={member.fullName} thumbKey={member.profileThumbKey} size="lg" />
          <div>
            <h1 className="text-2xl font-bold tracking-tight">
              {member.fullName}
              {member.englishName ? <span className="ml-2 text-base font-normal text-slate-500">{member.englishName}</span> : null}
            </h1>
            <div className="mt-2 flex flex-wrap items-center gap-2 text-sm text-slate-500">
              <Badge tone={member.membershipStatus}>{MEMBERSHIP_STATUS_LABELS[member.membershipStatus]}</Badge>
              {member.fellowshipGroup ? <span>{member.fellowshipGroup}</span> : null}
              {member.gender ? <span>{GENDER_LABELS[member.gender]}</span> : null}
              {age !== null ? <span>{member.birthDate ? `${age} 歲` : `約 ${age} 歲`}</span> : null}
            </div>
          </div>
        </div>
        <div className="flex flex-wrap gap-2">
          <ButtonLink href="/members" variant="secondary">
            ← 返回
          </ButtonLink>
          {canWrite ? <ButtonLink href={`/members/${member.id}/edit`}>編輯資料</ButtonLink> : null}
        </div>
      </div>

      <div className="grid gap-6 lg:grid-cols-3">
        <div className="space-y-6 lg:col-span-2">
          <Card title="基本資料">
            <DescriptionList
              items={[
                { label: "手機", value: member.mobile ? <a href={`tel:${member.mobile}`} className="text-accent hover:underline">{member.mobile}</a> : null },
                { label: "電話", value: member.phone ? <a href={`tel:${member.phone}`} className="text-accent hover:underline">{member.phone}</a> : null },
                { label: "電子郵件", value: member.email ? <a href={`mailto:${member.email}`} className="break-all text-accent hover:underline">{member.email}</a> : null },
                { label: "生日", value: member.birthDate ? formatDate(member.birthDate) : member.birthYear ? `${member.birthYear} 年（僅知出生年）` : null },
                { label: "職業", value: member.occupation },
                { label: "受洗日期", value: member.baptismDate ? formatDate(member.baptismDate) : null },
                { label: "加入教會", value: member.joinedAt ? formatDate(member.joinedAt) : null },
              ]}
            />
          </Card>

          {canSensitive ? (
            <Card title="敏感資料" actions={<Badge tone="danger">僅同工可見</Badge>}>
              <DescriptionList
                items={[
                  { label: "身分證字號", value: member.nationalId },
                  { label: "地址", value: member.address },
                  { label: "緊急聯絡人", value: member.emergencyContactName },
                  { label: "緊急聯絡電話", value: member.emergencyContactPhone },
                ]}
              />
              {member.internalNotes ? (
                <div className="mt-4">
                  <p className="text-xs font-medium uppercase tracking-wide text-slate-500">內部備註</p>
                  <p className="mt-1 whitespace-pre-wrap text-sm">{member.internalNotes}</p>
                </div>
              ) : null}
              <div className="mt-5 border-t border-slate-200 pt-4 dark:border-slate-700">
                <p className="mb-2 text-xs font-medium uppercase tracking-wide text-slate-500">證件照</p>
                {member.idPhotoKey ? (
                  <div className="flex flex-wrap items-start gap-4">
                    <a href={fileUrl(member.idPhotoKey)!} target="_blank" rel="noreferrer">
                      <img src={fileUrl(member.idPhotoKey)!} alt={`${member.fullName} 證件照`} className="max-h-48 rounded-lg ring-1 ring-slate-200 dark:ring-slate-700" />
                    </a>
                    {canPhotos ? (
                      <div className="space-y-2">
                        <PhotoUploader memberId={member.id} kind="id" />
                        <form action={removePortrait}>
                          <input type="hidden" name="memberId" value={member.id} />
                          <input type="hidden" name="kind" value="id" />
                          <ConfirmButton variant="ghost" message="確定要移除證件照嗎？">
                            移除證件照
                          </ConfirmButton>
                        </form>
                      </div>
                    ) : null}
                  </div>
                ) : canPhotos ? (
                  <PhotoUploader memberId={member.id} kind="id" />
                ) : (
                  <p className="text-sm text-slate-500">尚未上傳</p>
                )}
              </div>
            </Card>
          ) : null}

          <Card title={`動態更新（${updates.length}）`}>
            {canUpdates ? (
              <div className="mb-5 border-b border-slate-200 pb-5 dark:border-slate-700">
                <UpdateForm memberId={member.id} />
              </div>
            ) : null}
            {updates.length === 0 ? (
              <p className="text-sm text-slate-500">尚無動態。</p>
            ) : (
              <ol className="space-y-4">
                {updates.map((u) => (
                  <li key={u.id} className="relative border-l-2 border-accent/30 pl-4">
                    <div className="flex flex-wrap items-baseline justify-between gap-2 text-xs text-slate-500">
                      <span>
                        {formatDate(u.occurredOn ?? u.createdAt)}
                        {u.authorName ? `・${u.authorName}` : ""}
                      </span>
                      {canUpdates && (u.authorId === user.id || user.role === "admin") ? (
                        <form action={deleteMemberUpdate}>
                          <input type="hidden" name="id" value={u.id} />
                          <ConfirmButton variant="ghost" className="px-2 py-0.5 text-xs" message="確定要刪除這則動態嗎？">
                            刪除
                          </ConfirmButton>
                        </form>
                      ) : null}
                    </div>
                    <p className="mt-1 whitespace-pre-wrap text-sm">{u.body}</p>
                  </li>
                ))}
              </ol>
            )}
          </Card>
        </div>

        <div className="space-y-6">
          {canPhotos ? (
            <Card title="大頭照">
              <PhotoUploader memberId={member.id} kind="profile" />
              {member.profilePhotoKey ? (
                <form action={removePortrait} className="mt-3">
                  <input type="hidden" name="memberId" value={member.id} />
                  <input type="hidden" name="kind" value="profile" />
                  <ConfirmButton variant="ghost" className="px-2 py-1 text-xs" message="確定要移除大頭照嗎？">
                    移除大頭照
                  </ConfirmButton>
                </form>
              ) : null}
            </Card>
          ) : null}

          <Card title={`活動照片（${photos.length}）`}>
            {canPhotos ? (
              <div className="mb-4">
                <PhotoUploader memberId={member.id} kind="activity" />
              </div>
            ) : null}
            {photos.length === 0 ? (
              <EmptyState title="尚無活動照片" />
            ) : (
              <ul className="grid grid-cols-2 gap-3">
                {photos.map((p) => (
                  <li key={p.id} className="group relative">
                    <a href={fileUrl(p.storageKey)!} target="_blank" rel="noreferrer">
                      <img src={fileUrl(p.thumbKey)!} alt={p.caption ?? "活動照片"} className="aspect-square w-full rounded-lg object-cover ring-1 ring-slate-200 dark:ring-slate-700" loading="lazy" />
                    </a>
                    <p className="mt-1 truncate text-xs text-slate-500">
                      {[p.takenOn ? formatDate(p.takenOn) : null, p.caption].filter(Boolean).join("・") || formatDateTime(p.createdAt)}
                    </p>
                    {canPhotos ? (
                      <form action={deletePhoto} className="absolute right-1 top-1">
                        <input type="hidden" name="id" value={p.id} />
                        <ConfirmButton variant="danger" className="rounded-md px-2 py-0.5 text-xs opacity-90" message="確定要刪除這張照片嗎？">
                          刪除
                        </ConfirmButton>
                      </form>
                    ) : null}
                  </li>
                ))}
              </ul>
            )}
          </Card>

          <Card title="紀錄">
            <DescriptionList
              items={[
                { label: "建立時間", value: formatDateTime(member.createdAt) },
                { label: "最後更新", value: formatDateTime(member.updatedAt) },
              ]}
            />
            {can(user.role, "members:delete") ? (
              <form action={deleteMember} className="mt-4 border-t border-slate-200 pt-4 dark:border-slate-700">
                <input type="hidden" name="id" value={member.id} />
                <ConfirmButton variant="danger" message={`確定要刪除「${member.fullName}」嗎？資料會被隱藏但保留在資料庫中。`}>
                  刪除會員
                </ConfirmButton>
              </form>
            ) : null}
          </Card>
        </div>
      </div>
    </div>
  );
}
