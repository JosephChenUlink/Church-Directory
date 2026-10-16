/** Server Action 統一回傳格式，供 useActionState 顯示錯誤 */
export type ActionResult<T = undefined> =
  | { ok: true; data?: T; message?: string }
  | { ok: false; error: string; fieldErrors?: Record<string, string[]> };

export const idle: ActionResult = { ok: true };

export function errorMessage(error: unknown, fallback = "發生未預期的錯誤，請稍後再試"): string {
  if (error instanceof Error && error.message) return error.message;
  return fallback;
}
