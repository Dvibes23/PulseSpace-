import { createMiddlewareClient } from "@supabase/auth-helpers-nextjs"
import { NextResponse } from "next/server"
import type { NextRequest } from "next/server"
import type { Database } from "@/lib/database.types"

export async function middleware(req: NextRequest) {
  const res = NextResponse.next()

  // Create a new middleware client for each request
  // This is correct and doesn't cause the multiple clients warning
  // because middleware runs on the edge, not in the browser
  const supabase = createMiddlewareClient<Database>({ req, res })

  // Refresh the session if it exists
  const {
    data: { session },
  } = await supabase.auth.getSession()

  // If accessing a protected route without a session, redirect to login
  const isProtectedRoute =
    !req.nextUrl.pathname.startsWith("/login") &&
    !req.nextUrl.pathname.startsWith("/signup") &&
    !req.nextUrl.pathname.startsWith("/auth/") &&
    !req.nextUrl.pathname.startsWith("/_next/") &&
    !req.nextUrl.pathname.includes(".")

  if (isProtectedRoute && !session) {
    const redirectUrl = req.nextUrl.clone()
    redirectUrl.pathname = "/login"
    return NextResponse.redirect(redirectUrl)
  }

  // If accessing login/signup with a session, redirect to home
  const isAuthRoute = req.nextUrl.pathname.startsWith("/login") || req.nextUrl.pathname.startsWith("/signup")

  if (isAuthRoute && session) {
    const redirectUrl = req.nextUrl.clone()
    redirectUrl.pathname = "/"
    return NextResponse.redirect(redirectUrl)
  }

  return res
}

export const config = {
  matcher: [
    /*
     * Match all request paths except:
     * - _next/static (static files)
     * - _next/image (image optimization files)
     * - favicon.ico (favicon file)
     * - public folder
     */
    "/((?!_next/static|_next/image|favicon.ico|public/).*)",
  ],
}

