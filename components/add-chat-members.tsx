"use client"

import { useState, useEffect } from "react"
import { supabase } from "@/lib/supabase"
import { useAuth } from "@/contexts/auth-context"
import Image from "next/image"
import { X, Search, UserPlus } from "lucide-react"

type User = {
  id: string
  username: string
  avatar_url: string | null
  selected: boolean
}

type AddChatMembersProps = {
  chatId: string
  existingMembers: string[]
  onClose: () => void
  onMembersAdded: (newMembers: User[]) => void
}

export default function AddChatMembers({ chatId, existingMembers, onClose, onMembersAdded }: AddChatMembersProps) {
  const [users, setUsers] = useState<User[]>([])
  const [filteredUsers, setFilteredUsers] = useState<User[]>([])
  const [searchQuery, setSearchQuery] = useState("")
  const [loading, setLoading] = useState(true)
  const [adding, setAdding] = useState(false)
  const { user } = useAuth()

  useEffect(() => {
    if (!user) return

    const fetchUsers = async () => {
      try {
        const { data, error } = await supabase
          .from("profiles")
          .select("id, username, avatar_url")
          .not("id", "in", `(${[user.id, ...existingMembers].join(",")})`)
          .order("username")

        if (error) throw error

        const usersWithSelection = (data || []).map((u) => ({
          ...u,
          selected: false,
        }))

        setUsers(usersWithSelection)
        setFilteredUsers(usersWithSelection)
      } catch (error) {
        console.error("Error fetching users:", error)
      } finally {
        setLoading(false)
      }
    }

    fetchUsers()
  }, [user, existingMembers])

  useEffect(() => {
    if (searchQuery.trim() === "") {
      setFilteredUsers(users)
    } else {
      const query = searchQuery.toLowerCase()
      setFilteredUsers(users.filter((user) => user.username.toLowerCase().includes(query)))
    }
  }, [searchQuery, users])

  const toggleUserSelection = (userId: string) => {
    setUsers(users.map((u) => (u.id === userId ? { ...u, selected: !u.selected } : u)))
    setFilteredUsers(filteredUsers.map((u) => (u.id === userId ? { ...u, selected: !u.selected } : u)))
  }

  const getSelectedUsers = () => {
    return users.filter((u) => u.selected)
  }

  const handleAddMembers = async () => {
    if (!user) return

    const selectedUsers = getSelectedUsers()
    if (selectedUsers.length === 0) return

    setAdding(true)

    try {
      // Add selected members to the chat
      const members = selectedUsers.map((u) => ({
        chat_id: chatId,
        user_id: u.id,
      }))

      const { error } = await supabase.from("chat_members").insert(members)

      if (error) throw error

      onMembersAdded(selectedUsers)
    } catch (error) {
      console.error("Error adding members:", error)
      alert("Failed to add members")
    } finally {
      setAdding(false)
    }
  }

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 z-50 flex justify-center items-center p-4">
      <div className="bg-white dark:bg-gray-800 rounded-lg shadow-xl w-full max-w-md max-h-[90vh] overflow-hidden animate-fade-in">
        <div className="p-4 border-b border-gray-200 dark:border-gray-700 flex justify-between items-center">
          <h2 className="text-xl font-semibold">Add Members</h2>
          <button
            onClick={onClose}
            className="p-2 rounded-full hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        <div className="p-4">
          <div className="mb-4">
            <div className="relative">
              <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                <Search className="h-5 w-5 text-gray-400" />
              </div>
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full pl-10 pr-4 py-2 border border-gray-300 dark:border-gray-600 rounded-md focus:outline-none focus:ring-2 focus:ring-primary dark:bg-gray-700 dark:text-white"
                placeholder="Search users..."
              />
            </div>
          </div>

          {getSelectedUsers().length > 0 && (
            <div className="mb-4">
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                Selected ({getSelectedUsers().length})
              </label>
              <div className="flex flex-wrap gap-2">
                {getSelectedUsers().map((user) => (
                  <div key={user.id} className="flex items-center bg-primary/10 text-primary px-2 py-1 rounded-full">
                    <span className="text-sm">{user.username}</span>
                    <button
                      onClick={() => toggleUserSelection(user.id)}
                      className="ml-1 p-1 rounded-full hover:bg-primary/20 transition-colors"
                    >
                      <X className="h-3 w-3" />
                    </button>
                  </div>
                ))}
              </div>
            </div>
          )}

          <div className="max-h-60 overflow-y-auto border border-gray-200 dark:border-gray-700 rounded-md">
            {loading ? (
              <div className="flex justify-center items-center h-32">
                <div className="w-8 h-8 border-4 border-primary border-t-transparent rounded-full animate-spin"></div>
              </div>
            ) : filteredUsers.length === 0 ? (
              <div className="p-4 text-center text-gray-500 dark:text-gray-400">No users found</div>
            ) : (
              <div className="divide-y divide-gray-200 dark:divide-gray-700">
                {filteredUsers.map((user) => (
                  <div
                    key={user.id}
                    className={`flex items-center justify-between p-3 cursor-pointer hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors ${
                      user.selected ? "bg-primary/10" : ""
                    }`}
                    onClick={() => toggleUserSelection(user.id)}
                  >
                    <div className="flex items-center">
                      {user.avatar_url ? (
                        <Image
                          src={user.avatar_url || "/placeholder.svg"}
                          alt={user.username}
                          width={40}
                          height={40}
                          className="rounded-full object-cover mr-3"
                        />
                      ) : (
                        <div className="w-10 h-10 bg-primary/20 rounded-full flex items-center justify-center text-primary font-semibold text-lg mr-3">
                          {user.username.charAt(0).toUpperCase()}
                        </div>
                      )}
                      <span>{user.username}</span>
                    </div>

                    <div
                      className={`w-5 h-5 rounded-full border ${
                        user.selected ? "bg-primary border-primary" : "border-gray-300 dark:border-gray-600"
                      }`}
                    >
                      {user.selected && (
                        <svg className="w-5 h-5 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                        </svg>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>

        <div className="p-4 border-t border-gray-200 dark:border-gray-700">
          <button
            onClick={handleAddMembers}
            disabled={adding || getSelectedUsers().length === 0}
            className="w-full flex items-center justify-center px-4 py-2 bg-primary text-white rounded-md hover:bg-primary/90 transition-colors disabled:opacity-70"
          >
            {adding ? (
              <div className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin mr-2"></div>
            ) : (
              <UserPlus className="h-5 w-5 mr-2" />
            )}
            <span>{adding ? "Adding..." : "Add Members"}</span>
          </button>
        </div>
      </div>
    </div>
  )
}

