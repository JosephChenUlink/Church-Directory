// 會員相關的標籤與型別，前後端共用（此檔不可引入任何伺服器端模組）
import type { Member } from "@/db/schema";

export const MEMBERSHIP_STATUS_LABELS: Record<Member["membershipStatus"], string> = {
  active: "會友",
  visitor: "慕道友",
  inactive: "久未出席",
  transferred: "已轉會",
  deceased: "已安息",
};

export const GENDER_LABELS: Record<NonNullable<Member["gender"]>, string> = {
  male: "男",
  female: "女",
  other: "其他",
};

/** 僅同工與管理員可見的欄位 */
export const SENSITIVE_FIELDS = [
  "nationalId",
  "address",
  "emergencyContactName",
  "emergencyContactPhone",
  "internalNotes",
  "idPhotoKey",
] as const satisfies readonly (keyof Member)[];

export type SensitiveField = (typeof SENSITIVE_FIELDS)[number];
export type MemberView = Omit<Member, SensitiveField> & Partial<Pick<Member, SensitiveField>>;
