import type { MetadataRoute } from "next";
import { churchConfig } from "@/config/church";

export default function manifest(): MetadataRoute.Manifest {
  return {
    name: churchConfig.appTitle,
    short_name: churchConfig.name,
    description: `${churchConfig.name}會員通訊錄`,
    lang: "zh-Hant",
    start_url: "/",
    display: "standalone",
    background_color: "#ffffff",
    theme_color: churchConfig.accent,
    icons: [
      { src: "/icons/icon-192.png", sizes: "192x192", type: "image/png" },
      { src: "/icons/icon-512.png", sizes: "512x512", type: "image/png" },
      { src: "/icons/icon-512.png", sizes: "512x512", type: "image/png", purpose: "maskable" },
    ],
  };
}
