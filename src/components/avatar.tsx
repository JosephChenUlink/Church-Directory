import { fileUrl } from "@/lib/format";

const sizes = { sm: "h-10 w-10 text-sm", md: "h-14 w-14 text-base", lg: "h-28 w-28 text-3xl" } as const;

export function MemberAvatar({ name, thumbKey, size = "sm" }: { name: string; thumbKey: string | null | undefined; size?: keyof typeof sizes }) {
  const url = fileUrl(thumbKey);
  const initials = name.trim().slice(0, 1) || "?";
  return url ? (
    <img src={url} alt={name} className={`${sizes[size]} shrink-0 rounded-full object-cover ring-1 ring-slate-200 dark:ring-slate-700`} loading="lazy" />
  ) : (
    <span
      aria-hidden
      className={`${sizes[size]} flex shrink-0 items-center justify-center rounded-full bg-accent/10 font-semibold text-accent ring-1 ring-accent/20`}
    >
      {initials}
    </span>
  );
}
