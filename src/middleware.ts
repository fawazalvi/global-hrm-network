import { NextResponse, type NextRequest } from "next/server"
import { SESSION_COOKIE_NAME, verifySessionToken } from "@/backend/session"

export async function middleware(req: NextRequest) {
  const { nextUrl } = req
  const token = req.cookies.get(SESSION_COOKIE_NAME)?.value
  const user = await verifySessionToken(token)
  const isLoggedIn = !!user
  const userRole = user?.role

  if (nextUrl.pathname === "/admin/login") {
    return NextResponse.redirect(new URL("/login", nextUrl))
  }

  const isAdminPath = nextUrl.pathname.startsWith("/admin")
  const isProtectedPath =
    nextUrl.pathname.startsWith("/dashboard") || nextUrl.pathname.startsWith("/profile")

  if (isProtectedPath && !isLoggedIn) {
    return NextResponse.redirect(new URL("/login", nextUrl))
  }

  if (isAdminPath) {
    if (!isLoggedIn) {
      return NextResponse.redirect(new URL("/login", nextUrl))
    }
    if (userRole !== "admin") {
      return NextResponse.redirect(new URL("/dashboard", nextUrl))
    }
  }

  return NextResponse.next()
}

export const config = {
  matcher: ["/dashboard/:path*", "/profile/:path*", "/admin/:path*", "/login", "/signup"],
}
