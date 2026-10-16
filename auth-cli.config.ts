// 僅供 Better Auth CLI 產生資料表定義時使用（npm run auth:generate）
import { betterAuth } from "better-auth";
import { drizzleAdapter } from "better-auth/adapters/drizzle";
import { admin } from "better-auth/plugins";
import { passkey } from "@better-auth/passkey";

export const auth = betterAuth({
  database: drizzleAdapter({}, { provider: "pg" }),
  emailAndPassword: { enabled: true },
  user: {
    additionalFields: {
      churchId: { type: "string", required: true, input: false },
    },
  },
  plugins: [admin({ defaultRole: "viewer", adminRoles: ["admin"] }), passkey()],
});
