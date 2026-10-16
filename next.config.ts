import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // 這是一個全程需要登入的系統，所有頁面都依使用者而異，
  // 因此不啟用 Cache Components，改用傳統的動態渲染模式。
  cacheComponents: false,
  turbopack: {
    rules: {
      "*.css": {
        loaders: ["@tailwindcss/turbopack"],
        as: "*.css",
      },
    },
  },
  serverExternalPackages: ["sharp", "pg"],
};

export default nextConfig;
