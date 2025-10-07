import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";
import axios from "axios";

const AUTH_CHECK_ENDPOINT =
  process.env.NEXT_PUBLIC_AUTH_CHECK_ENDPOINT ||
  "https://api.velbots.shop/users/profile";

const PROTECTED_PATHS = ["/", "/dashboard", "/app", "/metrics"];
const AUTH_COOKIE_NAMES = (
  process.env.NEXT_PUBLIC_AUTH_COOKIE_NAMES || "access_token"
)
  .split(",")
  .map((name) => name.trim())
  .filter(Boolean);

function isProtectedPath(pathname: string): boolean {
  return PROTECTED_PATHS.some(
    (protectedPath) =>
      pathname === protectedPath || pathname.startsWith(`${protectedPath}/`)
  );
}

export async function middleware(request: NextRequest) {
  if (process.env.NODE_ENV === "development") {
    return NextResponse.next();
  }

  const { pathname } = request.nextUrl;

  if (!isProtectedPath(pathname)) {
    return NextResponse.next();
  }

  const hasRequiredCookie =
    AUTH_COOKIE_NAMES.length === 0 ||
    AUTH_COOKIE_NAMES.some((cookieName) => request.cookies.has(cookieName));

  if (!hasRequiredCookie) {
    const loginUrl = new URL("/login", request.url);
    loginUrl.searchParams.set("redirect", pathname);
    return NextResponse.redirect(loginUrl);
  }

  try {
    const response = await axios.get(AUTH_CHECK_ENDPOINT, {
      headers: {
        Cookie: request.headers.get("cookie") || "",
        "User-Agent": request.headers.get("user-agent") || "Next.js middleware",
      },
      withCredentials: true,
      timeout: 5000,
    });

    if (response.status >= 200 && response.status < 300) {
      return NextResponse.next();
    }

    const loginUrl = new URL("/login", request.url);
    loginUrl.searchParams.set("redirect", pathname);

    return NextResponse.redirect(loginUrl);
  } catch (error) {
    console.error("Middleware auth check failed", error);

    const loginUrl = new URL("/login", request.url);
    loginUrl.searchParams.set("redirect", pathname);

    return NextResponse.redirect(loginUrl);
  }
}

export const config = {
  matcher: ["/((?!api|_next/static|_next/image|favicon.ico).*)"],
};
