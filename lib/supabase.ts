import { createClient } from "@supabase/supabase-js"
import type { Database } from "./database.types"

// These environment variables are required
const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!

// Create a single instance of the Supabase client to be used throughout the app
export const supabase = createClient<Database>(supabaseUrl, supabaseAnonKey)

// Export the Database type for type safety
export type { Database }

