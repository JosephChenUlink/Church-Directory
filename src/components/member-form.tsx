"use client";

import { useActionState } from "react";
import { saveMember } from "@/app/(app)/members/actions";
import { idle } from "@/lib/action-result";
import { GENDER_LABELS, MEMBERSHIP_STATUS_LABELS, type MemberView } from "@/lib/members-shared";
import { Alert, ButtonLink, Card, Field, Input, Select, Textarea } from "./ui";
import { SubmitButton } from "./submit-button";

export function MemberForm({ member, canEditSensitive }: { member?: MemberView; canEditSensitive: boolean }) {
  const [state, action] = useActionState(saveMember, idle);
  const errors = !state.ok ? state.fieldErrors ?? {} : {};
  const v = (key: keyof MemberView) => (member?.[key] as string | null | undefined) ?? "";

  return (
    <form action={action} className="space-y-6">
      {member ? <input type="hidden" name="id" value={member.id} /> : null}
      {!state.ok ? <Alert tone="error">{state.error}</Alert> : null}

      <Card title="基本資料">
        <div className="grid gap-4 sm:grid-cols-2">
          <Field label="姓名 *" htmlFor="fullName" error={errors.fullName}>
            <Input id="fullName" name="fullName" defaultValue={v("fullName")} required maxLength={100} />
          </Field>
          <Field label="英文名" htmlFor="englishName" error={errors.englishName}>
            <Input id="englishName" name="englishName" defaultValue={v("englishName")} maxLength={100} />
          </Field>
          <Field label="性別" htmlFor="gender">
            <Select id="gender" name="gender" defaultValue={v("gender")}>
              <option value="">未填</option>
              {Object.entries(GENDER_LABELS).map(([value, label]) => (
                <option key={value} value={value}>
                  {label}
                </option>
              ))}
            </Select>
          </Field>
          <Field label="生日" htmlFor="birthDate" error={errors.birthDate}>
            <Input id="birthDate" name="birthDate" type="date" defaultValue={v("birthDate")} />
          </Field>
          <Field label="手機" htmlFor="mobile" error={errors.mobile}>
            <Input id="mobile" name="mobile" type="tel" defaultValue={v("mobile")} inputMode="tel" />
          </Field>
          <Field label="電話" htmlFor="phone" error={errors.phone}>
            <Input id="phone" name="phone" type="tel" defaultValue={v("phone")} inputMode="tel" />
          </Field>
          <Field label="電子郵件" htmlFor="email" error={errors.email}>
            <Input id="email" name="email" type="email" defaultValue={v("email")} inputMode="email" />
          </Field>
          <Field label="職業" htmlFor="occupation" error={errors.occupation}>
            <Input id="occupation" name="occupation" defaultValue={v("occupation")} />
          </Field>
        </div>
      </Card>

      <Card title="教會資料">
        <div className="grid gap-4 sm:grid-cols-2">
          <Field label="身分" htmlFor="membershipStatus">
            <Select id="membershipStatus" name="membershipStatus" defaultValue={member?.membershipStatus ?? "active"}>
              {Object.entries(MEMBERSHIP_STATUS_LABELS).map(([value, label]) => (
                <option key={value} value={value}>
                  {label}
                </option>
              ))}
            </Select>
          </Field>
          <Field label="小組／團契" htmlFor="fellowshipGroup" error={errors.fellowshipGroup}>
            <Input id="fellowshipGroup" name="fellowshipGroup" defaultValue={v("fellowshipGroup")} />
          </Field>
          <Field label="受洗日期" htmlFor="baptismDate" error={errors.baptismDate}>
            <Input id="baptismDate" name="baptismDate" type="date" defaultValue={v("baptismDate")} />
          </Field>
          <Field label="加入教會日期" htmlFor="joinedAt" error={errors.joinedAt}>
            <Input id="joinedAt" name="joinedAt" type="date" defaultValue={v("joinedAt")} />
          </Field>
        </div>
      </Card>

      {canEditSensitive ? (
        <Card title="敏感資料（僅同工與管理員可見）">
          <div className="grid gap-4 sm:grid-cols-2">
            <Field label="身分證字號" htmlFor="nationalId" error={errors.nationalId}>
              <Input id="nationalId" name="nationalId" defaultValue={v("nationalId")} autoComplete="off" />
            </Field>
            <Field label="地址" htmlFor="address" error={errors.address} className="sm:col-span-2">
              <Input id="address" name="address" defaultValue={v("address")} />
            </Field>
            <Field label="緊急聯絡人" htmlFor="emergencyContactName" error={errors.emergencyContactName}>
              <Input id="emergencyContactName" name="emergencyContactName" defaultValue={v("emergencyContactName")} />
            </Field>
            <Field label="緊急聯絡電話" htmlFor="emergencyContactPhone" error={errors.emergencyContactPhone}>
              <Input id="emergencyContactPhone" name="emergencyContactPhone" type="tel" defaultValue={v("emergencyContactPhone")} />
            </Field>
            <Field label="內部備註" htmlFor="internalNotes" error={errors.internalNotes} className="sm:col-span-2">
              <Textarea id="internalNotes" name="internalNotes" defaultValue={v("internalNotes")} />
            </Field>
          </div>
        </Card>
      ) : null}

      <div className="flex flex-wrap justify-end gap-2">
        <ButtonLink variant="secondary" href={member ? `/members/${member.id}` : "/members"}>
          取消
        </ButtonLink>
        <SubmitButton pendingText="儲存中…">{member ? "儲存變更" : "新增會員"}</SubmitButton>
      </div>
    </form>
  );
}
