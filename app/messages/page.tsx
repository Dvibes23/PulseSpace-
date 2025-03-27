import { redirect } from "next/navigation"
import Navigation from "@/components/navigation"
import ChatList from "@/components/chat-list"
import ChatWindow from "@/components/chat-window"
import { createServerSupabaseClient } from "@/lib/supabase-server"

export default async function MessagesPage({
  searchParams,
}: {
  searchParams: { user?: string; chat?: string }
}) {
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
      <div className="container mx-auto px-4 max-w-6xl">
        <div className="bg-white dark:bg-gray-800 rounded-lg shadow-md mt-6 overflow-hidden">
          <div className="flex h-[calc(100vh-160px)]">
            <ChatList activeChat={searchParams.chat} initialUserId={searchParams.user} />
            <ChatWindow chatId={searchParams.chat} userId={searchParams.user} />
          </div>
        </div>
      </div>
    </main>
  )
}

