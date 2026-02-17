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

  // Allow access to auth callback pages
  if (pathname === "/success" || pathname === "/error") {
    return NextResponse.next();
  }

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
      timeout: 10000, // Increased timeout to 10 seconds
    });

    if (response.status >= 200 && response.status < 300) {
      return NextResponse.next();
    }

    const loginUrl = new URL("/login", request.url);
    loginUrl.searchParams.set("redirect", pathname);

    return NextResponse.redirect(loginUrl);
  } catch (error) {
    console.error("Middleware auth check failed", error);

    // If it's a timeout error and user has access_token cookie, let them through
    // The client-side auth check will handle the validation
    if (axios.isAxiosError(error) && error.code === "ETIMEDOUT" && hasRequiredCookie) {
      console.log("API timeout but user has valid cookie, allowing access");
      return NextResponse.next();
    }

    const loginUrl = new URL("/login", request.url);
    loginUrl.searchParams.set("redirect", pathname);

    return NextResponse.redirect(loginUrl);
  }
}

export const config = {
  matcher: ["/((?!api|_next/static|_next/image|favicon.ico).*)"],
};
