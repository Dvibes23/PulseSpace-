import { redirect } from "next/navigation"
import Navigation from "@/components/navigation"
import NotificationsList from "@/components/notifications-list"
import { createServerSupabaseClient } from "@/lib/supabase-server"

export default async function NotificationsPage() {
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
        <NotificationsList />
      </div>
    </main>
  )
}

