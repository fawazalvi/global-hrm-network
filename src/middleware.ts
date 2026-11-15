import { NextResponse, type NextRequest } from "next/server"
import { SESSION_COOKIE_NAME } from "@/backend/session"

export function middleware(req: NextRequest) {
  const { nextUrl } = req
  const hasSessionCookie = Boolean(req.cookies.get(SESSION_COOKIE_NAME)?.value)

  if (nextUrl.pathname === "/admin/login") {
    return NextResponse.redirect(new URL("/login", nextUrl))
  }

  const isProtected =
    nextUrl.pathname.startsWith("/admin") ||
    nextUrl.pathname.startsWith("/dashboard") ||
    nextUrl.pathname.startsWith("/profile")

  if (isProtected && !hasSessionCookie) {
    return NextResponse.redirect(new URL("/login", nextUrl))
  }

  return NextResponse.next()
}

export const config = {
  matcher: ["/dashboard/:path*", "/profile/:path*", "/admin/:path*", "/login", "/signup"],
}
