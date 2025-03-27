"use client"

import type React from "react"

import { useState, useEffect, useRef } from "react"
import { supabase } from "@/lib/supabase"
import { useAuth } from "@/contexts/auth-context"
import Image from "next/image"
import { formatDistanceToNow } from "date-fns"
import { Send, Info, ArrowLeft, MessageCircle, Users } from "lucide-react"
import { useRouter } from "next/navigation"
import ChatInfo from "./chat-info"

type Message = {
  id: string
  content: string
  created_at: string
  user_id: string
  profiles: {
    username: string
    avatar_url: string | null
  }
}

type ChatWindowProps = {
  chatId?: string
  userId?: string
}

export default function ChatWindow({ chatId, userId }: ChatWindowProps) {
  const [messages, setMessages] = useState<Message[]>([])
  const [newMessage, setNewMessage] = useState("")
  const [loading, setLoading] = useState(true)
  const [chatName, setChatName] = useState<string | null>(null)
  const [chatAvatar, setChatAvatar] = useState<string | null>(null)
  const [isGroup, setIsGroup] = useState(false)
  const [showInfo, setShowInfo] = useState(false)
  const [isMobileView, setIsMobileView] = useState(false)
  const messagesEndRef = useRef<HTMLDivElement>(null)
  const { user } = useAuth()
  const router = useRouter()

  useEffect(() => {
    const handleResize = () => {
      setIsMobileView(window.innerWidth < 768)
    }

    handleResize()
    window.addEventListener("resize", handleResize)
    return () => window.removeEventListener("resize", handleResize)
  }, [])

  useEffect(() => {
    if (!user || !chatId) return

    const fetchChatDetails = async () => {
      try {
        // Get chat details
        const { data: chat, error: chatError } = await supabase.from("chats").select("*").eq("id", chatId).single()

        if (chatError) throw chatError

        setIsGroup(chat.is_group)

        if (chat.is_group) {
          setChatName(chat.name)
          setChatAvatar(null)
        } else {
          // For direct chats, get the other user's info
          const { data: members, error: membersError } = await supabase
            .from("chat_members")
            .select("user_id")
            .eq("chat_id", chatId)
            .neq("user_id", user.id)
            .single()

          if (membersError) throw membersError

          const { data: profile, error: profileError } = await supabase
            .from("profiles")
            .select("username, avatar_url")
            .eq("id", members.user_id)
            .single()

          if (profileError) throw profileError

          setChatName(profile.username)
          setChatAvatar(profile.avatar_url)
        }
      } catch (error) {
        console.error("Error fetching chat details:", error)
      }
    }

    const fetchMessages = async () => {
      try {
        const { data, error } = await supabase
          .from("messages")
          .select(`
            *,
            profiles:user_id(username, avatar_url)
          `)
          .eq("chat_id", chatId)
          .order("created_at", { ascending: true })

        if (error) throw error

        setMessages(data as Message[])

        // Scroll to bottom
        setTimeout(() => {
          messagesEndRef.current?.scrollIntoView({ behavior: "smooth" })
        }, 100)
      } catch (error) {
        console.error("Error fetching messages:", error)
      } finally {
        setLoading(false)
      }
    }

    fetchChatDetails()
    fetchMessages()

    // Subscribe to new messages
    const messagesSubscription = supabase
      .channel(`messages:${chatId}`)
      .on(
        "postgres_changes",
        {
          event: "INSERT",
          schema: "public",
          table: "messages",
          filter: `chat_id=eq.${chatId}`,
        },
        async (payload) => {
          // Fetch the new message with profile data
          const { data, error } = await supabase
            .from("messages")
            .select(`
            *,
            profiles:user_id(username, avatar_url)
          `)
            .eq("id", payload.new.id)
            .single()

          if (error) return

          setMessages((prevMessages) => [...prevMessages, data as Message])

          // Scroll to bottom
          setTimeout(() => {
            messagesEndRef.current?.scrollIntoView({ behavior: "smooth" })
          }, 100)
        },
      )
      .subscribe()

    return () => {
      messagesSubscription.unsubscribe()
    }
  }, [chatId, user])

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()

    if (!user || !chatId || !newMessage.trim()) return

    try {
      const { error } = await supabase.from("messages").insert({
        chat_id: chatId,
        user_id: user.id,
        content: newMessage.trim(),
      })

      if (error) throw error

      setNewMessage("")
    } catch (error) {
      console.error("Error sending message:", error)
    }
  }

  const handleBackClick = () => {
    router.push("/messages")
  }

  if (!chatId) {
    return (
      <div className="hidden md:flex flex-1 items-center justify-center bg-gray-50 dark:bg-gray-800/50">
        <div className="text-center p-8">
          <div className="bg-gray-100 dark:bg-gray-700 p-6 rounded-full inline-block mb-4">
            <MessageCircle className="h-12 w-12 text-gray-500 dark:text-gray-400" />
          </div>
          <h3 className="text-xl font-medium mb-2">Select a conversation</h3>
          <p className="text-gray-500 dark:text-gray-400">Choose a conversation from the list or start a new one.</p>
        </div>
      </div>
    )
  }

  return (
    <div className="flex-1 flex flex-col">
      {/* Chat Header */}
      <div className="p-4 border-b border-gray-200 dark:border-gray-700 flex items-center justify-between">
        <div className="flex items-center">
          {isMobileView && (
            <button
              onClick={handleBackClick}
              className="mr-2 p-2 rounded-full hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors"
            >
              <ArrowLeft className="h-5 w-5" />
            </button>
          )}

          {isGroup ? (
            <div className="w-10 h-10 bg-primary/20 rounded-full flex items-center justify-center text-primary mr-3">
              <Users className="h-5 w-5" />
            </div>
          ) : chatAvatar ? (
            <Image
              src={chatAvatar || "/placeholder.svg"}
              alt={chatName || "User"}
              width={40}
              height={40}
              className="rounded-full object-cover mr-3"
            />
          ) : (
            <div className="w-10 h-10 bg-primary/20 rounded-full flex items-center justify-center text-primary font-semibold text-lg mr-3">
              {chatName ? chatName.charAt(0).toUpperCase() : "U"}
            </div>
          )}

          <h2 className="font-semibold">{chatName || "Chat"}</h2>
        </div>

        <button
          onClick={() => setShowInfo(true)}
          className="p-2 rounded-full hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors"
          aria-label="Chat info"
        >
          <Info className="h-5 w-5" />
        </button>
      </div>

      {/* Messages */}
      <div className="flex-1 p-4 overflow-y-auto">
        {loading ? (
          <div className="flex justify-center items-center h-full">
            <div className="w-8 h-8 border-4 border-primary border-t-transparent rounded-full animate-spin"></div>
          </div>
        ) : messages.length === 0 ? (
          <div className="flex flex-col items-center justify-center h-full text-center">
            <p className="text-gray-500 dark:text-gray-400 mb-2">No messages yet</p>
            <p className="text-gray-500 dark:text-gray-400">Send a message to start the conversation</p>
          </div>
        ) : (
          <div className="space-y-4">
            {messages.map((message, index) => {
              const isCurrentUser = message.user_id === user?.id
              const showAvatar = index === 0 || messages[index - 1].user_id !== message.user_id

              return (
                <div key={message.id} className={`flex ${isCurrentUser ? "justify-end" : "justify-start"}`}>
                  {!isCurrentUser && showAvatar && (
                    <div className="flex-shrink-0 mr-3">
                      {message.profiles.avatar_url ? (
                        <Image
                          src={message.profiles.avatar_url || "/placeholder.svg"}
                          alt={message.profiles.username}
                          width={36}
                          height={36}
                          className="rounded-full object-cover"
                        />
                      ) : (
                        <div className="w-9 h-9 bg-primary/20 rounded-full flex items-center justify-center text-primary font-semibold">
                          {message.profiles.username.charAt(0).toUpperCase()}
                        </div>
                      )}
                    </div>
                  )}

                  <div className={`max-w-[70%] ${!isCurrentUser && !showAvatar ? "ml-12" : ""}`}>
                    {!isCurrentUser && showAvatar && (
                      <div className="text-sm text-gray-500 dark:text-gray-400 mb-1">{message.profiles.username}</div>
                    )}

                    <div className="flex items-end">
                      <div
                        className={`px-4 py-2 rounded-lg ${
                          isCurrentUser
                            ? "bg-primary text-white rounded-br-none"
                            : "bg-gray-200 dark:bg-gray-700 rounded-bl-none"
                        }`}
                      >
                        <p className="break-words">{message.content}</p>
                      </div>

                      <span className="text-xs text-gray-500 dark:text-gray-400 ml-2">
                        {formatDistanceToNow(new Date(message.created_at), { addSuffix: true })}
                      </span>
                    </div>
                  </div>
                </div>
              )
            })}
            <div ref={messagesEndRef} />
          </div>
        )}
      </div>

      {/* Message Input */}
      <form onSubmit={handleSubmit} className="p-4 border-t border-gray-200 dark:border-gray-700">
        <div className="flex space-x-2">
          <input
            type="text"
            value={newMessage}
            onChange={(e) => setNewMessage(e.target.value)}
            placeholder="Type a message..."
            className="flex-1 px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-md focus:outline-none focus:ring-2 focus:ring-primary dark:bg-gray-700 dark:text-white"
          />
          <button
            type="submit"
            disabled={!newMessage.trim()}
            className="px-4 py-2 bg-primary text-white rounded-md hover:bg-primary/90 focus:outline-none focus:ring-2 focus:ring-primary focus:ring-offset-2 transition-colors disabled:opacity-70"
          >
            <Send className="h-5 w-5" />
          </button>
        </div>
      </form>

      {/* Chat Info Modal */}
      {showInfo && <ChatInfo chatId={chatId} isGroup={isGroup} onClose={() => setShowInfo(false)} />}
    </div>
  )
}

