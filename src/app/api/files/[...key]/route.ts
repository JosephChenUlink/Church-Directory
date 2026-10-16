import { NextResponse, type NextRequest } from "next/server";
import { can } from "@/lib/permissions";
import { getCurrentUser } from "@/lib/session";
import { getStorage } from "@/lib/storage";

/**
 * 受權限保護的照片下載。
 * 檔案路徑格式：{教會ID}/members/{會員ID}/{profile|id|activity}/{檔名}
 * - 必須登入，且只能讀取自己教會的檔案
 * - 證件照（id）只有具 members:read_sensitive 權限者可讀
 */
export async function GET(_request: NextRequest, context: { params: Promise<{ key: string[] }> }) {
  const user = await getCurrentUser();
  if (!user) return new NextResponse("Unauthorized", { status: 401 });

  const segments = (await context.params).key.map((s) => decodeURIComponent(s));
  if (segments.some((s) => s === ".." || s === "." || s.includes("/") || s === "")) {
    return new NextResponse("Bad Request", { status: 400 });
  }
  const [churchId, scope, , kind] = segments;
  if (churchId !== user.churchId || scope !== "members") {
    return new NextResponse("Forbidden", { status: 403 });
  }
  if (kind === "id" && !can(user.role, "members:read_sensitive")) {
    return new NextResponse("Forbidden", { status: 403 });
  }

  const object = await getStorage().get(segments.join("/"));
  if (!object) return new NextResponse("Not Found", { status: 404 });

  return new NextResponse(new Uint8Array(object.body), {
    headers: {
      "Content-Type": object.contentType,
      "Content-Length": String(object.body.byteLength),
      // 檔名含隨機 ID，內容不會變，可讓瀏覽器私下快取
      "Cache-Control": "private, max-age=86400, immutable",
      "X-Content-Type-Options": "nosniff",
    },
  });
}
