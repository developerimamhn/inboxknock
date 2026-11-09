import { NextResponse, type NextRequest } from "next/server";

const LANG_COOKIE = "ik_lang";
/** Pages that exist in both languages. Used to honour the remembered choice. */
const LOCALIZED = new Set(["/", "/terms", "/privacy"]);

/**
 * English is served at "/" and Bangla at "/bn".
 * Internally English pages live under /en, so we rewrite to it.
 * A visitor who picked Bangla before is sent to the Bangla page.
 */
export function proxy(req: NextRequest) {
  const { pathname, search } = req.nextUrl;

  if (pathname === "/en" || pathname.startsWith("/en/")) {
    const url = req.nextUrl.clone();
    url.pathname = pathname.slice(3) || "/";
    return NextResponse.redirect(url, 308);
  }

  if (pathname === "/bn" || pathname.startsWith("/bn/")) return NextResponse.next();

  if (req.cookies.get(LANG_COOKIE)?.value === "bn" && LOCALIZED.has(pathname)) {
    const url = req.nextUrl.clone();
    url.pathname = pathname === "/" ? "/bn" : `/bn${pathname}`;
    const res = NextResponse.redirect(url, 307);
    res.headers.set("Vary", "Cookie");
    return res;
  }

  const url = req.nextUrl.clone();
  url.pathname = `/en${pathname === "/" ? "" : pathname}`;
  url.search = search;
  return NextResponse.rewrite(url);
}

export const config = {
  matcher: ["/((?!api|_next|opengraph-image|icon|apple-icon|.*\\..*).*)"],
};
