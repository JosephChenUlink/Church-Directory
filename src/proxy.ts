import { getSessionCookie } from "better-auth/cookies";
import { NextResponse, type NextRequest } from "next/server";

/**
 * 樂觀式登入檢查：沒有登入 cookie 就直接導向登入頁，省去一次頁面渲染。
 * 真正的權限驗證仍在每個頁面與 Server Action 內進行。
 */
export function proxy(request: NextRequest) {
  const hasSession = Boolean(getSessionCookie(request));
  const { pathname } = request.nextUrl;

  if (pathname === "/login") {
    return hasSession ? NextResponse.redirect(new URL("/", request.url)) : NextResponse.next();
  }
  if (!hasSession) {
    const loginUrl = new URL("/login", request.url);
    if (pathname !== "/") loginUrl.searchParams.set("next", pathname);
    return NextResponse.redirect(loginUrl);
  }
  return NextResponse.next();
}

export const config = {
  matcher: [
    // 排除 API、Next.js 內部資源與靜態檔案
    "/((?!api|_next/static|_next/image|favicon.ico|icon.svg|icons|manifest.webmanifest|robots.txt).*)",
  ],
};
