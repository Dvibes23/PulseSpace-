"use client"

import { useState, useEffect } from "react"
import { supabase } from "@/lib/supabase"
import { useAuth } from "@/contexts/auth-context"
import Image from "next/image"
import { X, UserPlus, LogOut, Trash2 } from "lucide-react"
import { useRouter } from "next/navigation"
import AddChatMembers from "./add-chat-members"

type ChatMember = {
  id: string
  username: string
  avatar_url: string | null
  is_creator: boolean
}

type ChatInfoProps = {
  chatId: string
  isGroup: boolean
  onClose: () => void
}

export default function ChatInfo({ chatId, isGroup, onClose }: ChatInfoProps) {
  const [members, setMembers] = useState<ChatMember[]>([])
  const [chatName, setChatName] = useState("")
  const [loading, setLoading] = useState(true)
  const [showAddMembers, setShowAddMembers] = useState(false)
  const [creatorId, setCreatorId] = useState<string | null>(null)
  const { user } = useAuth()
  const router = useRouter()

  useEffect(() => {
    if (!user || !chatId) return

    const fetchChatInfo = async () => {
      try {
        // Get chat details
        const { data: chat, error: chatError } = await supabase.from("chats").select("*").eq("id", chatId).single()

        if (chatError) throw chatError

        setChatName(chat.name || "")
        setCreatorId(chat.created_by)

        // Get chat members
        const { data: chatMembers, error: membersError } = await supabase
          .from("chat_members")
          .select("user_id")
          .eq("chat_id", chatId)

        if (membersError) throw membersError

        if (!chatMembers || chatMembers.length === 0) {
          setMembers([])
          setLoading(false)
          return
        }

        const memberIds = chatMembers.map((member) => member.user_id)

        // Get member profiles
        const { data: profiles, error: profilesError } = await supabase
          .from("profiles")
          .select("id, username, avatar_url")
          .in("id", memberIds)

        if (profilesError) throw profilesError

        const membersWithCreatorFlag = profiles.map((profile) => ({
          ...profile,
          is_creator: profile.id === chat.created_by,
        }))

        setMembers(membersWithCreatorFlag)
      } catch (error) {
        console.error("Error fetching chat info:", error)
      } finally {
        setLoading(false)
      }
    }

    fetchChatInfo()
  }, [chatId, user])

  const handleLeaveChat = async () => {
    if (!user || !chatId) return

    try {
      const { error } = await supabase.from("chat_members").delete().eq("chat_id", chatId).eq("user_id", user.id)

      if (error) throw error

      router.push("/messages")
      onClose()
    } catch (error) {
      console.error("Error leaving chat:", error)
    }
  }

  const handleDeleteChat = async () => {
    if (!user || !chatId || user.id !== creatorId) return

    try {
      // Delete all messages
      const { error: messagesError } = await supabase.from("messages").delete().eq("chat_id", chatId)

      if (messagesError) throw messagesError

      // Delete all members
      const { error: membersError } = await supabase.from("chat_members").delete().eq("chat_id", chatId)

      if (membersError) throw membersError

      // Delete the chat
      const { error: chatError } = await supabase.from("chats").delete().eq("id", chatId)

      if (chatError) throw chatError

      router.push("/messages")
      onClose()
    } catch (error) {
      console.error("Error deleting chat:", error)
    }
  }

  const handleUpdateChatName = async () => {
    if (!user || !chatId || !isGroup || !chatName.trim()) return

    try {
      const { error } = await supabase.from("chats").update({ name: chatName.trim() }).eq("id", chatId)

      if (error) throw error

      // Refresh the page to show the updated name
      router.refresh()
    } catch (error) {
      console.error("Error updating chat name:", error)
    }
  }

  const handleRemoveMember = async (memberId: string) => {
    if (!user || !chatId || user.id !== creatorId || memberId === creatorId) return

    try {
      const { error } = await supabase.from("chat_members").delete().eq("chat_id", chatId).eq("user_id", memberId)

      if (error) throw error

      // Update the members list
      setMembers(members.filter((member) => member.id !== memberId))
    } catch (error) {
      console.error("Error removing member:", error)
    }
  }

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 z-50 flex justify-center items-center p-4">
      <div className="bg-white dark:bg-gray-800 rounded-lg shadow-xl w-full max-w-md max-h-[90vh] overflow-hidden animate-fade-in">
        <div className="p-4 border-b border-gray-200 dark:border-gray-700 flex justify-between items-center">
          <h2 className="text-xl font-semibold">Chat Information</h2>
          <button
            onClick={onClose}
            className="p-2 rounded-full hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        <div className="p-4 overflow-y-auto max-h-[calc(90vh-120px)]">
          {loading ? (
            <div className="flex justify-center py-8">
              <div className="w-8 h-8 border-4 border-primary border-t-transparent rounded-full animate-spin"></div>
            </div>
          ) : (
            <>
              {isGroup && (
                <div className="mb-6">
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Group Name</label>
                  <div className="flex space-x-2">
                    <input
                      type="text"
                      value={chatName}
                      onChange={(e) => setChatName(e.target.value)}
                      className="flex-1 px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md focus:outline-none focus:ring-2 focus:ring-primary dark:bg-gray-700 dark:text-white"
                      placeholder="Enter group name"
                      disabled={user?.id !== creatorId}
                    />
                    {user?.id === creatorId && (
                      <button
                        onClick={handleUpdateChatName}
                        disabled={!chatName.trim()}
                        className="px-4 py-2 bg-primary text-white rounded-md hover:bg-primary/90 transition-colors disabled:opacity-70"
                      >
                        Save
                      </button>
                    )}
                  </div>
                </div>
              )}

              <div className="mb-6">
                <div className="flex justify-between items-center mb-2">
                  <h3 className="text-lg font-medium">Members ({members.length})</h3>
                  {isGroup && user?.id === creatorId && (
                    <button
                      onClick={() => setShowAddMembers(true)}
                      className="flex items-center text-primary hover:underline"
                    >
                      <UserPlus className="h-4 w-4 mr-1" />
                      <span>Add</span>
                    </button>
                  )}
                </div>

                <div className="space-y-3">
                  {members.map((member) => (
                    <div key={member.id} className="flex items-center justify-between">
                      <div className="flex items-center">
                        {member.avatar_url ? (
                          <Image
                            src={member.avatar_url || "/placeholder.svg"}
                            alt={member.username}
                            width={40}
                            height={40}
                            className="rounded-full object-cover mr-3"
                          />
                        ) : (
                          <div className="w-10 h-10 bg-primary/20 rounded-full flex items-center justify-center text-primary font-semibold text-lg mr-3">
                            {member.username.charAt(0).toUpperCase()}
                          </div>
                        )}

                        <div>
                          <p className="font-medium">{member.username}</p>
                          {member.is_creator && <p className="text-xs text-gray-500 dark:text-gray-400">Creator</p>}
                        </div>
                      </div>

                      {isGroup && user?.id === creatorId && !member.is_creator && (
                        <button
                          onClick={() => handleRemoveMember(member.id)}
                          className="p-2 text-red-500 hover:bg-red-100 dark:hover:bg-red-900/20 rounded-full transition-colors"
                          aria-label={`Remove ${member.username}`}
                        >
                          <X className="h-4 w-4" />
                        </button>
                      )}
                    </div>
                  ))}
                </div>
              </div>

              <div className="space-y-3 pt-4 border-t border-gray-200 dark:border-gray-700">
                {user?.id !== creatorId && (
                  <button
                    onClick={handleLeaveChat}
                    className="flex items-center w-full p-3 text-red-500 hover:bg-red-100 dark:hover:bg-red-900/20 rounded-md transition-colors"
                  >
                    <LogOut className="h-5 w-5 mr-3" />
                    <span>Leave {isGroup ? "Group" : "Chat"}</span>
                  </button>
                )}

                {user?.id === creatorId && (
                  <button
                    onClick={handleDeleteChat}
                    className="flex items-center w-full p-3 text-red-500 hover:bg-red-100 dark:hover:bg-red-900/20 rounded-md transition-colors"
                  >
                    <Trash2 className="h-5 w-5 mr-3" />
                    <span>Delete {isGroup ? "Group" : "Chat"}</span>
                  </button>
                )}
              </div>
            </>
          )}
        </div>
      </div>

      {showAddMembers && (
        <AddChatMembers
          chatId={chatId}
          existingMembers={members.map((m) => m.id)}
          onClose={() => setShowAddMembers(false)}
          onMembersAdded={(newMembers) => {
            setMembers([...members, ...newMembers])
            setShowAddMembers(false)
          }}
        />
      )}
    </div>
  )
}

