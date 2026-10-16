/**
 * 教會設定。所有與特定教會相關的名稱、顏色都放在這裡，
 * 不寫死在程式中，以便同一套程式部署給不同教會使用。
 *
 * 值來自環境變數，因此每間教會只需準備自己的 .env 即可。
 */
export const churchConfig = {
  /** 教會顯示名稱 */
  name: process.env.NEXT_PUBLIC_CHURCH_NAME ?? "教會通訊錄",
  /** 介面主色 */
  accent: process.env.NEXT_PUBLIC_CHURCH_ACCENT ?? "#2563eb",
  /** 系統名稱（顯示在標題列） */
  appTitle: `${process.env.NEXT_PUBLIC_CHURCH_NAME ?? "教會"}通訊錄`,
};
