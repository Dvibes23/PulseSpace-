"use client"

import { useEffect, useState } from "react"
import { supabase } from "@/lib/supabase"
import PostCard from "./post-card"
import { useAuth } from "@/contexts/auth-context"

type Post = {
  id: string
  content: string
  image_url: string | null
  created_at: string
  user_id: string
  profiles: {
    username: string
    avatar_url: string | null
  }
  likes_count: number
  comments_count: number
  user_has_liked: boolean
}

export default function Feed() {
  const [posts, setPosts] = useState<Post[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const { user } = useAuth()

  useEffect(() => {
    if (!user) return

    const fetchPosts = async () => {
      try {
        const { data, error } = await supabase
          .from("posts")
          .select(`
            *,
            profiles:user_id(username, avatar_url),
            likes_count:likes(count),
            comments_count:comments(count),
            user_has_liked:likes!inner(user_id)
          `)
          .order("created_at", { ascending: false })
          .limit(20)

        if (error) throw error

        // Transform the data to match our Post type
        const transformedPosts = data.map((post) => ({
          ...post,
          profiles: post.profiles as any,
          likes_count: post.likes_count[0]?.count || 0,
          comments_count: post.comments_count[0]?.count || 0,
          user_has_liked: post.user_has_liked.some((like: any) => like.user_id === user.id),
        }))

        setPosts(transformedPosts)
      } catch (error: any) {
        console.error("Error fetching posts:", error)
        setError(error.message || "Failed to load posts")
      } finally {
        setLoading(false)
      }
    }

    fetchPosts()

    // Subscribe to new posts
    const postsSubscription = supabase
      .channel("public:posts")
      .on(
        "postgres_changes",
        {
          event: "INSERT",
          schema: "public",
          table: "posts",
        },
        (payload) => {
          // Fetch the new post with all the related data
          const fetchNewPost = async () => {
            const { data, error } = await supabase
              .from("posts")
              .select(`
              *,
              profiles:user_id(username, avatar_url),
              likes_count:likes(count),
              comments_count:comments(count),
              user_has_liked:likes!inner(user_id)
            `)
              .eq("id", payload.new.id)
              .single()

            if (error) return

            const newPost = {
              ...data,
              profiles: data.profiles as any,
              likes_count: data.likes_count[0]?.count || 0,
              comments_count: data.comments_count[0]?.count || 0,
              user_has_liked: data.user_has_liked.some((like: any) => like.user_id === user.id),
            }

            setPosts((prevPosts) => [newPost, ...prevPosts])
          }

          fetchNewPost()
        },
      )
      .subscribe()

    return () => {
      postsSubscription.unsubscribe()
    }
  }, [user])

  const handlePostLike = async (postId: string) => {
    if (!user) return

    const postIndex = posts.findIndex((post) => post.id === postId)
    if (postIndex === -1) return

    const post = posts[postIndex]
    const newPosts = [...posts]

    if (post.user_has_liked) {
      // Unlike the post
      const { error } = await supabase.from("likes").delete().eq("post_id", postId).eq("user_id", user.id)

      if (error) {
        console.error("Error unliking post:", error)
        return
      }

      newPosts[postIndex] = {
        ...post,
        likes_count: post.likes_count - 1,
        user_has_liked: false,
      }
    } else {
      // Like the post
      const { error } = await supabase.from("likes").insert({
        post_id: postId,
        user_id: user.id,
      })

      if (error) {
        console.error("Error liking post:", error)
        return
      }

      newPosts[postIndex] = {
        ...post,
        likes_count: post.likes_count + 1,
        user_has_liked: true,
      }

      // Create notification if the post is not by the current user
      if (post.user_id !== user.id) {
        await supabase.from("notifications").insert({
          user_id: post.user_id,
          type: "like",
          related_id: postId,
          from_user_id: user.id,
          is_read: false,
        })
      }
    }

    setPosts(newPosts)
  }

  if (loading) {
    return (
      <div className="space-y-4 mt-6">
        {[...Array(3)].map((_, i) => (
          <div key={i} className="bg-white dark:bg-gray-800 rounded-lg shadow-md p-4 animate-pulse-slow">
            <div className="flex items-center space-x-4 mb-4">
              <div className="w-12 h-12 bg-gray-300 dark:bg-gray-600 rounded-full"></div>
              <div className="flex-1">
                <div className="h-4 bg-gray-300 dark:bg-gray-600 rounded w-1/4 mb-2"></div>
                <div className="h-3 bg-gray-200 dark:bg-gray-700 rounded w-1/6"></div>
              </div>
            </div>
            <div className="mb-4">
              <div className="h-4 bg-gray-300 dark:bg-gray-600 rounded w-full mb-2"></div>
              <div className="h-4 bg-gray-300 dark:bg-gray-600 rounded w-5/6 mb-2"></div>
              <div className="h-4 bg-gray-300 dark:bg-gray-600 rounded w-3/4"></div>
            </div>
            <div className="h-40 bg-gray-200 dark:bg-gray-700 rounded-md mb-4"></div>
            <div className="flex justify-between">
              <div className="h-8 bg-gray-300 dark:bg-gray-600 rounded w-1/4"></div>
              <div className="h-8 bg-gray-300 dark:bg-gray-600 rounded w-1/4"></div>
            </div>
          </div>
        ))}
      </div>
    )
  }

  if (error) {
    return (
      <div className="bg-red-100 dark:bg-red-900/30 text-red-700 dark:text-red-400 p-4 rounded-md mt-6">
        <p>{error}</p>
        <button onClick={() => window.location.reload()} className="mt-2 text-sm font-medium underline">
          Try again
        </button>
      </div>
    )
  }

  if (posts.length === 0) {
    return (
      <div className="bg-white dark:bg-gray-800 rounded-lg shadow-md p-8 text-center mt-6">
        <h3 className="text-xl font-semibold mb-2">No posts yet</h3>
        <p className="text-gray-600 dark:text-gray-400 mb-4">Be the first to share something with the community!</p>
      </div>
    )
  }

  return (
    <div className="space-y-6 mt-6 pb-6">
      {posts.map((post) => (
        <PostCard key={post.id} post={post} onLike={handlePostLike} />
      ))}
    </div>
  )
}

