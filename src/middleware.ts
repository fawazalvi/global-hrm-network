import { auth } from "@/backend/auth"
import { NextResponse } from "next/server"

export default auth((req) => {
  const { nextUrl } = req
  const isLoggedIn = !!req.auth
  const userRole = (req.auth?.user as any)?.role

  // Paths
  const isAdminPath = nextUrl.pathname.startsWith("/admin")
  const isProtectedPath = nextUrl.pathname.startsWith("/dashboard") || nextUrl.pathname.startsWith("/profile")
  const isAuthPath = nextUrl.pathname.startsWith("/login") || nextUrl.pathname.startsWith("/signup")

  if (isAuthPath) {
    if (isLoggedIn) {
      return NextResponse.redirect(new URL("/dashboard", nextUrl))
    }
    return NextResponse.next()
  }

  if (isProtectedPath) {
    if (!isLoggedIn) {
      return NextResponse.redirect(new URL("/login", nextUrl))
    }
    return NextResponse.next()
  }

  if (isAdminPath) {
    if (!isLoggedIn) {
      return NextResponse.redirect(new URL("/login", nextUrl))
    }
    if (userRole !== "admin") {
      // Not an admin, redirect to user dashboard
      return NextResponse.redirect(new URL("/dashboard", nextUrl))
    }
    return NextResponse.next()
  }

  return NextResponse.next()
})

export const config = {
  matcher: ["/dashboard/:path*", "/profile/:path*", "/admin/:path*", "/login", "/signup"],
}
