import { createRouteHandlerClient } from "@supabase/auth-helpers-nextjs"
import { cookies } from "next/headers"
import { type NextRequest, NextResponse } from "next/server"
import type { Database } from "@/lib/database.types"

export async function GET(request: NextRequest) {
  const requestUrl = new URL(request.url)
  const code = requestUrl.searchParams.get("code")

  if (code) {
    const cookieStore = cookies()
    // This is correct for server-side route handlers
    const supabase = createRouteHandlerClient<Database>({ cookies: () => cookieStore })

    try {
      // Exchange the code for a session
      const { error } = await supabase.auth.exchangeCodeForSession(code)

      if (error) {
        console.error("Error exchanging code for session:", error)
        return NextResponse.redirect(new URL("/login?error=auth_callback_error", request.url))
      }
    } catch (error) {
      console.error("Exception in auth callback:", error)
      return NextResponse.redirect(new URL("/login?error=auth_callback_exception", request.url))
    }
  }

  // URL to redirect to after sign in process completes
  // Use a direct URL to avoid any client-side routing issues
  return NextResponse.redirect(new URL("/", request.url))
}

