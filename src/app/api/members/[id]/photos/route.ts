import { NextResponse, type NextRequest } from "next/server";
import { uploadActivityPhoto, uploadMemberPortrait, validateUpload } from "@/lib/data/photos";
import { can } from "@/lib/permissions";
import { getCurrentUser } from "@/lib/session";

/** 上傳照片。kind = profile（大頭照）| id（證件照）| activity（活動照，可多張） */
export async function POST(request: NextRequest, context: { params: Promise<{ id: string }> }) {
  const user = await getCurrentUser();
  if (!user) return NextResponse.json({ error: "請先登入" }, { status: 401 });
  if (!can(user.role, "photos:write")) return NextResponse.json({ error: "您沒有上傳照片的權限" }, { status: 403 });

  const { id: memberId } = await context.params;
  const form = await request.formData();
  const kind = form.get("kind");
  const files = form.getAll("file").filter((f): f is File => f instanceof File);
  if (files.length === 0) return NextResponse.json({ error: "請選擇照片" }, { status: 400 });

  for (const file of files) {
    const problem = validateUpload(file);
    if (problem) return NextResponse.json({ error: problem }, { status: 400 });
  }

  try {
    if (kind === "profile" || kind === "id") {
      await uploadMemberPortrait(user, memberId, kind, files[0]);
      return NextResponse.json({ ok: true, count: 1 });
    }
    if (kind === "activity") {
      const caption = String(form.get("caption") ?? "");
      const takenOn = String(form.get("takenOn") ?? "");
      for (const file of files) {
        await uploadActivityPhoto(user, memberId, file, { caption, takenOn: /^\d{4}-\d{2}-\d{2}$/.test(takenOn) ? takenOn : null });
      }
      return NextResponse.json({ ok: true, count: files.length });
    }
    return NextResponse.json({ error: "照片類型不正確" }, { status: 400 });
  } catch (error) {
    const message = error instanceof Error ? error.message : "上傳失敗";
    return NextResponse.json({ error: message }, { status: 400 });
  }
}
