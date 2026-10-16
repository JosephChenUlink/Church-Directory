const dateFormatter = new Intl.DateTimeFormat("zh-TW", { year: "numeric", month: "2-digit", day: "2-digit", timeZone: "Asia/Taipei" });
const dateTimeFormatter = new Intl.DateTimeFormat("zh-TW", {
  year: "numeric",
  month: "2-digit",
  day: "2-digit",
  hour: "2-digit",
  minute: "2-digit",
  hour12: false,
  timeZone: "Asia/Taipei",
});

/** 'YYYY-MM-DD' 字串 → 'YYYY/MM/DD' */
export function formatDate(value: string | Date | null | undefined): string {
  if (!value) return "—";
  if (typeof value === "string") {
    const [y, m, d] = value.split("-");
    return y && m && d ? `${y}/${m}/${d}` : value;
  }
  return dateFormatter.format(value);
}

export function formatDateTime(value: Date | string | null | undefined): string {
  if (!value) return "—";
  return dateTimeFormatter.format(typeof value === "string" ? new Date(value) : value);
}

export function calcAge(birthDate: string | null | undefined, birthYear?: number | null): number | null {
  if (!birthDate) {
    if (!birthYear) return null;
    const age = new Date().getFullYear() - birthYear;
    return age >= 0 ? age : null;
  }
  const [y, m, d] = birthDate.split("-").map(Number);
  if (!y || !m || !d) return null;
  const today = new Date();
  let age = today.getFullYear() - y;
  if (today.getMonth() + 1 < m || (today.getMonth() + 1 === m && today.getDate() < d)) age -= 1;
  return age >= 0 ? age : null;
}

export function fileUrl(key: string | null | undefined): string | null {
  return key ? `/api/files/${key.split("/").map(encodeURIComponent).join("/")}` : null;
}
