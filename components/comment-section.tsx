"use client"

import type React from "react"

import { useState, useEffect } from "react"
import { supabase } from "@/lib/supabase"
import { useAuth } from "@/contexts/auth-context"
import { formatDistanceToNow } from "date-fns"
import Link from "next/link"
import Image from "next/image"

type Comment = {
  id: string
  content: string
  created_at: string
  user_id: string
  profiles: {
    username: string
    avatar_url: string | null
  }
}

type CommentSectionProps = {
  postId: string
  postUserId: string
}

export default function CommentSection({ postId, postUserId }: CommentSectionProps) {
  const [comments, setComments] = useState<Comment[]>([])
  const [newComment, setNewComment] = useState("")
  const [loading, setLoading] = useState(true)
  const [submitting, setSubmitting] = useState(false)
  const { user } = useAuth()

  useEffect(() => {
    const fetchComments = async () => {
      try {
        const { data, error } = await supabase
          .from("comments")
          .select(`
            *,
            profiles:user_id(username, avatar_url)
          `)
          .eq("post_id", postId)
          .order("created_at", { ascending: true })

        if (error) throw error

        setComments(data as Comment[])
      } catch (error) {
        console.error("Error fetching comments:", error)
      } finally {
        setLoading(false)
      }
    }

    fetchComments()

    // Subscribe to new comments
    const commentsSubscription = supabase
      .channel(`comments:${postId}`)
      .on(
        "postgres_changes",
        {
          event: "INSERT",
          schema: "public",
          table: "comments",
          filter: `post_id=eq.${postId}`,
        },
        async (payload) => {
          // Fetch the new comment with profile data
          const { data, error } = await supabase
            .from("comments")
            .select(`
            *,
            profiles:user_id(username, avatar_url)
          `)
            .eq("id", payload.new.id)
            .single()

          if (error) return

          setComments((prevComments) => [...prevComments, data as Comment])
        },
      )
      .subscribe()

    return () => {
      commentsSubscription.unsubscribe()
    }
  }, [postId])

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()

    if (!user || !newComment.trim()) return

    setSubmitting(true)

    try {
      const { error } = await supabase.from("comments").insert({
        post_id: postId,
        user_id: user.id,
        content: newComment.trim(),
      })

      if (error) throw error

      // Create notification if the comment is not by the post author
      if (user.id !== postUserId) {
        await supabase.from("notifications").insert({
          user_id: postUserId,
          type: "comment",
          related_id: postId,
          from_user_id: user.id,
          is_read: false,
        })
      }

      setNewComment("")
    } catch (error) {
      console.error("Error submitting comment:", error)
    } finally {
      setSubmitting(false)
    }
  }

  return (
    <div className="border-t border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-800/50">
      {/* Comments List */}
      <div className="p-4 space-y-4 max-h-[400px] overflow-y-auto">
        {loading ? (
          <div className="flex justify-center">
            <div className="w-6 h-6 border-2 border-primary border-t-transparent rounded-full animate-spin"></div>
          </div>
        ) : comments.length === 0 ? (
          <p className="text-center text-gray-500 dark:text-gray-400 py-4">No comments yet. Be the first to comment!</p>
        ) : (
          comments.map((comment) => (
            <div key={comment.id} className="flex space-x-3">
              <Link href={`/profile/${comment.user_id}`} className="flex-shrink-0">
                {comment.profiles.avatar_url ? (
                  <Image
                    src={comment.profiles.avatar_url || "/placeholder.svg"}
                    alt={comment.profiles.username}
                    width={36}
                    height={36}
                    className="rounded-full object-cover"
                  />
                ) : (
                  <div className="w-9 h-9 bg-primary/20 rounded-full flex items-center justify-center text-primary font-semibold">
                    {comment.profiles.username.charAt(0).toUpperCase()}
                  </div>
                )}
              </Link>

              <div className="flex-1">
                <div className="bg-white dark:bg-gray-700 rounded-lg p-3">
                  <div className="flex items-center justify-between">
                    <Link
                      href={`/profile/${comment.user_id}`}
                      className="font-medium text-gray-900 dark:text-white hover:underline"
                    >
                      {comment.profiles.username}
                    </Link>
                    <span className="text-xs text-gray-500 dark:text-gray-400">
                      {formatDistanceToNow(new Date(comment.created_at), { addSuffix: true })}
                    </span>
                  </div>
                  <p className="mt-1 text-gray-800 dark:text-gray-200 break-words">{comment.content}</p>
                </div>
              </div>
            </div>
          ))
        )}
      </div>

      {/* Comment Form */}
      {user && (
        <form onSubmit={handleSubmit} className="p-4 border-t border-gray-200 dark:border-gray-700">
          <div className="flex space-x-3">
            <div className="flex-1">
              <textarea
                value={newComment}
                onChange={(e) => setNewComment(e.target.value)}
                placeholder="Write a comment..."
                className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md focus:outline-none focus:ring-2 focus:ring-primary dark:bg-gray-700 dark:text-white resize-none"
                rows={1}
                required
              />
            </div>
            <button
              type="submit"
              disabled={submitting || !newComment.trim()}
              className="px-4 py-2 bg-primary text-white rounded-md hover:bg-primary/90 focus:outline-none focus:ring-2 focus:ring-primary focus:ring-offset-2 transition-colors disabled:opacity-70"
            >
              {submitting ? "Sending..." : "Send"}
            </button>
          </div>
        </form>
      )}
    </div>
  )
}

