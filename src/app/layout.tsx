import type { Metadata, Viewport } from "next";
import { churchConfig } from "@/config/church";
import "./globals.css";

export const metadata: Metadata = {
  title: { default: churchConfig.appTitle, template: `%s｜${churchConfig.appTitle}` },
  description: `${churchConfig.name}會員通訊錄`,
  manifest: "/manifest.webmanifest",
  appleWebApp: { capable: true, title: churchConfig.appTitle, statusBarStyle: "default" },
  robots: { index: false, follow: false },
};

export const viewport: Viewport = {
  themeColor: churchConfig.accent,
  width: "device-width",
  initialScale: 1,
  viewportFit: "cover",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="zh-Hant" style={{ ["--accent" as string]: churchConfig.accent }} className="h-full">
      <body className="min-h-full">{children}</body>
    </html>
  );
}
