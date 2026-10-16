import "server-only";
import { betterAuth } from "better-auth";
import { drizzleAdapter } from "better-auth/adapters/drizzle";
import { nextCookies } from "better-auth/next-js";
import { admin } from "better-auth/plugins";
import { passkey } from "@better-auth/passkey";
import { churchConfig } from "@/config/church";
import { db } from "@/db";
import * as schema from "@/db/schema";
import { ac, authRoles } from "./auth-roles";
import { env } from "./env";

export const auth = betterAuth({
  appName: churchConfig.appTitle,
  baseURL: env.appUrl,
  secret: env.authSecret,
  database: drizzleAdapter(db, { provider: "pg", schema }),
  emailAndPassword: {
    enabled: true,
    // 帳號一律由管理員建立，不開放自行註冊
    disableSignUp: true,
    minPasswordLength: 8,
  },
  user: {
    additionalFields: {
      churchId: { type: "string", required: true, input: false },
    },
  },
  session: {
    expiresIn: 60 * 60 * 24 * 30, // 30 天
    updateAge: 60 * 60 * 24,
    cookieCache: { enabled: true, maxAge: 5 * 60 },
  },
  plugins: [
    admin({ defaultRole: "viewer", adminRoles: ["admin"], ac, roles: authRoles }),
    passkey({
      rpID: new URL(env.appUrl).hostname,
      rpName: churchConfig.appTitle,
      origin: env.appUrl,
      authenticatorSelection: {
        // 要求建立可被瀏覽器／手機自動找到的 Passkey，支援 Face ID、指紋等
        residentKey: "required",
        userVerification: "preferred",
      },
    }),
    // 必須放在最後，讓 Server Action 內也能正確設定 cookie
    nextCookies(),
  ],
});

export type AuthSession = typeof auth.$Infer.Session;
