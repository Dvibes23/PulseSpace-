import { createRouteHandlerClient } from "@supabase/auth-helpers-nextjs"
import { cookies } from "next/headers"
import { type NextRequest, NextResponse } from "next/server"
import type { EmailOtpType } from "@supabase/supabase-js"
import type { Database } from "@/lib/database.types"

export async function GET(request: NextRequest) {
  const requestUrl = new URL(request.url)
  const token_hash = requestUrl.searchParams.get("token_hash")
  const type = requestUrl.searchParams.get("type") as EmailOtpType | null
  const next = requestUrl.searchParams.get("next") ?? "/"

  if (token_hash && type) {
    const cookieStore = cookies()
    // This is correct for server-side route handlers
    const supabase = createRouteHandlerClient<Database>({ cookies: () => cookieStore })

    try {
      const { error, data } = await supabase.auth.verifyOtp({
        type,
        token_hash,
      })

      if (error) {
        console.error("Error verifying OTP:", error)
        return NextResponse.redirect(new URL("/auth/auth-error", request.url))
      }

      // If verification was successful and we have a session, redirect to home
      if (data?.session) {
        return NextResponse.redirect(new URL("/", request.url))
      }

      // If verification was successful but no session (e.g., just email confirmation)
      // redirect to login with a success message
      return NextResponse.redirect(new URL("/login?message=Email verified successfully. Please log in.", request.url))
    } catch (error) {
      console.error("Exception in email verification:", error)
      return NextResponse.redirect(new URL("/auth/auth-error", request.url))
    }
  }

  // Return the user to an error page with instructions if token_hash or type is missing
  return NextResponse.redirect(new URL("/auth/auth-error", request.url))
}

