import { createServerComponentClient } from "@supabase/auth-helpers-nextjs"
import { cookies } from "next/headers"
import type { Database } from "./database.types"

/**
 * This function should ONLY be used within Server Components or Route Handlers
 * Do not import this function in Client Components
 */
export function createServerSupabaseClient() {
  // Make cookies() non-callable to avoid the Server Component cache
  const cookieStore = cookies()
  return createServerComponentClient<Database>({
    cookies: () => cookieStore,
  })
}

