import { redirect } from "next/navigation"
import Navigation from "@/components/navigation"
import ProfileHeader from "@/components/profile-header"
import ProfilePosts from "@/components/profile-posts"
import { createServerSupabaseClient } from "@/lib/supabase-server"

export default async function ProfilePage({ params }: { params: { id: string } }) {
  const supabase = createServerSupabaseClient()

  const {
    data: { session },
  } = await supabase.auth.getSession()

  if (!session) {
    redirect("/login")
  }

  // Fetch profile data
  const { data: profile } = await supabase.from("profiles").select("*").eq("id", params.id).single()

  if (!profile) {
    redirect("/404")
  }

  return (
    <main className="min-h-screen pt-20 pb-20 md:pb-0">
      <Navigation />
      <div className="container mx-auto px-4 max-w-4xl">
        <ProfileHeader profile={profile} isCurrentUser={session.user.id === params.id} />
        <ProfilePosts userId={params.id} />
      </div>
    </main>
  )
}

