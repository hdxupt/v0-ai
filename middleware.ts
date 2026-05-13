import { NextResponse, type NextRequest } from "next/server"
import { AUTH_COOKIE_NAME, deserializeUser } from "@/lib/auth"

const PUBLIC_PATHS = ["/login"]

export function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl
  const cookie = request.cookies.get(AUTH_COOKIE_NAME)?.value
  const user = deserializeUser(cookie)

  // Root redirect
  if (pathname === "/") {
    const url = request.nextUrl.clone()
    if (!user) {
      url.pathname = "/login"
    } else if (user.role === "teacher") {
      url.pathname = "/dashboard"
    } else {
      url.pathname = "/student"
    }
    return NextResponse.redirect(url)
  }

  // Allow public paths and assets
  if (PUBLIC_PATHS.some((p) => pathname.startsWith(p))) {
    // If already logged in, push to their home
    if (user && pathname === "/login") {
      const url = request.nextUrl.clone()
      url.pathname = user.role === "teacher" ? "/dashboard" : "/student"
      return NextResponse.redirect(url)
    }
    return NextResponse.next()
  }

  // Protected paths require login
  if (!user) {
    const url = request.nextUrl.clone()
    url.pathname = "/login"
    url.searchParams.set("redirect", pathname)
    return NextResponse.redirect(url)
  }

  // Student trying to access /dashboard → push to /student
  if (pathname.startsWith("/dashboard") && user.role === "student") {
    const url = request.nextUrl.clone()
    url.pathname = "/student"
    return NextResponse.redirect(url)
  }

  return NextResponse.next()
}

export const config = {
  matcher: [
    /*
     * Match all request paths except:
     * - _next/static, _next/image, favicon, public assets, api auth callbacks
     */
    "/((?!_next/static|_next/image|favicon.ico|images|api/health).*)",
  ],
}
