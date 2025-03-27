"use client"

import { useState, useEffect } from "react"
import { supabase } from "@/lib/supabase"
import Link from "next/link"
import Image from "next/image"
import { Search } from "lucide-react"

type User = {
  id: string
  username: string
  avatar_url: string | null
}

export default function SearchUsers() {
  const [query, setQuery] = useState("")
  const [users, setUsers] = useState<User[]>([])
  const [loading, setLoading] = useState(false)
  const [debouncedQuery, setDebouncedQuery] = useState("")

  // Debounce search query
  useEffect(() => {
    const timer = setTimeout(() => {
      setDebouncedQuery(query)
    }, 300)

    return () => clearTimeout(timer)
  }, [query])

  // Search users when debounced query changes
  useEffect(() => {
    const searchUsers = async () => {
      if (!debouncedQuery.trim()) {
        setUsers([])
        return
      }

      setLoading(true)

      try {
        const { data, error } = await supabase
          .from("profiles")
          .select("id, username, avatar_url")
          .ilike("username", `%${debouncedQuery}%`)
          .limit(20)

        if (error) throw error

        setUsers(data || [])
      } catch (error) {
        console.error("Error searching users:", error)
      } finally {
        setLoading(false)
      }
    }

    searchUsers()
  }, [debouncedQuery])

  return (
    <div className="bg-white dark:bg-gray-800 rounded-lg shadow-md p-6 mt-6 animate-fade-in">
      <h1 className="text-2xl font-bold mb-6">Search Users</h1>

      <div className="relative mb-6">
        <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
          <Search className="h-5 w-5 text-gray-400" />
        </div>
        <input
          type="text"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          placeholder="Search by username..."
          className="w-full pl-10 pr-4 py-2 border border-gray-300 dark:border-gray-600 rounded-md focus:outline-none focus:ring-2 focus:ring-primary dark:bg-gray-700 dark:text-white"
        />
      </div>

      {loading && (
        <div className="flex justify-center py-8">
          <div className="w-8 h-8 border-4 border-primary border-t-transparent rounded-full animate-spin"></div>
        </div>
      )}

      {!loading && debouncedQuery && users.length === 0 && (
        <div className="text-center py-8 text-gray-500 dark:text-gray-400">
          No users found matching &quot;{debouncedQuery}&quot;
        </div>
      )}

      {users.length > 0 && (
        <div className="space-y-4">
          {users.map((user) => (
            <Link
              key={user.id}
              href={`/profile/${user.id}`}
              className="flex items-center p-3 rounded-md hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors"
            >
              {user.avatar_url ? (
                <Image
                  src={user.avatar_url || "/placeholder.svg"}
                  alt={user.username}
                  width={48}
                  height={48}
                  className="rounded-full object-cover"
                />
              ) : (
                <div className="w-12 h-12 bg-primary/20 rounded-full flex items-center justify-center text-primary font-semibold text-lg">
                  {user.username.charAt(0).toUpperCase()}
                </div>
              )}

              <div className="ml-3">
                <h3 className="font-medium text-gray-900 dark:text-white">{user.username}</h3>
              </div>
            </Link>
          ))}
        </div>
      )}
    </div>
  )
}

