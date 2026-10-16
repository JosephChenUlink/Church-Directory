ALTER TABLE "members" ADD COLUMN "birth_year" integer;--> statement-breakpoint
ALTER TABLE "members" ADD COLUMN "legacy_id" text;--> statement-breakpoint
CREATE UNIQUE INDEX "members_church_legacy_idx" ON "members" USING btree ("church_id","legacy_id");