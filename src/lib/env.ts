
function required(name: string): string {
  const value = process.env[name];
  if (!value) {
    throw new Error(`缺少環境變數 ${name}，請參考 .env.example 設定`);
  }
  return value;
}

export const env = {
  get databaseUrl() {
    return required("DATABASE_URL");
  },
  get authSecret() {
    return required("BETTER_AUTH_SECRET");
  },
  get appUrl() {
    return (process.env.NEXT_PUBLIC_APP_URL ?? "http://localhost:3000").replace(/\/$/, "");
  },
  get churchSlug() {
    return process.env.CHURCH_SLUG ?? "default";
  },
  get storageDriver(): "local" | "supabase" {
    return process.env.STORAGE_DRIVER === "supabase" ? "supabase" : "local";
  },
  get supabaseUrl() {
    return required("SUPABASE_URL");
  },
  get supabaseServiceRoleKey() {
    return required("SUPABASE_SERVICE_ROLE_KEY");
  },
  get supabaseBucket() {
    return process.env.SUPABASE_STORAGE_BUCKET ?? "member-files";
  },
};
