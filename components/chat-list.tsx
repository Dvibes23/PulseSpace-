"use client"

import { useState, useEffect } from "react"
import { supabase } from "@/lib/supabase"
import { useAuth } from "@/contexts/auth-context"
import Link from "next/link"
import Image from "next/image"
import { formatDistanceToNow } from "date-fns"
import { Plus, Users, MessageCircle } from "lucide-react"
import { useRouter } from "next/navigation"
import CreateGroupChat from "./create-group-chat"

type Chat = {
  id: string
  name: string | null
  is_group: boolean
  last_message: string | null
  last_message_time: string | null
  avatar_url: string | null
  unread_count: number
}

type ChatListProps = {
  activeChat?: string
  initialUserId?: string
}

export default function ChatList({ activeChat, initialUserId }: ChatListProps) {
  const [chats, setChats] = useState<Chat[]>([])
  const [loading, setLoading] = useState(true)
  const [showCreateGroup, setShowCreateGroup] = useState(false)
  const { user } = useAuth()
  const router = useRouter()

  useEffect(() => {
    if (!user) return

    // If initialUserId is provided, create or get a chat with that user
    if (initialUserId && initialUserId !== user.id) {
      const createOrGetChat = async () => {
        try {
          // Check if a direct chat already exists between the two users
          const { data: existingChats, error: existingChatsError } = await supabase
            .from("chat_members")
            .select("chat_id")
            .eq("user_id", user.id)

          if (existingChatsError) throw existingChatsError

          if (existingChats && existingChats.length > 0) {
            const chatIds = existingChats.map((chat) => chat.chat_id)

            const { data: matchingChats, error: matchingChatsError } = await supabase
              .from("chat_members")
              .select("chat_id")
              .eq("user_id", initialUserId)
              .in("chat_id", chatIds)

            if (matchingChatsError) throw matchingChatsError

            if (matchingChats && matchingChats.length > 0) {
              // Get the first direct chat between the users
              const { data: chatData, error: chatError } = await supabase
                .from("chats")
                .select("*")
                .eq("id", matchingChats[0].chat_id)
                .eq("is_group", false)
                .single()

              if (!chatError && chatData) {
                router.push(`/messages?chat=${chatData.id}`)
                return
              }
            }
          }

          // Create a new direct chat
          const { data: newChat, error: newChatError } = await supabase
            .from("chats")
            .insert({
              name: null,
              is_group: false,
              created_by: user.id,
            })
            .select()
            .single()

          if (newChatError) throw newChatError

          // Add both users to the chat
          const { error: membersError } = await supabase.from("chat_members").insert([
            { chat_id: newChat.id, user_id: user.id },
            { chat_id: newChat.id, user_id: initialUserId },
          ])

          if (membersError) throw membersError

          router.push(`/messages?chat=${newChat.id}`)
        } catch (error) {
          console.error("Error creating or getting chat:", error)
        }
      }

      createOrGetChat()
    }

    const fetchChats = async () => {
      try {
        // Get all chats the user is a member of
        const { data: memberChats, error: memberError } = await supabase
          .from("chat_members")
          .select("chat_id")
          .eq("user_id", user.id)

        if (memberError) throw memberError

        if (!memberChats || memberChats.length === 0) {
          setChats([])
          setLoading(false)
          return
        }

        const chatIds = memberChats.map((chat) => chat.chat_id)

        // Get chat details
        const { data: chatsData, error: chatsError } = await supabase
          .from("chats")
          .select("*")
          .in("id", chatIds)
          .order("created_at", { ascending: false })

        if (chatsError) throw chatsError

        // Process each chat to get additional info
        const processedChats = await Promise.all(
          chatsData.map(async (chat) => {
            // Get the last message
            const { data: lastMessage, error: messageError } = await supabase
              .from("messages")
              .select("content, created_at")
              .eq("chat_id", chat.id)
              .order("created_at", { ascending: false })
              .limit(1)
              .single()

            if (messageError && messageError.code !== "PGRST116") {
              console.error("Error fetching last message:", messageError)
            }

            // Get unread count
            const { count: unreadCount, error: unreadError } = await supabase
              .from("messages")
              .select("*", { count: "exact", head: true })
              .eq("chat_id", chat.id)
              .neq("user_id", user.id)
              .gt("created_at", user.last_sign_in_at || "")

            if (unreadError) {
              console.error("Error fetching unread count:", unreadError)
            }

            let name = chat.name
            let avatarUrl = null

            if (!chat.is_group) {
              // For direct chats, get the other user's info
              const { data: members, error: membersError } = await supabase
                .from("chat_members")
                .select("user_id")
                .eq("chat_id", chat.id)
                .neq("user_id", user.id)
                .single()

              if (membersError) {
                console.error("Error fetching chat members:", membersError)
              } else if (members) {
                const { data: profile, error: profileError } = await supabase
                  .from("profiles")
                  .select("username, avatar_url")
                  .eq("id", members.user_id)
                  .single()

                if (profileError) {
                  console.error("Error fetching profile:", profileError)
                } else if (profile) {
                  name = profile.username
                  avatarUrl = profile.avatar_url
                }
              }
            }

            return {
              id: chat.id,
              name: name,
              is_group: chat.is_group,
              last_message: lastMessage?.content || null,
              last_message_time: lastMessage?.created_at || null,
              avatar_url: avatarUrl,
              unread_count: unreadCount || 0,
            }
          }),
        )

        setChats(processedChats)
      } catch (error) {
        console.error("Error fetching chats:", error)
      } finally {
        setLoading(false)
      }
    }

    fetchChats()

    // Subscribe to new messages
    const messagesSubscription = supabase
      .channel("messages")
      .on(
        "postgres_changes",
        {
          event: "INSERT",
          schema: "public",
          table: "messages",
        },
        () => {
          fetchChats()
        },
      )
      .subscribe()

    return () => {
      messagesSubscription.unsubscribe()
    }
  }, [user, initialUserId, router])

  if (!user) return null

  return (
    <div className="w-full md:w-1/3 border-r border-gray-200 dark:border-gray-700 flex flex-col">
      <div className="p-4 border-b border-gray-200 dark:border-gray-700 flex justify-between items-center">
        <h2 className="text-lg font-semibold">Messages</h2>
        <button
          onClick={() => setShowCreateGroup(true)}
          className="p-2 rounded-full hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors"
          aria-label="Create group chat"
        >
          <Users className="h-5 w-5" />
        </button>
      </div>

      {loading ? (
        <div className="flex-1 p-4 flex justify-center items-center">
          <div className="w-8 h-8 border-4 border-primary border-t-transparent rounded-full animate-spin"></div>
        </div>
      ) : chats.length === 0 ? (
        <div className="flex-1 p-4 flex flex-col items-center justify-center text-center">
          <div className="bg-gray-100 dark:bg-gray-700 p-4 rounded-full mb-4">
            <MessageCircle className="h-8 w-8 text-gray-500 dark:text-gray-400" />
          </div>
          <h3 className="text-lg font-medium mb-2">No messages yet</h3>
          <p className="text-gray-500 dark:text-gray-400 mb-4">
            Start a conversation with someone or create a group chat.
          </p>
          <button
            onClick={() => router.push("/search")}
            className="px-4 py-2 bg-primary text-white rounded-md hover:bg-primary/90 transition-colors"
          >
            Find People
          </button>
        </div>
      ) : (
        <div className="flex-1 overflow-y-auto">
          {chats.map((chat) => (
            <Link
              key={chat.id}
              href={`/messages?chat=${chat.id}`}
              className={`flex items-center p-4 hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors ${
                activeChat === chat.id ? "bg-gray-100 dark:bg-gray-700" : ""
              }`}
            >
              <div className="relative">
                {chat.is_group ? (
                  <div className="w-12 h-12 bg-primary/20 rounded-full flex items-center justify-center text-primary">
                    <Users className="h-6 w-6" />
                  </div>
                ) : chat.avatar_url ? (
                  <Image
                    src={chat.avatar_url || "/placeholder.svg"}
                    alt={chat.name || "User"}
                    width={48}
                    height={48}
                    className="rounded-full object-cover"
                  />
                ) : (
                  <div className="w-12 h-12 bg-primary/20 rounded-full flex items-center justify-center text-primary font-semibold text-lg">
                    {chat.name ? chat.name.charAt(0).toUpperCase() : "U"}
                  </div>
                )}

                {chat.unread_count > 0 && (
                  <span className="absolute -top-1 -right-1 bg-red-500 text-white text-xs rounded-full h-5 w-5 flex items-center justify-center">
                    {chat.unread_count > 9 ? "9+" : chat.unread_count}
                  </span>
                )}
              </div>

              <div className="ml-3 flex-1 min-w-0">
                <div className="flex justify-between items-center">
                  <h3 className="font-medium text-gray-900 dark:text-white truncate">{chat.name || "Unknown User"}</h3>
                  {chat.last_message_time && (
                    <span className="text-xs text-gray-500 dark:text-gray-400">
                      {formatDistanceToNow(new Date(chat.last_message_time), { addSuffix: true })}
                    </span>
                  )}
                </div>
                <p className="text-sm text-gray-500 dark:text-gray-400 truncate">
                  {chat.last_message || "No messages yet"}
                </p>
              </div>
            </Link>
          ))}
        </div>
      )}

      <div className="p-4 border-t border-gray-200 dark:border-gray-700">
        <button
          onClick={() => router.push("/search")}
          className="flex items-center justify-center w-full px-4 py-2 bg-primary text-white rounded-md hover:bg-primary/90 transition-colors"
        >
          <Plus className="h-5 w-5 mr-2" />
          <span>New Message</span>
        </button>
      </div>

      {showCreateGroup && <CreateGroupChat onClose={() => setShowCreateGroup(false)} />}
    </div>
  )
}

