import { redirect } from "next/navigation"
import Navigation from "@/components/navigation"
import SearchUsers from "@/components/search-users"
import { createServerSupabaseClient } from "@/lib/supabase-server"

export default async function SearchPage() {
  const supabase = createServerSupabaseClient()

  const {
    data: { session },
  } = await supabase.auth.getSession()

  if (!session) {
    redirect("/login")
  }

  return (
    <main className="min-h-screen pt-20 pb-20 md:pb-0">
      <Navigation />
      <div className="container mx-auto px-4 max-w-4xl">
        <SearchUsers />
      </div>
    </main>
  )
}

