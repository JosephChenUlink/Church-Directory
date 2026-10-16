import { relations, sql } from "drizzle-orm";
import {
  date,
  index,
  integer,
  jsonb,
  pgEnum,
  pgTable,
  text,
  timestamp,
  uniqueIndex,
  uuid,
} from "drizzle-orm/pg-core";
import { user } from "./auth-schema";

// 登入相關資料表（由 Better Auth CLI 產生，請勿手動修改 auth-schema.ts）
export * from "./auth-schema";

/**
 * 教會。目前每個部署只服務一間教會，但所有資料都標記所屬教會，
 * 將來若要改成一個系統服務多間教會（多租戶），不需要重整資料。
 */
export const churches = pgTable("churches", {
  id: uuid("id").primaryKey().defaultRandom(),
  slug: text("slug").notNull().unique(),
  name: text("name").notNull(),
  createdAt: timestamp("created_at", { withTimezone: true }).defaultNow().notNull(),
});

export const genderEnum = pgEnum("gender", ["male", "female", "other"]);
export const membershipStatusEnum = pgEnum("membership_status", [
  "active", // 正式會員
  "visitor", // 慕道友 / 新朋友
  "inactive", // 久未出席
  "transferred", // 轉會
  "deceased", // 已安息
]);
export const photoKindEnum = pgEnum("photo_kind", ["activity"]);

export const members = pgTable(
  "members",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    churchId: uuid("church_id")
      .notNull()
      .references(() => churches.id, { onDelete: "restrict" }),

    // ---- 基本資料（所有登入者可見） ----
    fullName: text("full_name").notNull(),
    englishName: text("english_name"),
    gender: genderEnum("gender"),
    birthDate: date("birth_date"),
    /** 只知道出生年時使用（例如從舊名冊匯入） */
    birthYear: integer("birth_year"),
    mobile: text("mobile"),
    phone: text("phone"),
    email: text("email"),
    fellowshipGroup: text("fellowship_group"),
    membershipStatus: membershipStatusEnum("membership_status").notNull().default("active"),
    baptismDate: date("baptism_date"),
    joinedAt: date("joined_at"),
    occupation: text("occupation"),

    // ---- 敏感資料（僅同工與管理員可見） ----
    nationalId: text("national_id"),
    address: text("address"),
    emergencyContactName: text("emergency_contact_name"),
    emergencyContactPhone: text("emergency_contact_phone"),
    internalNotes: text("internal_notes"),
    idPhotoKey: text("id_photo_key"),

    // ---- 大頭照 ----
    profilePhotoKey: text("profile_photo_key"),
    profileThumbKey: text("profile_thumb_key"),

    /** 舊名冊匯入時的來源識別碼，讓重複匯入時更新而非重複建檔 */
    legacyId: text("legacy_id"),

    createdBy: text("created_by").references(() => user.id, { onDelete: "set null" }),
    updatedBy: text("updated_by").references(() => user.id, { onDelete: "set null" }),
    createdAt: timestamp("created_at", { withTimezone: true }).defaultNow().notNull(),
    updatedAt: timestamp("updated_at", { withTimezone: true }).defaultNow().notNull(),
    // 軟刪除：刪除的會員保留資料但不顯示
    deletedAt: timestamp("deleted_at", { withTimezone: true }),
  },
  (table) => [
    index("members_church_idx").on(table.churchId),
    index("members_church_name_idx").on(table.churchId, table.fullName),
    index("members_church_status_idx").on(table.churchId, table.membershipStatus),
    uniqueIndex("members_church_legacy_idx").on(table.churchId, table.legacyId),
  ],
);

/** 會員動態／近況更新，可隨時間陸續新增 */
export const memberUpdates = pgTable(
  "member_updates",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    churchId: uuid("church_id")
      .notNull()
      .references(() => churches.id, { onDelete: "restrict" }),
    memberId: uuid("member_id")
      .notNull()
      .references(() => members.id, { onDelete: "cascade" }),
    authorId: text("author_id").references(() => user.id, { onDelete: "set null" }),
    body: text("body").notNull(),
    occurredOn: date("occurred_on"),
    createdAt: timestamp("created_at", { withTimezone: true }).defaultNow().notNull(),
    updatedAt: timestamp("updated_at", { withTimezone: true }).defaultNow().notNull(),
  },
  (table) => [index("member_updates_member_idx").on(table.memberId, table.createdAt)],
);

/** 活動照片 */
export const memberPhotos = pgTable(
  "member_photos",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    churchId: uuid("church_id")
      .notNull()
      .references(() => churches.id, { onDelete: "restrict" }),
    memberId: uuid("member_id")
      .notNull()
      .references(() => members.id, { onDelete: "cascade" }),
    kind: photoKindEnum("kind").notNull().default("activity"),
    storageKey: text("storage_key").notNull(),
    thumbKey: text("thumb_key").notNull(),
    caption: text("caption"),
    takenOn: date("taken_on"),
    width: integer("width"),
    height: integer("height"),
    sizeBytes: integer("size_bytes"),
    uploadedBy: text("uploaded_by").references(() => user.id, { onDelete: "set null" }),
    createdAt: timestamp("created_at", { withTimezone: true }).defaultNow().notNull(),
  },
  (table) => [index("member_photos_member_idx").on(table.memberId, table.createdAt)],
);

/** 操作紀錄：誰在什麼時候做了什麼 */
export const auditLogs = pgTable(
  "audit_logs",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    churchId: uuid("church_id")
      .notNull()
      .references(() => churches.id, { onDelete: "restrict" }),
    actorId: text("actor_id").references(() => user.id, { onDelete: "set null" }),
    actorName: text("actor_name"),
    action: text("action").notNull(),
    entityType: text("entity_type").notNull(),
    entityId: text("entity_id"),
    details: jsonb("details").$type<Record<string, unknown>>().default(sql`'{}'::jsonb`),
    createdAt: timestamp("created_at", { withTimezone: true }).defaultNow().notNull(),
  },
  (table) => [index("audit_logs_church_time_idx").on(table.churchId, table.createdAt)],
);

export const membersRelations = relations(members, ({ one, many }) => ({
  church: one(churches, { fields: [members.churchId], references: [churches.id] }),
  updates: many(memberUpdates),
  photos: many(memberPhotos),
}));

export const memberUpdatesRelations = relations(memberUpdates, ({ one }) => ({
  member: one(members, { fields: [memberUpdates.memberId], references: [members.id] }),
  author: one(user, { fields: [memberUpdates.authorId], references: [user.id] }),
}));

export const memberPhotosRelations = relations(memberPhotos, ({ one }) => ({
  member: one(members, { fields: [memberPhotos.memberId], references: [members.id] }),
  uploader: one(user, { fields: [memberPhotos.uploadedBy], references: [user.id] }),
}));

export type Church = typeof churches.$inferSelect;
export type Member = typeof members.$inferSelect;
export type NewMember = typeof members.$inferInsert;
export type MemberUpdate = typeof memberUpdates.$inferSelect;
export type MemberPhoto = typeof memberPhotos.$inferSelect;
export type AuditLog = typeof auditLogs.$inferSelect;
